// lib/expense/providers/daiwa.ts

import pdfParse from "pdf-parse";
import type { ExpenseFetchResult } from "@/lib/expense/types";

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\u3000/g, " ")
    .replace(/％/g, "%")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function percentToRatio(raw: string): number | null {
  const value = Number.parseFloat(raw.replace(/,/g, "").trim());
  if (Number.isNaN(value)) return null;
  return Number((value / 100).toFixed(8));
}

function isUnnaturalPercentValue(value: number): boolean {
  if (!Number.isFinite(value)) return true;

  // 税率の誤取得
  if (Math.abs(value - 20.315) < 0.0001) return true;

  // 管理費用として不自然
  if (value <= 0 || value > 5) return true;

  return false;
}

function buildSnippet(text: string, index: number, radius = 140): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).trim();
}

function extractDaiwaPdfExpenseRatio(text: string): {
  expenseRatio: number;
  patternName: string;
  matchedLabel?: string;
  matchedText?: string;
} | null {
  const normalized = normalizeText(text);

  // ===== ① ファンドの費用セクション起点で探す =====
  const feeSectionPattern = /ファンドの費用(?:・税金)?|〈ファンドの費用〉/;
  const feeSectionMatch = feeSectionPattern.exec(normalized);

  if (feeSectionMatch?.index != null) {
    const feeBlock = normalized.slice(
      feeSectionMatch.index,
      Math.min(normalized.length, feeSectionMatch.index + 3000),
    );

    const pairPatterns = [
      /年率\s*([\d.]+)\s*%\s*[\n\s]*（\s*税抜\s*[\d.]+\s*%\s*）/,
      /年率\s*([\d.]+)\s*%\s*[\n\s]*\(\s*税抜\s*[\d.]+\s*%\s*\)/,
      /年率\s*([\d.]+)\s*%\s*[\n\s]*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）/,
      /年率\s*([\d.]+)\s*%\s*[\n\s]*\(\s*税抜\s*年率\s*[\d.]+\s*%\s*\)/,
    ];

    for (const pattern of pairPatterns) {
      const match = pattern.exec(feeBlock);
      if (!match?.[1] || match.index == null) continue;

      const value = Number.parseFloat(match[1]);
      if (Number.isNaN(value)) continue;

      if (Math.abs(value - 20.315) < 0.0001) continue;
      if (value <= 0 || value > 5) continue;

      return {
        expenseRatio: Number((value / 100).toFixed(8)),
        patternName: "daiwa_fee_section_pair",
        matchedLabel: "ファンドの費用セクション",
        matchedText: feeBlock.slice(
          Math.max(0, match.index - 120),
          match.index + 120,
        ),
      };
    }
  }

  // 1) 最優先: 全文から「年率X%（税抜Y%）」を直接取る
  // Daiwaの主値はこの形で出る。内訳にはこのペアが出ない。
  const taxIncludedPairPatterns = [
    /年率\s*([\d.]+)\s*%\s*[\n\s]*（\s*税抜\s*[\d.]+\s*%\s*）/,
    /年率\s*([\d.]+)\s*%\s*[\n\s]*\(\s*税抜\s*[\d.]+\s*%\s*\)/,
    /年率\s*([\d.]+)\s*%\s*[\n\s]*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）/,
    /年率\s*([\d.]+)\s*%\s*[\n\s]*\(\s*税抜\s*年率\s*[\d.]+\s*%\s*\)/,
  ] as const;

  for (const pattern of taxIncludedPairPatterns) {
    const match = pattern.exec(normalized);
    if (!match?.[1] || match.index == null) continue;

    const value = Number.parseFloat(match[1]);
    if (Number.isNaN(value)) continue;
    if (isUnnaturalPercentValue(value)) continue;

    const ratio = percentToRatio(match[1]);
    if (ratio == null) continue;

    return {
      expenseRatio: ratio,
      patternName: "daiwa_global_tax_included_pair",
      matchedLabel: "年率（税抜併記）",
      matchedText: buildSnippet(normalized, match.index),
    };
  }

  // 2) 次点: 「運用管理費用 ... 信託報酬」の近傍から探す
  const labelPattern = /運用管理費用[\s\S]{0,80}?信託報酬|信託報酬/;
  const labelMatch = labelPattern.exec(normalized);

  if (labelMatch?.index != null) {
    const block = normalized.slice(
      labelMatch.index,
      Math.min(normalized.length, labelMatch.index + 1800),
    );

    const localPatterns = [
      /年率\s*([\d.]+)\s*%\s*[\n\s]*（\s*税抜\s*[\d.]+\s*%\s*）/,
      /年率\s*([\d.]+)\s*%\s*[\n\s]*\(\s*税抜\s*[\d.]+\s*%\s*\)/,
      /年率\s*([\d.]+)\s*%\s*[\n\s]*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）/,
      /年率\s*([\d.]+)\s*%\s*[\n\s]*\(\s*税抜\s*年率\s*[\d.]+\s*%\s*\)/,
      /年率\s*([\d.]+)\s*%/,
    ] as const;

    for (const pattern of localPatterns) {
      const match = pattern.exec(block);
      if (!match?.[1] || match.index == null) continue;

      const value = Number.parseFloat(match[1]);
      if (Number.isNaN(value)) continue;
      if (isUnnaturalPercentValue(value)) continue;

      const ratio = percentToRatio(match[1]);
      if (ratio == null) continue;

      return {
        expenseRatio: ratio,
        patternName: "daiwa_label_block_fallback",
        matchedLabel: "運用管理費用 / 信託報酬",
        matchedText: buildSnippet(block, match.index),
      };
    }
  }

  return null;
}

