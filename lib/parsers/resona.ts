// lib/parsers/resona.ts

import type { NormalizedNavRow } from "../types";
import {
  sortRowsByDate,
  splitLines,
  splitLooseDelimitedLine,
  toNumber,
} from "./shared";

function normalizeCompactDate(value: string): string {
  const v = value.trim();
  if (/^\d{8}$/.test(v)) {
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  }
  throw new Error(`Invalid resona date: ${value}`);
}

export function parseResonaCsv(csvText: string): NormalizedNavRow[] {
  const lines = splitLines(csvText);
  if (lines.length === 0) return [];

  const header = splitLooseDelimitedLine(lines[0]);

  const dateIndex = header.findIndex((h) => h.includes("日付"));
  const navIndex = header.findIndex((h) => h.includes("基準価額"));
  const netAssetsIndex = header.findIndex((h) => h.includes("純資産総額"));

  if (dateIndex === -1 || navIndex === -1) return [];

  const rows: NormalizedNavRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLooseDelimitedLine(lines[i]);
    if (!cols[dateIndex]) continue;

    const nav = toNumber(cols[navIndex]);

    rows.push({
      date: normalizeCompactDate(cols[dateIndex]),
      nav,
      adjustedNav: nav,
      dividend: 0,
      // 百万円 → 億円
      netAssets:
        netAssetsIndex >= 0
          ? toNumber(cols[netAssetsIndex]) / 100 
          : undefined,
    });
  }

  return sortRowsByDate(rows);
}