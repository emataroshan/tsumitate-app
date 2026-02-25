// lib/calc.ts

export type SimulateParams = {
  monthly: number;        // 毎月積立額
  years: number;          // 期間（年）
  initial: number;        // 初期投資額
  annualReturn: number;   // 期待リターン（年率, 例: 0.06）
  expenseRatio: number;   // 信託報酬等（年率, 例: 0.003）
};

export type SimulateResult = {
  finalValue: number; // 最終評価額
  principal: number;  // 元本
  profit: number;     // 損益
  multiple: number;   // 評価額 / 元本
};

export type SimulatePoint = {
  month: number;     // 0..months
  year: number;      // 0..years（表示用の概算）
  balance: number;   // 評価額
  principal: number; // 元本累計
};

export type SimulateSeries = {
  summary: SimulateResult;
  points: SimulatePoint[];
};

function toMonthlyRateFromAnnual(annualRate: number): number {
  // 年率 → 月率（複利整合）
  // 例: 年率 6% => (1.06)^(1/12)-1
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function sanitizeNumber(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

/**
 * NISAの投信積立を意識した月次モデル（推奨デフォルト）
 * - 月初買付（積立→運用→費用）
 * - リターンは複利換算した月率で適用
 * - 信託報酬（expenseRatio）は月次で残高に対して乗算控除（=連続控除の近似）
 */
export function simulate(params: SimulateParams): SimulateResult {
  const monthly = sanitizeNumber(params.monthly);
  const years = Math.max(0, Math.floor(sanitizeNumber(params.years)));
  const initial = sanitizeNumber(params.initial);
  const annualReturn = sanitizeNumber(params.annualReturn);
  const expenseRatio = sanitizeNumber(params.expenseRatio);

  const months = years * 12;

  const r = toMonthlyRateFromAnnual(annualReturn);
  const f = toMonthlyRateFromAnnual(expenseRatio);

  let balance = initial;

  for (let i = 0; i < months; i++) {
    // 月初買付
    balance += monthly;

    // 値動き（運用）
    balance *= 1 + r;

    // 管理費用（信託報酬）
    balance *= 1 - f;
  }

  const principal = initial + monthly * months;
  const profit = balance - principal;
  const multiple = principal > 0 ? balance / principal : 0;

  return {
    finalValue: balance,
    principal,
    profit,
    multiple,
  };
}

export function simulateSeries(params: SimulateParams): SimulateSeries {
  const monthly = sanitizeNumber(params.monthly);
  const years = Math.max(0, Math.floor(sanitizeNumber(params.years)));
  const initial = sanitizeNumber(params.initial);
  const annualReturn = sanitizeNumber(params.annualReturn);
  const expenseRatio = sanitizeNumber(params.expenseRatio);

  const months = years * 12;

  const r = toMonthlyRateFromAnnual(annualReturn);
  const f = toMonthlyRateFromAnnual(expenseRatio);

  let balance = initial;
  let principal = initial;

  const points: SimulatePoint[] = [];
  points.push({ month: 0, year: 0, balance, principal });

  for (let i = 1; i <= months; i++) {
    // 月初買付
    balance += monthly;
    principal += monthly;

    // 値動き（運用）
    balance *= 1 + r;

    // 管理費用（信託報酬）
    balance *= 1 - f;

    points.push({
      month: i,
      year: Math.floor(i / 12),
      balance,
      principal,
    });
  }

  const summary: SimulateResult = {
    finalValue: balance,
    principal,
    profit: balance - principal,
    multiple: principal > 0 ? balance / principal : 0,
  };

  return { summary, points };
}

/* =========================
 * v1.1 神機能：課税口座比較
 * ========================= */

/**
 * 課税口座は「売却時に利益へ課税」の近似で計算（初心者向けに分かりやすいモデル）
 * taxableFinal = principal + profit * (1 - taxRate)
 *
 * 注意：配当/分配金の途中課税・売買による実現益などは考慮しない（v2以降で拡張可能）
 */
export type TaxComparisonResult = {
  nisaFinalValue: number;
  taxableFinalValue: number;
  principal: number;

  nisaProfit: number;
  taxableProfitAfterTax: number;

  taxPaid: number;
  nisaBenefit: number;
};

export function compareNisaVsTaxable(
  params: SimulateParams,
  taxRate: number = 0.20315
): TaxComparisonResult {
  const t = clamp01(sanitizeNumber(taxRate));

  const nisa = simulate(params);

  const taxableProfitAfterTax = nisa.profit > 0 ? nisa.profit * (1 - t) : nisa.profit; 
  // 損失はここでは単純にそのまま（損益通算等は扱わない）

  const taxableFinalValue = nisa.principal + taxableProfitAfterTax;

  const taxPaid = nisa.profit > 0 ? nisa.profit - taxableProfitAfterTax : 0;
  const nisaBenefit = nisa.finalValue - taxableFinalValue;

  return {
    nisaFinalValue: nisa.finalValue,
    taxableFinalValue,
    principal: nisa.principal,
    nisaProfit: nisa.profit,
    taxableProfitAfterTax,
    taxPaid,
    nisaBenefit,
  };
}

/* =========================
 * v1.2 神機能：NISA枠メーター
 * ========================= */

export type NisaCaps = {
  tsumitateAnnualCap: number;
  tsumitateLifetimeCap: number;
  growthAnnualCap: number;
  growthLifetimeCap: number;
  totalLifetimeCap: number;
};

export const DEFAULT_NISA_CAPS: NisaCaps = {
  tsumitateAnnualCap: 1_200_000,
  tsumitateLifetimeCap: 6_000_000,
  growthAnnualCap: 2_400_000,
  growthLifetimeCap: 12_000_000,
  totalLifetimeCap: 18_000_000,
};

export type NisaCapStatus = {
  monthly: number;
  annualContribution: number;

  fillsTsumitateAnnualCap: boolean;
  fillsTsumitateLifetimeCapYears: number;

  fillsGrowthAnnualCap: boolean;
  fillsGrowthLifetimeCapYears: number;

  fillsTotalLifetimeCapYears: number;
};

function yearsToReachCap(annualContribution: number, cap: number): number {
  if (annualContribution <= 0) return Infinity;
  return Math.ceil(cap / annualContribution);
}

/**
 * 「積立額だけで枠を埋めると何年？」を返す簡易メーター。
 * - 初心者版では “つみたて枠” 表示だけでも十分強い
 * - v2以降で「成長枠は一括も含める」など拡張可能
 */
export function getNisaCapStatus(
  monthly: number,
  caps: NisaCaps = DEFAULT_NISA_CAPS
): NisaCapStatus {
  const m = Math.max(0, sanitizeNumber(monthly));
  const annual = m * 12;

  return {
    monthly: m,
    annualContribution: annual,

    fillsTsumitateAnnualCap: annual > caps.tsumitateAnnualCap,
    fillsTsumitateLifetimeCapYears: yearsToReachCap(annual, caps.tsumitateLifetimeCap),

    fillsGrowthAnnualCap: annual > caps.growthAnnualCap,
    fillsGrowthLifetimeCapYears: yearsToReachCap(annual, caps.growthLifetimeCap),

    fillsTotalLifetimeCapYears: yearsToReachCap(annual, caps.totalLifetimeCap),
  };
}

/* =========================
 * v2下地：インフレ調整（名目→実質）
 * ========================= */

export function deflateToRealValue(nominalValue: number, inflationAnnual: number, years: number): number {
  const v = sanitizeNumber(nominalValue);
  const inf = sanitizeNumber(inflationAnnual);
  const y = Math.max(0, sanitizeNumber(years));

  // 実質価値 = 名目 / (1+インフレ)^年数
  return v / Math.pow(1 + inf, y);
}