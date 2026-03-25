// lib/expense/providers/sbi.ts

import type { ExpenseFetchResult } from "@/lib/expense/types";

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/％/g, "%")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function percentToRatio(raw: string): number | null {
  const value = Number.parseFloat(raw.replace(/,/g, "").trim());
  if (Number.isNaN(value)) return null;
  return Number((value / 100).toFixed(8));
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#37;/gi, "%");
}

function findTextAfterLabel(
  text: string,
  labelPattern: RegExp,
  forward = 260,
): string | null {
  const match = labelPattern.exec(text);
  if (!match || match.index == null) return null;

  const start = match.index;
  const end = Math.min(text.length, start + forward);
  return text.slice(start, end).trim();
}

function extractPercentFromBlock(block: string): string | null {
  const patterns = [
    /年\s*([\d.]+)\s*%/,
    /([\d.]+)\s*%\s*（税込）/,
    /([\d.]+)\s*%\s*税込/,
    /([\d.]+)\s*%\s*程度/,
    /([\d.]+)\s*%/,
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractSbiHtmlExpenseRatio(text: string): {
  expenseRatio: number;
  patternName: string;
  matchedLabel?: string;
  matchedText?: string;
} | null {
  const normalized = normalizeText(text);

  // 1) 最優先: 実質的な負担
  const actualCostPatterns = [
    {
      patternName: "sbi_actual_cost_primary",
      matchedLabel: "実質的な負担",
      labelPattern: /実質的な負担/,
    },
    {
      patternName: "sbi_actual_cost_loose",
      matchedLabel: "実質的に負担",
      labelPattern: /実質的[\s\S]{0,20}?負担/,
    },
  ];

  for (const candidate of actualCostPatterns) {
    const block = findTextAfterLabel(normalized, candidate.labelPattern, 220);
    if (!block) continue;

    const rawPercent = extractPercentFromBlock(block);
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

  // 2) 次点: 信託報酬
  const trustFeePatterns = [
    {
      patternName: "sbi_trust_fee_primary",
      matchedLabel: "信託報酬",
      labelPattern: /信託報酬/,
    },
    {
      patternName: "sbi_management_fee_primary",
      matchedLabel: "運用管理費用（信託報酬）",
      labelPattern: /運用管理費用[\s\S]{0,10}?信託報酬/,
    },
  ];

  for (const candidate of trustFeePatterns) {
    const block = findTextAfterLabel(normalized, candidate.labelPattern, 220);
    if (!block) continue;

    const rawPercent = extractPercentFromBlock(block);
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

export async function fetchSbiExpenseRatioFromHtml(
  sourceUrl: string,
): Promise<ExpenseFetchResult> {
  const fetchedAt = new Date().toISOString();

  try {
    const res = await fetch(sourceUrl);

    if (!res.ok) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: `HTMLの取得に失敗しました: ${res.status} ${res.statusText}`,
      };
    }

    const html = await res.text();
    const text = stripHtml(html);
    const extracted = extractSbiHtmlExpenseRatio(text);

    if (!extracted || Number.isNaN(extracted.expenseRatio)) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: "SBI HTMLから管理費用を抽出できませんでした。",
      };
    }

    return {
      ok: true,
      expenseRatio: extracted.expenseRatio,
      sourceUrl,
      fetchedAt,
      note: "SBI HTMLから管理費用を抽出",
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