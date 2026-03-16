// lib/analytics/series.ts

import type { NormalizedNavRow } from "../types";

/**
 * 日付昇順でソート
 */
export function sortRows(rows: NormalizedNavRow[]): NormalizedNavRow[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 最新行を取得
 */
export function getLatestRow(
  rows: NormalizedNavRow[]
): NormalizedNavRow | null {
  if (rows.length === 0) return null;

  const sorted = sortRows(rows);
  return sorted[sorted.length - 1] ?? null;
}

/**
 * 指定日以前で最も近い行を取得
 */
export function findClosestRowOnOrBefore(
  rows: NormalizedNavRow[],
  targetDate: Date
): NormalizedNavRow | null {
  if (rows.length === 0) return null;

  const sorted = sortRows(rows);

  for (let i = sorted.length - 1; i >= 0; i--) {
    const rowDate = new Date(sorted[i].date);

    if (rowDate <= targetDate) {
      return sorted[i];
    }
  }

  return null;
}

/**
 * 指定年数前の基準日を作る
 */
export function getYearsAgo(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() - years);
  return d;
}

/**
 * adjustedNavベースの日次リターン列を作る
 */
export function buildDailyReturns(
  rows: NormalizedNavRow[]
): number[] {
  const sorted = sortRows(rows);
  const returns: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].adjustedNav;
    const curr = sorted[i].adjustedNav;

    if (prev > 0 && Number.isFinite(prev) && Number.isFinite(curr)) {
      returns.push(curr / prev - 1);
    }
  }

  return returns;
}