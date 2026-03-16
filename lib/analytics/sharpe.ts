// lib/analytics/sharpe.ts

/**
 * シャープレシオを計算する
 *
 * Sharpe = (Return - RiskFreeRate) / Volatility
 */
export function calcSharpeRatio(
  annualizedReturn: number | null,
  annualizedVolatility: number | null,
  riskFreeRate = 0
): number | null {
  if (annualizedReturn == null) return null;
  if (annualizedVolatility == null) return null;

  if (!Number.isFinite(annualizedVolatility) || annualizedVolatility <= 0) {
    return null;
  }

  return (annualizedReturn - riskFreeRate) / annualizedVolatility;
}