// lib/parsers/daiwa.ts

import type { NormalizedNavRow } from "../types";
import { sortRowsByDate, splitLines, splitLooseDelimitedLine, toNumber } from "./shared";

function normalizeCompactDate(value: string): string {
  const v = value.trim().replace(/"/g, "");
  if (/^\d{8}$/.test(v)) {
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  }
  throw new Error(`Invalid daiwa date: ${value}`);
}

export function parseDaiwaCsv(csvText: string): NormalizedNavRow[] {
  const lines = splitLines(csvText);
  if (lines.length === 0) return [];

  const header = splitLooseDelimitedLine(lines[0]);

  const dateIndex = header.findIndex((h) => h.includes("基準日"));
  const navIndex = header.findIndex((h) => h === "基準価額" || h.includes("基準価額"));
  const adjustedNavIndex = header.findIndex((h) => h.includes("分配金再投資基準価額"));
  const dividendIndex = header.findIndex((h) => h.includes("直近分配金"));
  const netAssetsIndex = header.findIndex((h) => h.includes("純資産総額"));

  if (dateIndex === -1 || navIndex === -1) return [];

  const rows: NormalizedNavRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitLooseDelimitedLine(lines[i]);
    if (!cols[dateIndex]) continue;

    const nav = toNumber(cols[navIndex]);
    const adjustedNav =
      adjustedNavIndex >= 0 ? toNumber(cols[adjustedNavIndex]) : nav;

    rows.push({
      date: normalizeCompactDate(cols[dateIndex]),
      nav,
      adjustedNav,
      dividend: dividendIndex >= 0 ? toNumber(cols[dividendIndex]) : 0,
      // 大和は純資産総額が円っぽいので、内部表現の億円へ正規化
      netAssets:
        netAssetsIndex >= 0 ? toNumber(cols[netAssetsIndex]) / 100000000 : undefined,
    });
  }

  return sortRowsByDate(rows);
}