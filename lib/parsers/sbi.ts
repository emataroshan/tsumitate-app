// lib/parsers/sbi.ts

import type { NormalizedNavRow } from "../types";
import {
  normalizeDate,
  sortRowsByDate,
  splitCsvLine,
  splitLines,
  toNumber,
} from "./shared";

export function parseSbiCsv(csvText: string): NormalizedNavRow[] {
  const lines = splitLines(csvText);
  if (lines.length === 0) return [];

  const headerLineIndex = lines.findIndex((line) => {
    const cols = splitCsvLine(line);
    const hasDate = cols.some((c) => c.includes("基準日") || c.includes("年月日"));
    const hasNav = cols.some((c) => c.includes("基準価額"));
    return hasDate && hasNav;
  });

  if (headerLineIndex === -1) return [];

  const header = splitCsvLine(lines[headerLineIndex]);

  const dateIndex = header.findIndex(
    (h) => h.includes("基準日") || h.includes("年月日")
  );
  const navIndex = header.findIndex((h) => h.includes("基準価額"));
  const netAssetsIndex = header.findIndex((h) => h.includes("純資産総額"));

  const rows: NormalizedNavRow[] = [];

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (!cols[dateIndex]) continue;

    const nav = toNumber(cols[navIndex]);

    rows.push({
      date: normalizeDate(cols[dateIndex]),
      nav,
      adjustedNav: nav,
      dividend: 0,
      // SBIの純資産総額は百万円単位のため、内部表現の億円に正規化
      netAssets: netAssetsIndex >= 0 ? toNumber(cols[netAssetsIndex]) / 100 : undefined,
    });
  }

  return sortRowsByDate(rows);
}