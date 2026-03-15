//hooks/useBalanceChartData.ts

"use client";

import { useMemo } from "react";
import { Fund } from "@/lib/types";
import { simulateSeries } from "@/lib/calc";
import { getFundReferenceReturn } from "@/lib/fund";

type Series = {
  fund: Fund;
  points: { month: number; year: number; balance: number; principal: number }[];
};

const PALETTE = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#65a30d",
] as const;

export function useBalanceChartData({
  selectedFunds,
  monthly,
  years,
  initial,
  rateMode,
  customAnnualReturn,
  isCompact,
}: {
  selectedFunds: Fund[];
  monthly: number;
  years: number;
  initial: number;
  rateMode: "fund" | "custom";
  customAnnualReturn: number;
  isCompact: boolean;
}) {
  const series: Series[] = useMemo(() => {
    if (selectedFunds.length === 0) return [];
    return selectedFunds
      .map((f) => {
        const annualReturn =
          rateMode === "custom" ? customAnnualReturn : getFundReferenceReturn(f);
        const s = simulateSeries({
          monthly,
          years,
          initial,
          annualReturn,
          expenseRatio: f.expenseRatio,
        });
        return { fund: f, points: s.points };
      })
      .filter(Boolean) as Series[];
  }, [customAnnualReturn, initial, monthly, rateMode, selectedFunds, years]);

  const colorByFundId = useMemo(() => {
    const map: Record<string, string> = {};
    series.forEach((s, idx) => {
      map[s.fund.id] = PALETTE[idx % PALETTE.length];
    });
    return map;
  }, [series]);

  const months = years * 12;
  const data = useMemo(() => {
    if (series.length === 0) return [];
    return Array.from({ length: months + 1 }, (_, i) => {
      const row: Record<string, any> = { month: i, year: Math.floor(i / 12) };

      for (const s of series) {
        row[s.fund.id] = s.points[i]?.balance ?? null;
      }

      // ✅ 元本ライン（共通条件なので1本でOK）
      row["principal"] = series[0]?.points[i]?.principal ?? null;

      // ✅ 最大利益塗り用（profit/loss）
      const p = row["principal"];
      for (const s of series) {
        const bal = row[s.fund.id];
        row[`${s.fund.id}__profit`] =
          typeof bal === "number" && typeof p === "number" ? Math.max(bal - p, 0) : null;
        row[`${s.fund.id}__loss`] =
          typeof bal === "number" && typeof p === "number" ? Math.max(p - bal, 0) : null;
      }

      return row;
    });
  }, [months, series]);

  const finalRow = data.length > 0 ? data[data.length - 1] : undefined;
  const maxFundIdAtFinal = useMemo(() => {
    let bestId: string | null = null;
    let bestVal = -Infinity;
    for (const s of series) {
      const v = finalRow?.[s.fund.id];
      if (typeof v === "number" && v > bestVal) {
        bestVal = v;
        bestId = s.fund.id;
      }
    }
    return bestId;
  }, [finalRow, series]);

  const maxFundColor = maxFundIdAtFinal ? colorByFundId[maxFundIdAtFinal] ?? "#2563eb" : "#2563eb";
  const maxFundName =
    maxFundIdAtFinal ? series.find((s) => s.fund.id === maxFundIdAtFinal)?.fund.name ?? "" : "";

  const profitFillKey = maxFundIdAtFinal ? `${maxFundIdAtFinal}__profit` : null;

  // ✅ X軸：スマホ(狭い)は 0 / 中間 / 最終 の3点に固定（読めること優先）
  const xTicks = useMemo(() => {
    const last = years * 12;
    if (isCompact) {
      const mid = Math.round((years / 2) * 12);
      const arr = [0, mid, last].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
      return arr;
    }

    // PC：〜15y=1年、〜30y=2年、以降=5年
    const yearStep = years <= 15 ? 1 : years <= 30 ? 2 : 5;
    const arr: number[] = [];
    for (let y = 0; y <= years; y += yearStep) arr.push(y * 12);
    if (arr[arr.length - 1] !== last) arr.push(last);
    return arr;
  }, [isCompact, years]);

  return {
    series,
    data,
    colorByFundId,
    maxFundIdAtFinal,
    maxFundName,
    maxFundColor,
    profitFillKey,
    xTicks,
  };
}