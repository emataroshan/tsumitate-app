// lib/expense/providers/index.ts

import type { ExpenseFetchResult, ExpenseFetchMethod } from "@/lib/expense/types";
import { fetchMufgExpenseRatioFromPdf } from "./mufg";
import { fetchRakutenExpenseRatioFromPdf } from "./rakuten";
import { fetchSbiExpenseRatioFromHtml } from "./sbi";
import { fetchSmdsExpenseRatioFromPdf } from "./smds";
import { fetchSmtExpenseRatioFromPdf } from "./smt";

export async function fetchExpenseRatio(
  method: ExpenseFetchMethod,
  sourceUrl: string,
): Promise<ExpenseFetchResult> {
  switch (method) {
    case "mufg_pdf":
      return fetchMufgExpenseRatioFromPdf(sourceUrl);
 
    case "rakuten_pdf":
      return fetchRakutenExpenseRatioFromPdf(sourceUrl);

    case "sbi_html":
      return fetchSbiExpenseRatioFromHtml(sourceUrl);

    case "smds_pdf":
      return fetchSmdsExpenseRatioFromPdf(sourceUrl);

    case "smt_pdf":
      return fetchSmtExpenseRatioFromPdf(sourceUrl);

    default:
      return {
        ok: false,
        sourceUrl,
        fetchedAt: new Date().toISOString(),
        error: `未対応の expense_fetch_method です: ${method}`,
      };
  }
}