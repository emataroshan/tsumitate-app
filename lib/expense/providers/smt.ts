// lib/expense/providers/smt.ts

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

  // 税率などの誤取得を除外
  if (Math.abs(value - 20.315) < 0.0001) return true;

  // 管理費用として不自然に大きい値を除外
  if (value <= 0 || value > 5) return true;

  return false;
}

function findTextAfterLabel(
  text: string,
  labelPattern: RegExp,
  forward = 800,
): string | null {
  const match = labelPattern.exec(text);
  if (!match || match.index == null) return null;

  const start = match.index;
  const end = Math.min(text.length, start + forward);

  return text.slice(start, end).trim();
}

function trimAtStopPattern(block: string): string {
  const stopPatterns = [
    /支払先/,
    /委託会社/,
    /販売会社/,
    /受託会社/,
    /その他の費用/,
    /有価証券の売買/,
    /売買委託手数料/,
    /監査費用/,
    /税金/,
    /分配/,
    /配分/,
    /購入時手数料/,
    /換金時手数料/,
    /信託財産留保額/,
  ];

  let end = block.length;

  for (const pattern of stopPatterns) {
    const match = pattern.exec(block);
    if (!match || match.index == null) continue;
    end = Math.min(end, match.index);
  }

  return block.slice(0, end).trim();
}

function extractPercentByPatterns(
  block: string,
  patterns: RegExp[],
): string | null {
  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (!match?.[1]) continue;

    const value = Number.parseFloat(match[1]);
    if (Number.isNaN(value)) continue;
    if (isUnnaturalPercentValue(value)) continue;

    return match[1];
  }

  return null;
}

function extractSmtPdfExpenseRatio(text: string): {
  expenseRatio: number;
  patternName: string;
  matchedLabel?: string;
  matchedText?: string;
} | null {
  const normalized = normalizeText(text);

  const candidates = [
    {
      patternName: "smt_trust_fee_sentence_tax_included",
      matchedLabel: "運用管理費用（信託報酬）",
      labelPattern: /運用管理費用\s*（\s*信託報酬\s*）|運用管理費用\s*\(\s*信託報酬\s*\)/,
      extractPatterns: [
        // 例: 年率0.0968%（税抜0.088%）
        /年率\s*([\d.]+)\s*%\s*（\s*税抜\s*[\d.]+\s*%\s*）/,
        // 念のため「税抜 年率」表記ゆれにも対応
        /年率\s*([\d.]+)\s*%\s*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）/,
        // 純資産総額に対して年率◯%
        /純資産総額に対して[^\n]{0,100}?年率\s*([\d.]+)\s*%/,
        /年率\s*([\d.]+)\s*%/,
      ],
    },
    {
      patternName: "smt_trust_fee_label_fallback",
      matchedLabel: "信託報酬",
      labelPattern: /信託報酬/,
      extractPatterns: [
        /年率\s*([\d.]+)\s*%\s*（\s*税抜\s*[\d.]+\s*%\s*）/,
        /年率\s*([\d.]+)\s*%\s*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）/,
        /純資産総額に対して[^\n]{0,100}?年率\s*([\d.]+)\s*%/,
        /年率\s*([\d.]+)\s*%/,
      ],
    },
  ] as const;

  for (const candidate of candidates) {
    const rawBlock = findTextAfterLabel(normalized, candidate.labelPattern, 800);
    if (!rawBlock) continue;

    const block = trimAtStopPattern(rawBlock);
    const rawPercent = extractPercentByPatterns(block, [...candidate.extractPatterns]);
    if (!rawPercent) continue;

    const ratio = percentToRatio(rawPercent);
    if (ratio == null) continue;

    return {
      expenseRatio: ratio,
      patternName: candidate.patternName,
      matchedLabel: candidate.matchedLabel,
      matchedText: block,
    };
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

export async function fetchSmtExpenseRatioFromPdf(
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
        error: `SMT PDFの取得に失敗しました: ${res.status} ${res.statusText}`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const data = await pdfParse(Buffer.from(arrayBuffer));
    const text = data.text ?? "";

    const extracted = extractSmtPdfExpenseRatio(text);

    if (!extracted || Number.isNaN(extracted.expenseRatio)) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: "SMT PDFから管理費用を抽出できませんでした。",
      };
    }

    return {
      ok: true,
      expenseRatio: extracted.expenseRatio,
      sourceUrl,
      fetchedAt,
      note: "SMT PDFから管理費用を抽出",
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