function resolvePdfUrl(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl);
    if (url.pathname.endsWith(".pdf")) {
      return sourceUrl;
    }
    return sourceUrl;
  } catch {
    return sourceUrl;
  }
}

export async function fetchDaiwaExpenseRatioFromPdf(
  sourceUrl: string,
): Promise<ExpenseFetchResult> {
  const fetchedAt = new Date().toISOString();

  try {
    const pdfUrl = resolvePdfUrl(sourceUrl);
    const res = await fetch(pdfUrl);

    if (!res.ok) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: `Daiwa PDFの取得に失敗しました: ${res.status} ${res.statusText}`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const data = await pdfParse(Buffer.from(arrayBuffer));
    const text = data.text ?? "";

    console.log("----- DAIWA DEBUG START -----");
    console.log("sourceUrl:", sourceUrl);
    console.log("text length:", text.length);
    console.log("has ファンドの費用:", text.includes("ファンドの費用"));
    console.log("has ファンドの費用・税金:", text.includes("ファンドの費用・税金"));
    console.log("has 運用管理費用:", text.includes("運用管理費用"));
    console.log("has 信託報酬:", text.includes("信託報酬"));
    console.log("has 年率0.7755:", text.includes("年率0.7755"));
    console.log("has 0.7755％:", text.includes("0.7755％"));
    console.log("has 0.7755%:", text.includes("0.7755%"));
    console.log("has 税抜0.705:", text.includes("税抜0.705"));
    console.log("has 0.705％:", text.includes("0.705％"));
    console.log("has 0.705%:", text.includes("0.705%"));
    console.log("first 3000 chars:");
    console.log(text.slice(0, 3000));
    console.log("----- DAIWA DEBUG END -----");

    const extracted = extractDaiwaPdfExpenseRatio(text);

    if (!extracted || Number.isNaN(extracted.expenseRatio)) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: "Daiwa PDFから管理費用を抽出できませんでした。",
      };
    }

    return {
      ok: true,
      expenseRatio: extracted.expenseRatio,
      sourceUrl,
      fetchedAt,
      note: "Daiwa PDFから管理費用を抽出",
      match: {
        patternName: extracted.patternName,
        matchedLabel: extracted.matchedLabel,
        matchedText: extracted.matchedText,
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