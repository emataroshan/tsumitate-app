// lib/types.ts

export type FundConfig = {
  id: string;
  name: string;
  providerId: string;
  expenseRatio: number;
  tags: string[];
};


export type Fund = {
  id: string;
  name: string;
  providerId: string;
  tags: string[];
  expenseRatio: number; // 例: 0.0005775 (=0.05775%)
  refReturn: {
    oneYear?: number;
    threeYear?: number;
    fiveYear?: number;
    sinceInception?: number;
  };
  asOf: string | null;
};

// netAssets は provider ごとの差異を吸収したうえで「億円」に統一する
export type NormalizedNavRow = {
  date: string;
  nav: number;
  adjustedNav: number;
  dividend: number;
  netAssets?: number;
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