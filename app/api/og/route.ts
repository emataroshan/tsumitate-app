// app/api/og/route.ts

import React from "react";
import { ImageResponse } from "next/og";
import { FUND_CONFIG } from "@/data/fund-config";
import { FUND_ANALYTICS_BY_ID } from "@/data/fund-analytics";
import { simulate } from "@/lib/calc";
import type { Fund } from "@/lib/types";
import OgImage from "./OgImage";

export const runtime = "nodejs";

const allFunds = FUND_CONFIG as unknown as Fund[];

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function parseRate(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

function getReferenceAnnualReturn(fundId: string): number | null {
  const analytics = FUND_ANALYTICS_BY_ID[fundId];
  return (
    analytics?.annualizedReturn5y ??
    analytics?.annualizedReturn3y ??
    analytics?.annualizedReturn1y ??
    analytics?.annualizedReturnSinceInception ??
    null
  );
}

function formatYen(v: number) {
  return (
    new Intl.NumberFormat("ja-JP", {
      maximumFractionDigits: 0,
    }).format(v) + "円"
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const monthly = parsePositiveInt(searchParams.get("monthly"), 30000);
  const years = Math.max(1, parsePositiveInt(searchParams.get("years"), 20));
  const initial = parsePositiveInt(searchParams.get("initial"), 0);

  const rawRateMode = searchParams.get("rateMode");
  const rateMode: "fund" | "custom" =
    rawRateMode === "fund" ? "fund" : "custom";

  const customAnnualReturn = parseRate(searchParams.get("rate"), 0.05);

  const fundsParam = searchParams.get("funds") ?? "";
  const selectedIds = fundsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const defaultSelectedIds = [
    "mufg_emaxis_slim_all_country",
    "mufg_emaxis_slim_sp500",
  ];

  const effectiveSelectedIds =
    selectedIds.length > 0 ? selectedIds : defaultSelectedIds;

  const selectedFunds = allFunds.filter((f) =>
    effectiveSelectedIds.includes(f.id)
  );

  const fundsToCompare =
    selectedFunds.length > 0
      ? selectedFunds
      : allFunds.filter((f) => defaultSelectedIds.includes(f.id));

  let best:
    | {
        fund: Fund;
        finalValue: number;
        profit: number;
      }
    | null = null;

  for (const f of fundsToCompare) {
    const annualReturn =
      rateMode === "custom"
        ? customAnnualReturn
        : (getReferenceAnnualReturn(f.id) ?? 0);

    const res = simulate({
      monthly,
      years,
      initial,
      annualReturn,
      expenseRatio: f.expenseRatio,
    });

    if (!best || res.finalValue > best.finalValue) {
      best = {
        fund: f,
        finalValue: res.finalValue,
        profit: res.profit,
      };
    }
  }

  const finalValueText = best ? formatYen(best.finalValue) : "-";
  const profitText = best
    ? `${best.profit >= 0 ? "+" : ""}${formatYen(best.profit)}`
    : "-";
  const fundName = best ? best.fund.name : "比較対象なし";

  return new ImageResponse(
    React.createElement(OgImage, {
      monthly,
      years,
      initial,
      finalValueText,
      profitText,
      fundName,
    }),
    {
      width: 1200,
      height: 630,
    }
  );
}