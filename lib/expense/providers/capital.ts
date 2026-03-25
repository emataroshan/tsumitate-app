// lib/expense/providers/capital.ts

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

function percentToRatio(raw: string): number | null {
  const value = Number.parseFloat(raw.replace(/,/g, "").trim());
  if (Number.isNaN(value)) return null;
  return Number((value / 100).toFixed(8));
}

function findTextAfterLabel(
  text: string,
  labelPattern: RegExp,
  forward = 220,
): string | null {
  const match = labelPattern.exec(text);
  if (!match || match.index == null) return null;

  const start = match.index;
  const end = Math.min(text.length, start + forward);
  return text.slice(start, end).trim();
}

function isReasonableExpenseRatio(rawPercent: string): boolean {
  const value = Number.parseFloat(rawPercent);
  if (Number.isNaN(value)) return false;

  // 信託報酬等として現実的な範囲に限定
  return value > 0 && value < 10;
}

function extractPercentFromBlock(block: string): string | null {
  const patterns = [
    /運用管理費用[\s\S]{0,20}?信託報酬[\s\S]{0,40}?([\d.]+)\s*%/u,
    /信託報酬[\s\S]{0,40}?([\d.]+)\s*%/u,
    /([\d.]+)\s*%/u,
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (!match?.[1]) continue;

    const rawPercent = match[1];
    if (!isReasonableExpenseRatio(rawPercent)) continue;

    return rawPercent;
  }

  return null;
}

function hasStrongExcludeContext(text: string): boolean {
  return /購入時手数料|信託財産留保額|運用会社|販売会社|信託銀行/.test(text);
}

function extractCapitalHtmlExpenseRatio(text: string): {
  expenseRatio: number;
  patternName: string;
  matchedLabel?: string;
  matchedText?: string;
} | null {
  const normalized = normalizeText(text);

  // 1) 最優先:
  // 「ファンドの費用」表の値並び
  // 例: 0.00% / 外枠なし / 0.98000%
  // → 3つ目が運用管理費用（信託報酬）
  const feeTableBlock = findTextAfterLabel(normalized, /ファンドの費用/u, 900);

  if (feeTableBlock) {
    const compactBlock = feeTableBlock.replace(/\s+/g, " ").trim();

    // まずは、購入時手数料 -> 信託財産留保額 -> 運用管理費用
    // の3列構造をそのまま拾いに行く
    const threeColumnPattern =
      /購入時手数料[\s\S]{0,120}?信託財産留保額[\s\S]{0,120}?運用管理費用[\s\S]{0,120}?([\d.]+)\s*%[\s\S]{0,80}?外枠なし[\s\S]{0,80}?([\d.]+)\s*%/u;

    const threeColumnMatch = compactBlock.match(threeColumnPattern);
    if (threeColumnMatch?.[2]) {
      const rawPercent = threeColumnMatch[2];

      if (isReasonableExpenseRatio(rawPercent)) {
        const ratio = percentToRatio(rawPercent);
        if (ratio != null) {
          return {
            expenseRatio: ratio,
            patternName: "capital_fee_table_three_column_primary",
            matchedLabel: "ファンドの費用",
            matchedText: threeColumnMatch[0],
          };
        }
      }
    }

    // 次点:
    // ブロック内の % を順番に見て、0.00% の次に来る実質的な値を採る
    // 典型的には [0.00, 0.98000, 0.48000, 0.48000, 0.02000]
    const percentMatches = [...compactBlock.matchAll(/([\d.]+)\s*%/gu)]
      .map((m) => m[1])
      .filter((v): v is string => Boolean(v));

    if (percentMatches.length >= 2) {
      const candidates = percentMatches
        .map((raw) => ({
          raw,
          value: Number.parseFloat(raw),
        }))
        .filter((item) => !Number.isNaN(item.value));

      // 0.00% を除いた最初の値を優先
      // このページでは 0.98000 が最初に来る想定
      const firstNonZero = candidates.find((item) => item.value > 0);
      if (firstNonZero && isReasonableExpenseRatio(firstNonZero.raw)) {
        const ratio = percentToRatio(firstNonZero.raw);
        if (ratio != null) {
          return {
            expenseRatio: ratio,
            patternName: "capital_fee_table_first_nonzero_percent",
            matchedLabel: "ファンドの費用",
            matchedText: compactBlock,
          };
        }
      }
    }
  }

  // 2) 次点:
  // 「運用管理費用（信託報酬）」近傍から拾う
  // ここではブロックごと除外しない
  const primaryCandidates = [
    {
      patternName: "capital_trust_fee_primary",
      matchedLabel: "運用管理費用（信託報酬）",
      labelPattern: /運用管理費用[\s\S]{0,10}?信託報酬/u,
      forward: 260,
    },
    {
      patternName: "capital_trust_fee_loose",
      matchedLabel: "信託報酬",
      labelPattern: /信託報酬/u,
      forward: 260,
    },
  ];

  for (const candidate of primaryCandidates) {
    const block = findTextAfterLabel(
      normalized,
      candidate.labelPattern,
      candidate.forward,
    );
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

  // 3) 最終 fallback:
  // ページ全体から「運用管理費用（信託報酬）」近傍
  const fallbackMatch = normalized.match(
    /運用管理費用[\s\S]{0,10}?信託報酬[\s\S]{0,120}?([\d.]+)\s*%/u,
  );

  if (fallbackMatch?.[1]) {
    const rawPercent = fallbackMatch[1];
    if (isReasonableExpenseRatio(rawPercent)) {
      const ratio = percentToRatio(rawPercent);
      if (ratio != null) {
        return {
          expenseRatio: ratio,
          patternName: "capital_trust_fee_fallback",
          matchedLabel: "運用管理費用（信託報酬）",
          matchedText: fallbackMatch[0],
        };
      }
    }
  }

  return null;
}

export async function fetchCapitalExpenseRatioFromHtml(
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
    const extracted = extractCapitalHtmlExpenseRatio(text);

    if (!extracted || Number.isNaN(extracted.expenseRatio)) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: "capital HTMLから管理費用を抽出できませんでした。",
      };
    }

    return {
      ok: true,
      expenseRatio: extracted.expenseRatio,
      sourceUrl,
      fetchedAt,
      note: "capital HTMLから管理費用を抽出",
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