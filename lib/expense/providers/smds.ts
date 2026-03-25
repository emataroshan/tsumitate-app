// lib/expense/providers/smds.ts

import pdfParse from "pdf-parse";
import type { ExpenseFetchResult } from "@/lib/expense/types";

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\u3000/g, " ")
    .replace(/％/g, "%")
    .replace(/[ \t]+/g, " ")
    // PDF崩れ対策:
    // 「運 用 管 理 費 用」「信 託 報 酬」「純 資 産 総 額」のような
    // CJK文字どうしの間に入る空白を除去する
    .replace(
      /(?<=[一-龠々ぁ-んァ-ヶーA-Za-z0-9])\s+(?=[一-龠々ぁ-んァ-ヶーA-Za-z0-9])/g,
      "",
    )
    // 括弧まわりの崩れも吸収
    .replace(/\s*（\s*/g, "（")
    .replace(/\s*）\s*/g, "）")
    .replace(/\s*\(\s*/g, "(")
    .replace(/\s*\)\s*/g, ")")
    // 年0.176 % のような崩れを吸収
    .replace(/\s*%\s*/g, "%")
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

  if (Math.abs(value - 20.315) < 0.0001) return true;
  if (value <= 0 || value > 5) return true;

  return false;
}

function findTextBlocksAfterLabel(
  text: string,
  labelPattern: RegExp,
  forward = 2000,
): string[] {
  const flags = labelPattern.flags.includes("g")
    ? labelPattern.flags
    : `${labelPattern.flags}g`;
  const globalPattern = new RegExp(labelPattern.source, flags);

  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = globalPattern.exec(text)) !== null) {
    if (match.index == null) continue;

    const start = match.index;
    const end = Math.min(text.length, start + forward);
    const block = text.slice(start, end).trim();

    if (block) {
      blocks.push(block);
    }

    // 念のためゼロ幅対策
    if (globalPattern.lastIndex === match.index) {
      globalPattern.lastIndex++;
    }
  }

  return blocks;
}

