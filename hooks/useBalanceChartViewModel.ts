// hooks/useBalanceChartViewModel.ts
"use client";

import { useMemo } from "react";

type SnapshotRow = {
  id: string;
  name: string;
  color: string;
  balance: number | null;
  profit: number | null;
};

type RankedFundRow = {
  rank: number;
  id: string;
  name: string;
  color: string;
};

export function useBalanceChartViewModel({
  series,
  data,
  colorByFundId,
  activeIndex,
  maxFundIdAtFinal,
  selectedFundId,
}: {
  series: { fund: { id: string; name: string } }[];
  data: any[];
  colorByFundId: Record<string, string>;
  activeIndex: number;
  maxFundIdAtFinal: string | null;
  selectedFundId: string | null;
}) {
  const safeIndex = Math.min(Math.max(activeIndex, 0), Math.max(data.length - 1, 0));
  const activeRow = data[safeIndex];

  const activeYears = Math.floor(safeIndex / 12);
  const activeMonths = safeIndex % 12;
  const activePointLabel = `${activeYears}年${activeMonths === 0 ? "" : `${activeMonths}ヶ月`}時点`;
  const activePrincipal = activeRow?.principal;

  const fmtYen = (v: any) => (typeof v === "number" ? `${Math.round(v).toLocaleString()}円` : "-");

  const snapshot: SnapshotRow[] = useMemo(() => {
    const p = activePrincipal;
    return series.map((s) => {
      const bal = activeRow?.[s.fund.id];
      const profit = typeof bal === "number" && typeof p === "number" ? bal - p : null;
      return {
        id: s.fund.id,
        name: s.fund.name,
        color: colorByFundId[s.fund.id],
        balance: typeof bal === "number" ? bal : null,
        profit,
      };
    });
  }, [activePrincipal, activeRow, colorByFundId, series]);

  const selectedSnapshot = useMemo(() => {
    const targetId = selectedFundId ?? maxFundIdAtFinal;
    if (!targetId) return null;
    return snapshot.find((s) => s.id === targetId) ?? null;
  }, [maxFundIdAtFinal, selectedFundId, snapshot]);

  const topRankedFunds: RankedFundRow[] = useMemo(() => {
    const finalRow = data[data.length - 1];
    if (!finalRow) return [];

    return series
      .map((s) => ({
        id: s.fund.id,
        name: s.fund.name,
        color: colorByFundId[s.fund.id],
        balance: typeof finalRow[s.fund.id] === "number" ? finalRow[s.fund.id] : -Infinity,
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 3)
      .map((row, index) => ({
        rank: index + 1,
        id: row.id,
        name: row.name,
        color: row.color,
      }));
  }, [colorByFundId, data, series]);

  return {
    safeIndex,
    activeRow,
    activePointLabel,
    activePrincipal,
    fmtYen,
    snapshot,
    selectedSnapshot,
    topRankedFunds,
  };
}
