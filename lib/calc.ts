// lib/calc.ts

export type SimulateParams = {
  monthly: number;
  years: number;
  initial: number;
  annualReturn: number;
  expenseRatio: number;
};

export type SimulateResult = {
  finalValue: number;
  principal: number;
  profit: number;
  multiple: number;
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

export function simulate(params: SimulateParams): SimulateResult {
  const { monthly, years, initial, annualReturn, expenseRatio } = params;

  const months = years * 12;

  // Excelと同じ式
  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const monthlyFee = Math.pow(1 + expenseRatio, 1 / 12) - 1;

  const netMonthly = (1 + monthlyReturn) * (1 - monthlyFee) - 1;

  let balance = initial;

  for (let i = 0; i < months; i++) {
    balance = balance * (1 + netMonthly) + monthly;
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
  const { monthly, years, initial, annualReturn, expenseRatio } = params;
  const months = years * 12;

  const monthlyReturn = Math.pow(1 + annualReturn, 1 / 12) - 1;
  const monthlyFee = Math.pow(1 + expenseRatio, 1 / 12) - 1;
  const netMonthly = (1 + monthlyReturn) * (1 - monthlyFee) - 1;

  let balance = initial;
  let principal = initial;

  const points: SimulatePoint[] = [];
  points.push({ month: 0, year: 0, balance, principal });

  for (let i = 1; i <= months; i++) {
    balance = balance * (1 + netMonthly) + monthly;
    principal += monthly;

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