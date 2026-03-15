// lib/parsers/capital.ts

import type { NormalizedNavRow } from "../types";
import {
  splitLines,
  splitLooseDelimitedLine,
  sortRowsByDate,
  toNumber,
} from "./shared";

function normalizeJapaneseDate(value: string): string {
  const v = value.trim();

  const m = v.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/);
  if (!m) {
    throw new Error(`Invalid capital date: ${value}`);
  }

  const [, y, mo, d] = m;

  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function parseCapitalCsv(csvText: string): NormalizedNavRow[] {
  const lines = splitLines(csvText);
  if (lines.length === 0) return [];

  const header = splitLooseDelimitedLine(lines[0]);

  const dateIndex = header.findIndex((h) => h.includes("年月日"));
  const navIndex = header.findIndex((h) => h.includes("基準価額"));
  const netAssetsIndex = header.findIndex((h) => h.includes("純資産総額"));
  const dividendIndex = header.findIndex((h) => h.includes("分配金"));

  if (dateIndex === -1 || navIndex === -1) return [];

  const rows: NormalizedNavRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLooseDelimitedLine(lines[i]);
    if (!cols[dateIndex]) continue;

    const nav = toNumber(cols[navIndex]);

    rows.push({
      date: normalizeJapaneseDate(cols[dateIndex]),
      nav,
      adjustedNav: nav,
      dividend: dividendIndex >= 0 ? toNumber(cols[dividendIndex]) : 0,
      // 百万円 → 億円
      netAssets:
        netAssetsIndex >= 0
          ? toNumber(cols[netAssetsIndex]) / 100
          : undefined,
    });
  }

  return sortRowsByDate(rows);
}