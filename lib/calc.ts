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