// lib/analytics/returns.ts

import type { NormalizedNavRow } from "../types";
import {
  findClosestRowOnOrBefore,
  getLatestRow,
  getYearsAgo,
  sortRows,
} from "./series";

/**
 * start / end / 年数 から年率リターン（CAGR）を計算する
 */
export function calcAnnualizedReturnFromValues(
  startValue: number,
  endValue: number,
  years: number
): number | null {
  if (!Number.isFinite(startValue) || startValue <= 0) return null;
  if (!Number.isFinite(endValue) || endValue <= 0) return null;
  if (!Number.isFinite(years) || years <= 0) return null;

  return Math.pow(endValue / startValue, 1 / years) - 1;
}

/**
 * 指定年数前を起点にした年率リターンを計算する
 *
 * 例:
 * - years = 1 -> 1年年率リターン
 * - years = 3 -> 3年年率リターン
 * - years = 5 -> 5年年率リターン
 */
export function calcTrailingAnnualizedReturn(
  rows: NormalizedNavRow[],
  years: 1 | 3 | 5
): number | null {
  const latest = getLatestRow(rows);
  if (!latest) return null;

  const targetDate = getYearsAgo(new Date(latest.date), years);
  const base = findClosestRowOnOrBefore(rows, targetDate);
  if (!base) return null;

  return calcAnnualizedReturnFromValues(
    base.adjustedNav,
    latest.adjustedNav,
    years
  );
}

/**
 * CSV開始来の年率リターンを計算する
 *
 * 注意:
 * これは厳密な「設定来」ではなく、
 * 手元CSVの最初の日付を起点にした年率リターン。
 */
export function calcSinceInceptionAnnualizedReturn(
  rows: NormalizedNavRow[]
): number | null {
  const sorted = sortRows(rows);
  if (sorted.length < 2) return null;

  const start = sorted[0];
  const end = sorted[sorted.length - 1];

  const elapsedMs =
    new Date(end.date).getTime() - new Date(start.date).getTime();

  const years = elapsedMs / (365.25 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(years) || years <= 0) return null;

  return calcAnnualizedReturnFromValues(
    start.adjustedNav,
    end.adjustedNav,
    years
  );
}