// lib/expense/types.ts

export type ExpenseSourceType = "pdf" | "html" | "csv" | "manual";

export type ExpenseFetchMethod =
  | "rakuten_pdf"
  | "rakuten_html"
  | "manual";

export type ExpenseMatchMeta = {
  patternName: string;
  matchedLabel?: string;
  matchedText?: string;
};

export type ExpenseFetchSuccess = {
  ok: true;
  expenseRatio: number; // 例: 0.00162
  sourceUrl: string;
  fetchedAt: string;
  note?: string;
  match?: ExpenseMatchMeta;
};

export type ExpenseFetchFailure = {
  ok: false;
  sourceUrl: string;
  fetchedAt: string;
  error: string;
};

export type ExpenseFetchResult = ExpenseFetchSuccess | ExpenseFetchFailure;

export type AutoExpenseRatioRecord = {
  id: string;
  status: "ok" | "error";
  expenseRatio: number | null;
  sourceUrl: string;
  fetchedAt: string;
  fetchMethod: ExpenseFetchMethod;
  message?: string;
  patternName?: string;
  matchedLabel?: string;
  matchedText?: string;
};