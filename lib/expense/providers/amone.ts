// lib/expense/providers/amone.ts

import pdf from "pdf-parse";
import type { ExpenseFetchResult } from "@/lib/expense/types";

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\u3000/g, " ")
    .replace(/％/g, "%")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/①/g, " ①")
    .replace(/②/g, " ②")
    .replace(/③/g, " ③")
    .trim();
}

function compactText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\u3000/g, "")
    .replace(/[ \t]+/g, "")
    .replace(/\n+/g, "")
    .replace(/％/g, "%")
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

  // 信託報酬として現実的な範囲に限定
  return value > 0 && value < 5;
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

function cutAtSecondStepOrLoanFee(block: string): string {
  const cutPatterns = [/\s②/, /②投資対象/, /品貸料/];

  let end = block.length;

  for (const pattern of cutPatterns) {
    const match = pattern.exec(block);
    if (match?.index != null) {
      end = Math.min(end, match.index);
    }
  }

  return block.slice(0, end).trim();
}

function hasStrongExcludeContext(text: string): boolean {
  return /品貸料|配分|委託会社|販売会社|受託会社/.test(text);
}

function extractAmonePdfExpenseRatio(text: string): {
  expenseRatio: number;
  patternName: string;
  matchedLabel?: string;
  matchedText?: string;
} | null {
  const normalized = normalizeText(text);
  const compact = compactText(text);

  const labelPatterns = [
    {
      patternName: "amone_management_fee_block",
      matchedLabel: "運用管理費用（信託報酬）",
      labelPattern: /運用管理費用[\s\S]{0,20}?信託報酬/,
      forward: 1400,
    },
    {
      patternName: "amone_trust_fee_block",
      matchedLabel: "信託報酬",
      labelPattern: /信託報酬/,
      forward: 1400,
    },
  ];

  for (const candidate of labelPatterns) {
    const rawBlock = findTextAfterLabel(
      normalized,
      candidate.labelPattern,
      candidate.forward,
    );
    if (!rawBlock) continue;

    const primaryBlock = cutAtSecondStepOrLoanFee(rawBlock);
    const primaryCompact = compactText(primaryBlock);

    const compactPatterns = [
      {
        patternName: "amone_current_sentence_primary",
        pattern: /現在は、?年率([\d.]+)%/,
      },
      {
        patternName: "amone_step1_sentence_primary",
        pattern: /①ファンドの日々の純資産総額に対して年率([\d.]+)%/,
      },
      {
        patternName: "amone_pure_assets_primary",
        pattern: /純資産総額に対して年率([\d.]+)%/,
      },
    ];

    for (const entry of compactPatterns) {
      const match = primaryCompact.match(entry.pattern);
      if (!match?.[1]) continue;

      const rawPercent = match[1];
      if (!isReasonableExpenseRatio(rawPercent)) continue;

      const ratio = percentToRatio(rawPercent);
      if (ratio == null) continue;

      return {
        expenseRatio: ratio,
        patternName: entry.patternName,
        matchedLabel: candidate.matchedLabel,
        matchedText: primaryBlock,
      };
    }

    const lineCandidates = primaryBlock
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !hasStrongExcludeContext(line))
      .filter((line) => !/年率\s*0\.5\s*%/.test(line))
      .filter((line) => !/49\.5\s*%|45\s*%|55\s*%/.test(line));

    for (const line of lineCandidates) {
      const match = line.match(/年率\s*([\d.]+)\s*%/);
      if (!match?.[1]) continue;

      const rawPercent = match[1];
      if (!isReasonableExpenseRatio(rawPercent)) continue;

      const ratio = percentToRatio(rawPercent);
      if (ratio == null) continue;

      return {
        expenseRatio: ratio,
        patternName: "amone_step1_loose_fallback",
        matchedLabel: candidate.matchedLabel,
        matchedText: line,
      };
    }
  }

  const globalCompactPatterns = [
    {
      patternName: "amone_global_current_sentence",
      pattern: /現在は、?年率([\d.]+)%/,
    },
    {
      patternName: "amone_global_step1_sentence",
      pattern: /①ファンドの日々の純資産総額に対して年率([\d.]+)%/,
    },
    {
      patternName: "amone_global_pure_assets",
      pattern: /純資産総額に対して年率([\d.]+)%/,
    },
  ];

  for (const entry of globalCompactPatterns) {
    const match = compact.match(entry.pattern);
    if (!match?.[1]) continue;

    const rawPercent = match[1];
    if (!isReasonableExpenseRatio(rawPercent)) continue;

    const ratio = percentToRatio(rawPercent);
    if (ratio == null) continue;

    return {
      expenseRatio: ratio,
      patternName: entry.patternName,
      matchedLabel: "global",
      matchedText: normalized.slice(0, 1600),
    };
  }

  return null;
}

export async function fetchAmoneExpenseRatioFromPdf(
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
    const extracted = extractAmonePdfExpenseRatio(parsed.text ?? "");

    if (!extracted || Number.isNaN(extracted.expenseRatio)) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: "amone PDFから管理費用を抽出できませんでした。",
      };
    }

    return {
      ok: true,
      expenseRatio: extracted.expenseRatio,
      sourceUrl,
      fetchedAt,
      note: "amone PDFから管理費用を抽出",
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