// lib/analytics/types.ts

/**
 * ファンドの分析結果データ
 * CSV履歴から計算された派生データ
 */
export type FundAnalytics = {
  id: string;

  /** データ基準日（最新NAVの日） */
  asOf: string | null;

  /** 最新基準価額 */
  navLatest: number | null;

  /** 最新基準価額の日付 */
  navDate: string | null;

  /** 最新純資産総額 */
  netAssetsLatest: number | null;

  /** 年率リターン */
  annualizedReturn1y: number | null;
  annualizedReturn3y: number | null;
  annualizedReturn5y: number | null;
  annualizedReturnSinceInception: number | null;

  /** 年率リスク（ボラティリティ） */
  risk1y: number | null;
  risk3y: number | null;
  risk5y: number | null;

  /** シャープレシオ */
  sharpe1y: number | null;
};