// lib/analytics/volatility.ts

import type { NormalizedNavRow } from "../types";
import {
  buildDailyReturns,
  findClosestRowOnOrBefore,
  getLatestRow,
  getYearsAgo,
  sortRows,
} from "./series";

/**
 * 標準偏差を計算する
 */
export function calcStdDev(values: number[]): number | null {
  if (values.length < 2) return null;

  const mean =
    values.reduce((sum, v) => sum + v, 0) / values.length;

  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

/**
 * 日次リターンから年率ボラティリティを計算
 */
export function calcAnnualizedVolatilityFromDailyReturns(
  dailyReturns: number[]
): number | null {
  const stdDev = calcStdDev(dailyReturns);
  if (stdDev == null) return null;

  return stdDev * Math.sqrt(252);
}

/**
 * 指定期間の rows を切り出す
 */
function sliceRowsByYears(
  rows: NormalizedNavRow[],
  years: number
): NormalizedNavRow[] {
  const latest = getLatestRow(rows);
  if (!latest) return [];

  const targetDate = getYearsAgo(new Date(latest.date), years);

  const base = findClosestRowOnOrBefore(rows, targetDate);
  if (!base) return [];

  const sorted = sortRows(rows);

  return sorted.filter((row) => {
    const d = new Date(row.date);
    return d >= new Date(base.date);
  });
}

/**
 * 指定年数の年率ボラティリティを計算
 *
 * 例:
 * 1 → risk1y
 * 3 → risk3y
 * 5 → risk5y
 */
export function calcTrailingVolatility(
  rows: NormalizedNavRow[],
  years: 1 | 3 | 5
): number | null {
  const sliced = sliceRowsByYears(rows, years);
  if (sliced.length < 2) return null;

  const dailyReturns = buildDailyReturns(sliced);

  return calcAnnualizedVolatilityFromDailyReturns(dailyReturns);
}