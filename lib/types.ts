// lib/types.ts

export type Fund = {
  id: string;
  name: string;
  provider?: string;
  tags?: string[];
  expense_ratio: number; // 例: 0.0005775 (=0.05775%)
  ref_return: number; // 例: 0.10 (=10%/年) 各ファンドの参考年率（初期値）
};

/** 課税口座の税率（日本の上場株式等の譲渡益・配当の代表値） */
export type TaxRatePreset = "JP_CAPITAL_GAINS_20_315" | "CUSTOM";

export type TaxComparisonParams = {
  taxRate: number; // 例: 0.20315
};

export type TaxComparisonResult = {
  nisaFinalValue: number;
  taxableFinalValue: number;
  principal: number;

  nisaProfit: number;
  taxableProfitAfterTax: number;

  taxPaid: number;        // 課税口座で支払う税金（売却時課税の近似）
  nisaBenefit: number;    // NISAの得（= nisaFinalValue - taxableFinalValue）
};

export type NisaCaps = {
  tsumitateAnnualCap: number; // 例: 1_200_000
  tsumitateLifetimeCap: number; // 例: 6_000_000
  growthAnnualCap: number; // 例: 2_400_000
  growthLifetimeCap: number; // 例: 12_000_000
  totalLifetimeCap: number; // 例: 18_000_000
};

export type NisaCapStatus = {
  monthly: number;
  annualContribution: number;

  // つみたて投資枠
  fillsTsumitateAnnualCap: boolean;
  fillsTsumitateLifetimeCapYears: number; // 到達年数（概算、端数切り上げ）

  // 成長投資枠（積立だけで埋める想定の概算）
  fillsGrowthAnnualCap: boolean;
  fillsGrowthLifetimeCapYears: number;

  // 合計生涯枠（積立だけで埋める想定の概算）
  fillsTotalLifetimeCapYears: number;
};