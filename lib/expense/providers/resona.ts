// lib/expense/providers/resona.ts

import pdf from "pdf-parse";
import type { ExpenseFetchResult } from "@/lib/expense/types";

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\u3000/g, " ")
    .replace(/％/g, "%")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .trim();
}

function compactText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\u3000/g, "")
    .replace(/[ \t]+/g, "")
    .replace(/\n+/g, "")
    .replace(/％/g, "%")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .trim();
}

function percentToRatio(raw: string): number | null {
  const value = Number.parseFloat(raw.replace(/,/g, "").trim());
  if (Number.isNaN(value)) return null;
  return Number((value / 100).toFixed(8));
}

function isReasonableExpenseRatio(rawPercent: string): boolean {
  const value = Number.parseFloat(rawPercent);
  if (Number.isNaN(value)) return false;

  // 信託報酬として現実的な範囲
  return value > 0 && value < 5;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<\/th>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#37;/gi, "%");
}

function resolveUrl(baseUrl: string, maybeRelativeUrl: string): string {
  try {
    return new URL(maybeRelativeUrl, baseUrl).toString();
  } catch {
    return maybeRelativeUrl;
  }
}

function extractResonaPdfUrlFromHtml(
  html: string,
  pageUrl: string,
): {
  pdfUrl: string;
  patternName: string;
  matchedText?: string;
} | null {
  const normalizedHtml = html
    .replace(/\r/g, "")
    .replace(/\u3000/g, " ")
    .replace(/\n+/g, " ");

  const patterns = [
    // 1) 最優先: 「手続・手数料等」リンクそのもの
    {
      patternName: "resona_fee_pdf_link_primary",
      pattern:
        /<a[^>]+href=["']([^"']*\/pdf\/[^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>[\s\S]{0,120}?手続(?:・|･)手数料等[\s\S]*?<\/a>/i,
    },

    // 2) 「ファンドの費用」「費用・税金」など費用系文脈の近傍PDF
    {
      patternName: "resona_fee_pdf_context_primary",
      pattern:
        /(手続(?:・|･)手数料等|ファンドの費用|費用・税金)[\s\S]{0,500}?href=["']([^"']*\/pdf\/[^"']+\.pdf(?:\?[^"']*)?)["']/i,
      hrefGroup: 2,
    },

    // 3) PDFファイル名が k123015.pdf みたいな「k + 数字」形式を優先
    {
      patternName: "resona_k_pdf_fallback",
      pattern:
        /href=["']([^"']*\/pdf\/k\d+\.pdf(?:\?[^"']*)?)["']/i,
    },
  ];

  for (const entry of patterns) {
    const match = normalizedHtml.match(entry.pattern);
    if (!match) continue;

    const href =
      "hrefGroup" in entry && entry.hrefGroup ? match[entry.hrefGroup] : match[1];

    if (!href) continue;

    return {
      pdfUrl: resolveUrl(pageUrl, href),
      patternName: entry.patternName,
      matchedText: match[0],
    };
  }

  return null;
}

function hasStrongExcludeContext(text: string): boolean {
  return /委託会社|販売会社|受託会社|内訳|配分/.test(text);
}

function extractResonaPdfExpenseRatio(text: string): {
  expenseRatio: number;
  patternName: string;
  matchedLabel?: string;
  matchedText?: string;
} | null {
  const normalized = normalizeText(text);
  const compact = compactText(text);

  const compactPatterns = [
    {
      patternName: "resona_net_assets_primary",
      matchedLabel: "ファンドの純資産総額に対して",
      pattern:
        /純資産総額に対して、?年率([\d.]+)%\(税抜([\d.]+)%\)/,
    },
    {
      patternName: "resona_net_assets_loose",
      matchedLabel: "ファンドの純資産総額に対して",
      pattern:
        /純資産総額に対して[\s\S]{0,40}?年率([\d.]+)%\(税抜([\d.]+)%\)/,
    },
    {
      patternName: "resona_trust_fee_primary",
      matchedLabel: "運用管理費用(信託報酬)",
      pattern:
        /運用管理費用\(信託報酬\)[\s\S]{0,120}?年率([\d.]+)%\(税抜([\d.]+)%\)/,
    },
    {
      patternName: "resona_trust_fee_loose",
      matchedLabel: "運用管理費用(信託報酬)",
      pattern:
        /運用管理費用\(信託報酬\)[\s\S]{0,120}?年率([\d.]+)%/,
    },
    {
      patternName: "resona_fund_fee_primary",
      matchedLabel: "ファンドの費用",
      pattern:
        /ファンドの費用[\s\S]{0,240}?純資産総額に対して[\s\S]{0,40}?年率([\d.]+)%\(税抜([\d.]+)%\)/,
    },
  ];

  for (const entry of compactPatterns) {
    const match = compact.match(entry.pattern);
    if (!match?.[1]) continue;

    const rawPercent = match[1];
    if (!isReasonableExpenseRatio(rawPercent)) continue;

    const ratio = percentToRatio(rawPercent);
    if (ratio == null) continue;

    return {
      expenseRatio: ratio,
      patternName: entry.patternName,
      matchedLabel: entry.matchedLabel,
      matchedText: normalized.slice(0, 1800),
    };
  }

  const blockPattern =
    /運用管理費用[\s\S]{0,20}?信託報酬[\s\S]{0,400}?/u;
  const blockMatch = normalized.match(blockPattern);

  if (blockMatch?.[0]) {
    const block = blockMatch[0];

    const preferredSentenceMatch = compactText(block).match(
      /純資産総額に対して[\s\S]{0,40}?年率([\d.]+)%/,
    );
    if (preferredSentenceMatch?.[1]) {
      const rawPercent = preferredSentenceMatch[1];
      if (isReasonableExpenseRatio(rawPercent)) {
        const ratio = percentToRatio(rawPercent);
        if (ratio != null) {
          return {
            expenseRatio: ratio,
            patternName: "resona_net_assets_block_fallback",
            matchedLabel: "ファンドの純資産総額に対して",
            matchedText: block,
          };
        }
      }
    }

    const lineCandidates = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !hasStrongExcludeContext(line));

    for (const line of lineCandidates) {
      if (!/純資産総額|運用管理費用|信託報酬/.test(line)) continue;

      const match = line.match(/年率\s*([\d.]+)\s*%/u);
      if (!match?.[1]) continue;

      const rawPercent = match[1];
      if (!isReasonableExpenseRatio(rawPercent)) continue;

      const ratio = percentToRatio(rawPercent);
      if (ratio == null) continue;

      return {
        expenseRatio: ratio,
        patternName: "resona_trust_fee_line_fallback",
        matchedLabel: "運用管理費用（信託報酬）",
        matchedText: line,
      };
    }
  }

  return null;
}

export async function fetchResonaExpenseRatioFromHtml(
  sourceUrl: string,
): Promise<ExpenseFetchResult> {
  const fetchedAt = new Date().toISOString();

  try {
    const htmlRes = await fetch(sourceUrl);

    if (!htmlRes.ok) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: `HTMLの取得に失敗しました: ${htmlRes.status} ${htmlRes.statusText}`,
      };
    }

    const html = await htmlRes.text();

    const pdfLink = extractResonaPdfUrlFromHtml(html, sourceUrl);
    if (!pdfLink?.pdfUrl) {
      const text = normalizeText(stripHtml(html));
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: "resona HTMLから手続・手数料等のPDFリンクを抽出できませんでした。",
      };
    }

    const pdfRes = await fetch(pdfLink.pdfUrl);
    if (!pdfRes.ok) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: `resona PDFの取得に失敗しました: ${pdfRes.status} ${pdfRes.statusText}`,
      };
    }

    const arrayBuffer = await pdfRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await pdf(buffer);

    const normalizedPdfText = normalizeText(parsed.text ?? "");

    if (!/運用管理費用|信託報酬|ファンドの費用/.test(normalizedPdfText)) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: `resona の費用PDFではない可能性があります: ${pdfLink.pdfUrl}`,
      };
    }

    console.log("===== RESONA PDF URL START =====");
    console.log(pdfLink.pdfUrl);
    console.log("===== RESONA PDF URL END =====");

    console.log("===== RESONA PDF TEXT START =====");
    console.log(normalizedPdfText);
    console.log("===== RESONA PDF TEXT END =====");

    const feeIdx = normalizedPdfText.indexOf("運用管理費用");
    if (feeIdx >= 0) {
      console.log("===== RESONA PDF FEE BLOCK START =====");
      console.log(normalizedPdfText.slice(Math.max(0, feeIdx - 200), feeIdx + 1200));
      console.log("===== RESONA PDF FEE BLOCK END =====");
    } else {
      console.log("===== RESONA PDF FEE BLOCK NOT FOUND =====");
    }

    const extracted = extractResonaPdfExpenseRatio(normalizedPdfText);

    if (!extracted || Number.isNaN(extracted.expenseRatio)) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: "resona PDFから管理費用を抽出できませんでした。",
      };
    }

    return {
      ok: true,
      expenseRatio: extracted.expenseRatio,
      sourceUrl,
      fetchedAt,
      note: "resona HTML経由でPDFから管理費用を抽出",
      match: {
        patternName: extracted.patternName,
        matchedLabel: extracted.matchedLabel ?? "手続・手数料等PDF",
        matchedText: extracted.matchedText ?? pdfLink.matchedText,
      },
    };
  } catch (error) {
    return {
      ok: false,
      sourceUrl,
      fetchedAt,
      error:
        error instanceof Error
          ? error.message
          : "不明なエラーが発生しました。",
    };
  }
}