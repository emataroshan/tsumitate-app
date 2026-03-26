// data/expense-ratio.overrides.ts

export const EXPENSE_RATIO_OVERRIDES: Record<
  string,
  {
    value: number;
    reason?: string;
    sourceUrl?: string;
  }
> = {
  // 大和PDFはテキスト抽出できず（画像化されている可能性あり）
  daiwa_ifree_fang_plus: {
    value: 0.007755,
    reason: "大和PDFがテキスト抽出不可（画像PDFの可能性）",
    sourceUrl: "https://www.daiwa-am.co.jp/funds/doc_open/fund_doc_open.php?code=3346&type=1&preview=on",
  },

  daiwa_ifree_sp500: {
    value: 0.00198,
    reason: "大和PDFがテキスト抽出不可（画像PDFの可能性）",
    sourceUrl: "https://www.daiwa-am.co.jp/funds/doc_open/fund_doc_open.php?code=3340&type=1&preview=on",
  },
} as const;