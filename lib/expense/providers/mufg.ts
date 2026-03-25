// lib/expense/providers/mufg.ts

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

  // 税率・誤取得の代表例を除外
  if (Math.abs(value - 20.315) < 0.0001) return true;

  // 管理費用としては不自然に大きい値を除外
  if (value <= 0 || value > 5) return true;

  return false;
}

function findTextAfterLabel(
  text: string,
  labelPattern: RegExp,
  forward = 900,
): string | null {
  const match = labelPattern.exec(text);
  if (!match || match.index == null) return null;

  const start = match.index;
  const end = Math.min(text.length, start + forward);
  return text.slice(start, end).trim();
}

function trimAtStopPattern(block: string): string {
  const stopPatterns = [
    /実質信託報酬率の例/,
    /ご参考/,
    /下表/,
    /その他の費用/,
    /売買委託手数料/,
    /監査費用/,
    /税金/,
    /分配/,
    /配分/,
    /委託会社/,
    /販売会社/,
    /受託会社/,
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

function extractMufgPdfExpenseRatio(text: string): {
  expenseRatio: number;
  patternName: string;
  matchedLabel?: string;
  matchedText?: string;
} | null {
  const normalized = normalizeText(text);

  // 1) 最優先: 実質コスト系
  const actualCostCandidates = [
    {
      patternName: "mufg_actual_cost_primary",
      matchedLabel: "実質的な負担",
      labelPattern: /実質的な負担/,
      extractPatterns: [
        /年率\s*([\d.]+)\s*%\s*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）/,
        /年率\s*([\d.]+)\s*%\s*以内/,
        /年率\s*([\d.]+)\s*%/,
        /([\d.]+)\s*%\s*程度/,
        /([\d.]+)\s*%/,
      ],
    },
    {
      patternName: "mufg_actual_trust_fee_rate",
      matchedLabel: "実質的な信託報酬率",
      labelPattern: /実質的な信託報酬率|実質信託報酬率/,
      extractPatterns: [
        /年率\s*([\d.]+)\s*%\s*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）/,
        /年率\s*([\d.]+)\s*%\s*以内/,
        /年率\s*([\d.]+)\s*%/,
        /([\d.]+)\s*%\s*程度/,
        /([\d.]+)\s*%/,
      ],
    },
    {
      patternName: "mufg_actual_cost_beneficiary",
      matchedLabel: "受益者が負担する実質的な信託報酬率",
      labelPattern: /受益者が負担する実質的.{0,20}?信託報酬率/,
      extractPatterns: [
        /年率\s*([\d.]+)\s*%\s*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）/,
        /年率\s*([\d.]+)\s*%\s*以内/,
        /年率\s*([\d.]+)\s*%/,
        /([\d.]+)\s*%\s*程度/,
        /([\d.]+)\s*%/,
      ],
    },
  ] as const;

  for (const candidate of actualCostCandidates) {
    const rawBlock = findTextAfterLabel(normalized, candidate.labelPattern, 700);
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

  // 2) 次点: 運用管理費用（信託報酬）ブロックの本文優先
  const trustFeeCandidates = [
    {
      patternName: "mufg_trust_fee_sentence_tax_included",
      matchedLabel: "運用管理費用（信託報酬）",
      labelPattern: /運用管理費用\s*（\s*信託報酬\s*）|運用管理費用\s*\(\s*信託報酬\s*\)/,
      extractPatterns: [
        // これを最優先: 「年率0.05775%（税抜 年率0.0525%）以内」
        /年率\s*([\d.]+)\s*%\s*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）\s*以内/,
        /年率\s*([\d.]+)\s*%\s*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）/,
        // 「日々の純資産総額に対して、年率◯%以内」
        /純資産総額に対して[^\n]{0,80}?年率\s*([\d.]+)\s*%\s*以内/,
        /日々の純資産総額に対して[^\n]{0,80}?年率\s*([\d.]+)\s*%\s*以内/,
        /年率\s*([\d.]+)\s*%\s*以内/,
        /年率\s*([\d.]+)\s*%/,
      ],
    },
    {
      patternName: "mufg_trust_fee_label_fallback",
      matchedLabel: "信託報酬",
      labelPattern: /信託報酬/,
      extractPatterns: [
        /年率\s*([\d.]+)\s*%\s*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）\s*以内/,
        /年率\s*([\d.]+)\s*%\s*（\s*税抜\s*年率\s*[\d.]+\s*%\s*）/,
        /純資産総額に対して[^\n]{0,80}?年率\s*([\d.]+)\s*%\s*以内/,
        /日々の純資産総額に対して[^\n]{0,80}?年率\s*([\d.]+)\s*%\s*以内/,
        /年率\s*([\d.]+)\s*%\s*以内/,
        /年率\s*([\d.]+)\s*%/,
      ],
    },
  ] as const;

  for (const candidate of trustFeeCandidates) {
    const rawBlock = findTextAfterLabel(normalized, candidate.labelPattern, 900);
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

  // 3) 最後の補助: ラベル後方の限定ブロックから一般%を拾う
  const fallbackCandidates = [
    {
      patternName: "mufg_trust_fee_generic_fallback",
      matchedLabel: "運用管理費用（信託報酬）",
      labelPattern: /運用管理費用\s*（\s*信託報酬\s*）|運用管理費用\s*\(\s*信託報酬\s*\)/,
      extractPatterns: [
        /([\d.]+)\s*%/,
      ],
    },
  ] as const;

  for (const candidate of fallbackCandidates) {
    const rawBlock = findTextAfterLabel(normalized, candidate.labelPattern, 220);
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

    const file = url.searchParams.get("file");
    if (file) {
      return new URL(file, `${url.origin}/`).toString();
    }

    return sourceUrl;
  } catch {
    return sourceUrl;
  }
}

export async function fetchMufgExpenseRatioFromPdf(
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
        error: `MUFG PDFの取得に失敗しました: ${res.status} ${res.statusText}`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const data = await pdfParse(Buffer.from(arrayBuffer));
    const text = data.text ?? "";

    const extracted = extractMufgPdfExpenseRatio(text);

    if (!extracted || Number.isNaN(extracted.expenseRatio)) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: "MUFG PDFから管理費用を抽出できませんでした。",
      };
    }

    return {
      ok: true,
      expenseRatio: extracted.expenseRatio,
      sourceUrl,
      fetchedAt,
      note: "MUFG PDFから管理費用を抽出",
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