function trimAtStopPattern(block: string): string {
  const stopPatterns = [
    // /支払先/,
    /料率/,
    /役務の内容/,
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

function extractSmdsPdfExpenseRatio(text: string): {
  expenseRatio: number;
  patternName: string;
  matchedLabel?: string;
  matchedText?: string;
} | null {
  const normalized = normalizeText(text);

  const rawSentencePatterns = [
    {
      patternName: "smds_raw_sentence_amount_primary",
      matchedLabel: "運用管理費用（信託報酬）",
      pattern:
        /純資産総額に[\s\S]{0,120}?(?:年率|年)\s*([\d.]+)\s*%[\s\S]{0,30}?税抜(?:き)?\s*(?:年率\s*)?[\d.]+\s*%[\s\S]{0,60}?率を乗じた額/,
    },
    {
      patternName: "smds_raw_sentence_amount_secondary",
      matchedLabel: "運用管理費用（信託報酬）",
      pattern:
        /(?:年率|年)\s*([\d.]+)\s*%\s*[（(]\s*税抜(?:き)?\s*(?:年率\s*)?[\d.]+\s*%\s*[）)][\s\S]{0,60}?率を乗じた額/,
    },
  ] as const;

  const candidates = [
    {
      patternName: "smds_trust_fee_sentence_tax_included",
      matchedLabel: "運用管理費用（信託報酬）",
      labelPattern:
        /運用管理費用\s*（\s*信託報酬\s*）|運用管理費用\s*\(\s*信託報酬\s*\)/,
      extractPatterns: [
        // 例: 年0.176%（税抜0.16%）
        /年\s*([\d.]+)\s*%\s*（\s*税抜(?:き)?\s*[\d.]+\s*%\s*）/,
        // 例: 年率0.176%（税抜0.16%）
        /年率\s*([\d.]+)\s*%\s*（\s*税抜(?:き)?\s*[\d.]+\s*%\s*）/,
        // 表記ゆれ対策
        /年\s*([\d.]+)\s*%\s*（\s*税抜(?:き)?\s*年率\s*[\d.]+\s*%\s*）/,
        /年率\s*([\d.]+)\s*%\s*（\s*税抜(?:き)?\s*年率\s*[\d.]+\s*%\s*）/,
        // 文脈付き
        /純資産総額に[^\n]{0,120}?(?:年率|年)\s*([\d.]+)\s*%/,
        /(?:年率|年)\s*([\d.]+)\s*%/,
      ],
    },
    {
      patternName: "smds_trust_fee_label_fallback",
      matchedLabel: "信託報酬",
      labelPattern: /信託報酬）|信託報酬\)/,
      extractPatterns: [
        /年\s*([\d.]+)\s*%\s*（\s*税抜(?:き)?\s*[\d.]+\s*%\s*）/,
        /年率\s*([\d.]+)\s*%\s*（\s*税抜(?:き)?\s*[\d.]+\s*%\s*）/,
        /年\s*([\d.]+)\s*%\s*（\s*税抜(?:き)?\s*年率\s*[\d.]+\s*%\s*）/,
        /年率\s*([\d.]+)\s*%\s*（\s*税抜(?:き)?\s*年率\s*[\d.]+\s*%\s*）/,
        /純資産総額に[^\n]{0,120}?(?:年率|年)\s*([\d.]+)\s*%/,
        /(?:年率|年)\s*([\d.]+)\s*%/,
      ],
    },
  ] as const;

  for (const candidate of candidates) {
    const rawBlocks = findTextBlocksAfterLabel(
      normalized,
      candidate.labelPattern,
      2000,
    );
    if (rawBlocks.length === 0) continue;

    for (const rawBlock of rawBlocks) {
      // 1) 最優先:
      // 表の途中に本文が割り込む SMDS 特有の並びに対応するため、
      // trim 前の広い rawBlock から文脈ごと拾う
      for (const rawSentencePattern of rawSentencePatterns) {
        const rawMatch = rawBlock.match(rawSentencePattern.pattern);
        if (!rawMatch?.[1]) continue;

        const value = Number.parseFloat(rawMatch[1]);
        if (Number.isNaN(value)) continue;
        if (isUnnaturalPercentValue(value)) continue;

        const ratio = percentToRatio(rawMatch[1]);
        if (ratio == null) continue;

        return {
          expenseRatio: ratio,
          patternName: rawSentencePattern.patternName,
          matchedLabel: rawSentencePattern.matchedLabel,
          matchedText: rawMatch[0],
        };
      }

      // 2) 従来どおり trim 後ブロックでも試す
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
  }

  // 3) 最後の保険:
  // pdf-parse の読み順でラベル近傍に本文が来ない場合があるため、
  // 正規化済み全文から直接「純資産総額に年◯%（税抜◯%）」を探す
  const globalFallbackPatterns = [
    {
      patternName: "smds_global_sentence_tax_included",
      matchedLabel: "全文fallback",
      pattern:
        /純資産総額に[\s\S]{0,120}?(?:年率|年)\s*([\d.]+)\s*%\s*[（(]\s*税抜(?:き)?\s*(?:年率\s*)?[\d.]+\s*%\s*[）)][\s\S]{0,60}?率を乗じた額/,
    },
    {
      patternName: "smds_global_fee_sentence",
      matchedLabel: "全文fallback",
      pattern:
        /(?:運用管理費用|信託報酬)[\s\S]{0,240}?(?:年率|年)\s*([\d.]+)\s*%\s*[（(]\s*税抜(?:き)?\s*(?:年率\s*)?[\d.]+\s*%\s*[）)][\s\S]{0,60}?率を乗じた額/,
    },
    {
      patternName: "smds_global_simple_tax_included",
      matchedLabel: "全文fallback",
      pattern:
        /(?:年率|年)\s*([\d.]+)\s*%\s*[（(]\s*税抜(?:き)?\s*(?:年率\s*)?[\d.]+\s*%\s*[）)][\s\S]{0,60}?率を乗じた額/,
    },
  ] as const;

  for (const candidate of globalFallbackPatterns) {
    const match = normalized.match(candidate.pattern);
    if (!match?.[1]) continue;

    const value = Number.parseFloat(match[1]);
    if (Number.isNaN(value)) continue;
    if (isUnnaturalPercentValue(value)) continue;

    const ratio = percentToRatio(match[1]);
    if (ratio == null) continue;

    return {
      expenseRatio: ratio,
      patternName: candidate.patternName,
      matchedLabel: candidate.matchedLabel,
      matchedText: match[0],
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

export async function fetchSmdsExpenseRatioFromPdf(
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
        error: `SMDS PDFの取得に失敗しました: ${res.status} ${res.statusText}`,
      };
    }

    const arrayBuffer = await res.arrayBuffer();
    const data = await pdfParse(Buffer.from(arrayBuffer));
    const text = data.text ?? "";

    const extracted = extractSmdsPdfExpenseRatio(text);

    if (!extracted || Number.isNaN(extracted.expenseRatio)) {
      return {
        ok: false,
        sourceUrl,
        fetchedAt,
        error: "SMDS PDFから管理費用を抽出できませんでした。",
      };
    }

    return {
      ok: true,
      expenseRatio: extracted.expenseRatio,
      sourceUrl,
      fetchedAt,
      note: "SMDS PDFから管理費用を抽出",
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