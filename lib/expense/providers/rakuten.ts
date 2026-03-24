// lib/expense/providers/rakuten.ts

import pdf from "pdf-parse";
import { Buffer } from "node:buffer";
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

function clipAround(text: string, index: number, radius = 140): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).trim();
}

function extractPercentFromBlock(block: string): string | null {
  const patterns = [
    /年率?\s*([\d.]+)\s*%/,
    /年\s*([\d.]+)\s*%/,
    /([\d.]+)\s*%\s*程度/,
    /([\d.]+)\s*%\s*以内/,
    /([\d.]+)\s*%/,
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function findTextAfterLabel(
  text: string,
  labelPattern: RegExp,
  forward = 180,
): string | null {
  const match = labelPattern.exec(text);
  if (!match || match.index == null) return null;

  const start = match.index;
  const end = Math.min(text.length, start + forward);
  return text.slice(start, end).trim();
}

function normalizeLooseForSearch(text: string): string {
  return text
    .replace(/\s+/g, "")
    .replace(/[＊*]\d+/g, "");
}

function trimActualCostBlock(block: string): string {
  const stopPatterns = [
    /その他の費用・手数料/,
    /その他の費用/,
    /手続・手数料等/,
    /(?:^|\n)\s*税金\s*(?:\n|$)/,
    /税金は、下表に記載の時期に適用されます/,
    /普通分配金に対して20\.315%/,
  ];

  let end = block.length;

  for (const pattern of stopPatterns) {
    const match = pattern.exec(block);
    if (!match || match.index == null) continue;
    end = Math.min(end, match.index);
  }

  return block.slice(0, end).trim();
}

function extractPercentAfterActualCostLabel(block: string): string | null {
  const patterns = [
    /実質的に負担する[\s\S]{0,120}?運用管理費用[\s\S]{0,120}?年\s*([\d.]+)\s*%/,
    /実質的に負担する[\s\S]{0,120}?運用管理費用[\s\S]{0,120}?([\d.]+)\s*%\s*（税込）/,
    /実質的に負担する[\s\S]{0,120}?運用管理費用[\s\S]{0,120}?([\d.]+)\s*%\s*税込/,
    /実質的に負担する[\s\S]{0,120}?運用管理費用[\s\S]{0,120}?([\d.]+)\s*%\s*程度/,
    /実質的に負担する[\s\S]{0,120}?運用管理費用[\s\S]{0,120}?([\d.]+)\s*%\s*程\u5EA6/,
    /実質的に負担する[\s\S]{0,80}?運用管理費用[\s\S]{0,80}?([\d.]+)\s*%/,
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractReasonablePercentFromBlock(block: string): string | null {
  const matches = [...block.matchAll(/([\d.]+)\s*%/g)];
  for (const match of matches) {
    const raw = match[1];
    if (!raw) continue;
    const value = Number.parseFloat(raw);
    if (Number.isNaN(value)) continue;
    // 管理費用としてあり得る範囲だけ許可
    if (value >= 0 && value <= 5) {
      return raw;
    }
  }
  return null;
}

function findActualCostBlock(normalized: string): string | null {
  const fallbackPatterns = [
    /実質的に負担する[\s\S]{0,40}?運用管理[\s\S]{0,20}?費用(?:\s|[＊*]\d+)*/,
    /実質的に負担する[\s\S]{0,60}?費用(?:\s|[＊*]\d+)*/,
    /実\s*質\s*的\s*に\s*負\s*担\s*す\s*る[\s\S]{0,60}?運\s*用\s*管\s*理[\s\S]{0,20}?費\s*用/,
  ];

  for (const pattern of fallbackPatterns) {
    const match = pattern.exec(normalized);
    if (!match || match.index == null) continue;
    const start = match.index;
    const end = Math.min(normalized.length, start + 260);
    return trimActualCostBlock(normalized.slice(start, end));
  }

  return null;
}

function extractRakutenPdfExpenseRatio(text: string): {
  expenseRatio: number;
  patternName: string;
  matchedLabel?: string;
  matchedText?: string;
} | null {
  const normalized = normalizeText(text);

  // 0) 最優先: 実質コスト専用の広め探索
  const actualCostBlock = findActualCostBlock(normalized);
  if (actualCostBlock) {
    const rawPercent =
      extractPercentAfterActualCostLabel(actualCostBlock) ??
      extractReasonablePercentFromBlock(actualCostBlock) ??
      extractPercentFromBlock(actualCostBlock);

    if (rawPercent) {
      const ratio = percentToRatio(rawPercent);
      if (ratio != null) {
        return {
          expenseRatio: ratio,
          patternName: "rakuten_actual_cost_block",
          matchedLabel: "実質的に負担する運用管理費用",
          matchedText: actualCostBlock,
        };
      }
    }
  }

  // 1) 最優先: 実質的に負担する運用管理費用
  const actualCostLabels = [
    {
      patternName: "rakuten_actual_cost_primary",
      matchedLabel: "実質的に負担する運用管理費用",
      labelPattern: /実質的に負担する[\s\S]{0,20}?運用管理費用(?:\s|[\*＊]\s*\d+)?/,
    },
    {
      patternName: "rakuten_actual_cost_loose",
      matchedLabel: "実質的に負担する…運用管理費用",
      labelPattern: /実質的に負担する[\s\S]{0,40}?運用管理費用/,
    },
  ];

  for (const candidate of actualCostLabels) {
    const block = findTextAfterLabel(normalized, candidate.labelPattern, 420);
    if (!block) continue;

    const rawPercent =
      extractPercentAfterActualCostLabel(block) ??
      extractPercentFromBlock(block);

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

  // 2) 次点: 運用管理費用（信託報酬）
  // 「の分配」は除外
  const trustFeeLabels = [
    {
      patternName: "rakuten_trust_fee_label",
      matchedLabel: "運用管理費用（信託報酬）",
      labelPattern: /運用管理費用\s*[（(]信託報酬[)）](?!の分配)/,
    },
    {
      patternName: "rakuten_trust_fee_total_sentence",
      matchedLabel: "信託報酬の総額は",
      labelPattern: /信託報酬の総額は/,
    },
    {
      patternName: "rakuten_trust_fee_pure_assets_sentence",
      matchedLabel: "純資産総額に年◯%の率を乗じて得た額",
      labelPattern: /純資産総額に年\s*[\d.]+\s*%\s*の率を乗じて得た額/,
    },
  ];

  for (const candidate of trustFeeLabels) {
    const block = findTextAfterLabel(normalized, candidate.labelPattern, 200);
    if (!block) continue;

    if (/運用管理費用\s*[（(]信託報酬[)）]の分配/.test(block)) {
      continue;
    }

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

export async function fetchRakutenExpenseRatioFromPdf(
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
        error: `PDFの取得に失敗しました: ${res.status} ${res.statusText}`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await pdf(buffer);

    const extracted = extractRakutenPdfExpenseRatio(parsed.text);

    if (!extracted || Number.isNaN(extracted.expenseRatio)) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: "楽天PDFから管理費用を抽出できませんでした。",
      };
    }

    return {
      ok: true,
      expenseRatio: extracted.expenseRatio,
      sourceUrl,
      fetchedAt,
      note: "楽天PDFから管理費用を抽出",
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