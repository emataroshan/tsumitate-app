// lib/parsers/amone.ts

import type { NormalizedNavRow } from "../types";
import {
  normalizeDate,
  sortRowsByDate,
  splitLines,
  splitLooseDelimitedLine,
  toNumber,
} from "./shared";

export function parseAmoneCsv(csvText: string): NormalizedNavRow[] {
  const lines = splitLines(csvText);
  if (lines.length === 0) return [];

  const header = splitLooseDelimitedLine(lines[0]);

  const dateIndex = header.findIndex((h) => h.includes("基準日"));
  const navIndex = header.findIndex((h) => h.includes("基準価額"));
  const dividendIndex = header.findIndex((h) => h.includes("分配金"));
  const netAssetsIndex = header.findIndex((h) => h.includes("純資産総額"));

  if (dateIndex === -1 || navIndex === -1) return [];

  const rows: NormalizedNavRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLooseDelimitedLine(lines[i]);
    if (!cols[dateIndex]) continue;

    const nav = toNumber(cols[navIndex]);
    const dividendRaw = dividendIndex >= 0 ? cols[dividendIndex] : undefined;
    const dividend = !dividendRaw || dividendRaw === "-" ? 0 : toNumber(dividendRaw);

    rows.push({
      date: normalizeDate(cols[dateIndex]),
      nav,
      adjustedNav: nav,
      dividend,
      netAssets:
        netAssetsIndex >= 0
          ? toNumber(cols[netAssetsIndex]) // amone も億円前提
          : undefined,
    });
  }

  return sortRowsByDate(rows);
}