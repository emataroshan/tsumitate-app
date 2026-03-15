// lib/parsers/mufg.ts

import type { NormalizedNavRow } from "../types";
import { normalizeDate, sortRowsByDate, splitLines, toNumber } from "./shared";

export function parseMufgCsv(csvText: string): NormalizedNavRow[] {
  const lines = splitLines(csvText);
  if (lines.length === 0) return [];

  const headerIndex = lines.findIndex((line) => line.includes("基準日"));
  if (headerIndex === -1) return [];

  const header = lines[headerIndex].split(/\t|,/).map((h) => h.trim());

  const dateIndex = header.findIndex((h) => h.includes("基準日"));
  const navIndex = header.findIndex((h) => h.includes("基準価額") && !h.includes("再投資"));
  const adjustedNavIndex = header.findIndex((h) => h.includes("基準価額") && h.includes("再投資"));
  const dividendIndex = header.findIndex((h) => h.includes("分配金") && !h.includes("再投資"));
  const netAssetsIndex = header.findIndex((h) => h.includes("純資産総額"));

  const rows: NormalizedNavRow[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (!cols[dateIndex]) continue;

    const nav = toNumber(cols[navIndex]);
    const adjustedNav = adjustedNavIndex >= 0 ? toNumber(cols[adjustedNavIndex]) : nav;

    rows.push({
      date: normalizeDate(cols[dateIndex]),
      nav,
      adjustedNav,
      dividend: dividendIndex >= 0 ? toNumber(cols[dividendIndex]) : 0,
      netAssets: netAssetsIndex >= 0 ? toNumber(cols[netAssetsIndex]) : undefined,
    });
  }

  return sortRowsByDate(rows);
}