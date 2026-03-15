// lib/fund-builder.ts

import type { Fund, FundConfig, NormalizedNavRow } from "./types";

function findClosestPastRow(
  rows: NormalizedNavRow[],
  targetDate: Date
): NormalizedNavRow | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const rowDate = new Date(rows[i].date);
    if (rowDate <= targetDate) return rows[i];
  }
  return null;
}

function getYearsAgo(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() - years);
  return d;
 }

function calcReturn(
  latestAdjustedNav: number,
  baseAdjustedNav: number | null | undefined
): number | undefined {
  if (!baseAdjustedNav || baseAdjustedNav <= 0) return undefined;
  return latestAdjustedNav / baseAdjustedNav - 1;
}

export function buildFund(config: FundConfig, rows: NormalizedNavRow[]): Fund {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];

  if (!latest) {
    return {
      id: config.id,
      name: config.name,
      providerId: config.providerId,
      tags: config.tags,
      expenseRatio: config.expenseRatio,
      refReturn: {},
      asOf: null,
    };
  }

  const latestDate = new Date(latest.date);
  const oneYearBase = findClosestPastRow(sorted, getYearsAgo(latestDate, 1));
  const threeYearBase = findClosestPastRow(sorted, getYearsAgo(latestDate, 3));
  const fiveYearBase = findClosestPastRow(sorted, getYearsAgo(latestDate, 5));
  const inceptionBase = sorted[0];

  return {
    id: config.id,
    name: config.name,
    providerId: config.providerId,
    tags: config.tags,
    expenseRatio: config.expenseRatio,
    refReturn: {
      oneYear: calcReturn(latest.adjustedNav, oneYearBase?.adjustedNav),
      threeYear: calcReturn(latest.adjustedNav, threeYearBase?.adjustedNav),
      fiveYear: calcReturn(latest.adjustedNav, fiveYearBase?.adjustedNav),
      sinceInception: calcReturn(latest.adjustedNav, inceptionBase?.adjustedNav),
    },
    asOf: latest.date,
  };
}