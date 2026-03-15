// lib/fund.ts

import type { Fund } from "./types";

export function getFundReferenceReturn(fund: Fund): number {
  return (
    fund.refReturn?.threeYear ??
    fund.refReturn?.oneYear ??
    fund.refReturn?.fiveYear ??
    fund.refReturn?.sinceInception ??
    0
  );
}