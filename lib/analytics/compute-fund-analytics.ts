// lib/analytics/compute-fund-analytics.ts

import type { NormalizedNavRow } from "../types";
import type { FundAnalytics } from "./types";

import { getLatestRow } from "./series";
import {
  calcTrailingAnnualizedReturn,
  calcSinceInceptionAnnualizedReturn,
} from "./returns";

import { calcTrailingVolatility } from "./volatility";
import { calcSharpeRatio } from "./sharpe";

/**
 * 1ファンド分の analytics を計算する
 */
export function computeFundAnalytics(
  fundId: string,
  rows: NormalizedNavRow[]
): FundAnalytics {
  const latest = getLatestRow(rows);

  // 最新値
  const navLatest = latest?.nav ?? null;
  const navDate = latest?.date ?? null;
  const netAssetsLatest = latest?.netAssets ?? null;

  // 年率リターン
  const annualizedReturn1y = calcTrailingAnnualizedReturn(rows, 1);
  const annualizedReturn3y = calcTrailingAnnualizedReturn(rows, 3);
  const annualizedReturn5y = calcTrailingAnnualizedReturn(rows, 5);
  const annualizedReturnSinceInception =
    calcSinceInceptionAnnualizedReturn(rows);

  // リスク
  const risk1y = calcTrailingVolatility(rows, 1);
  const risk3y = calcTrailingVolatility(rows, 3);
  const risk5y = calcTrailingVolatility(rows, 5);

  // Sharpe
  const sharpe1y = calcSharpeRatio(annualizedReturn1y, risk1y, 0);

  return {
    id: fundId,

    asOf: navDate,

    navLatest,
    navDate,
    netAssetsLatest,

    annualizedReturn1y,
    annualizedReturn3y,
    annualizedReturn5y,
    annualizedReturnSinceInception,

    risk1y,
    risk3y,
    risk5y,

    sharpe1y,
  };
}