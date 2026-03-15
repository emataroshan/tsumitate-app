//  lib/parsers/smds.ts

import type { NormalizedNavRow } from "../types";
import { 
  normalizeDate, 
  sortRowsByDate, 
  splitLines, 
  splitLooseDelimitedLine,
  toNumber 
} from "./shared";

export function parseSmdsCsv(csvText: string): NormalizedNavRow[] {
  const lines = splitLines(csvText);
  if (lines.length === 0) return [];

  const header = splitLooseDelimitedLine(lines[0]);

  const dateIndex = header.findIndex((h) => h === "日付");
  const navIndex = header.findIndex((h) => h === "基準価額");
  const dividendIndex = header.findIndex((h) => h === "分配金");
  const netAssetsIndex = header.findIndex((h) => h.includes("純資産総額"));

  if (dateIndex === -1 || navIndex === -1) return [];

  const rows: NormalizedNavRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLooseDelimitedLine(lines[i]);
    
    if (!cols[dateIndex]) continue;

    const nav = toNumber(cols[navIndex]);

    rows.push({
      date: normalizeDate(cols[dateIndex]),
      nav,
      adjustedNav: nav,
      dividend: dividendIndex >= 0 ? toNumber(cols[dividendIndex]) : 0,
      // SMDSの純資産総額(百万円)を、内部表現の億円に正規化
      netAssets: netAssetsIndex >= 0 ? toNumber(cols[netAssetsIndex]) / 100 : undefined,
    });
  }

  return sortRowsByDate(rows);
}