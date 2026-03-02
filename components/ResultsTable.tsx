// components/ResultsTable.tsx

"use client";

import { Fund } from "@/lib/types";
import { formatJPY, formatPercent } from "@/lib/format";
import { simulate, compareNisaVsTaxable } from "@/lib/calc";
import BestFundCard from "@/components/BestFundCard";
import { useMemo } from "react";

type Row = {
  fund: Fund;
  annualReturn: number;
  expenseRatio: number;

  // NISA（非課税）
  finalValue: number;
  principal: number;
  profit: number;
  multiple: number;

  // 課税口座比較（v1.1 神機能）
  taxableFinalValue: number;
  nisaBenefit: number;
};

type Props = {
  selectedFunds: Fund[];
  monthly: number;
  years: number;
  initial: number;
  rateMode: "fund" | "custom";
  customAnnualReturn: number; // 小数（例：0.07）

  // v1.1: 課税比較用（デフォルトは日本の代表税率 20.315%）
  taxRate?: number; // 小数（例：0.20315）
};

export default function ResultsTable({
  selectedFunds,
  monthly,
  years,
  initial,
  rateMode,
  customAnnualReturn,
  taxRate = 0.20315,
}: Props) {
  const rows: Row[] = useMemo(() => {
    return selectedFunds.map((f) => {
      const annualReturn = rateMode === "custom" ? customAnnualReturn : f.ref_return;

      // 既存：NISA想定の結果
      const result = simulate({
        monthly,
        years,
        initial,
        annualReturn,
        expenseRatio: f.expense_ratio,
      });

      // v1.1：課税口座（売却時課税の近似）と比較
      const comp = compareNisaVsTaxable(
        {
          monthly,
          years,
          initial,
          annualReturn,
          expenseRatio: f.expense_ratio,
        },
        taxRate,
      );

      return {
        fund: f,
        annualReturn,
        expenseRatio: f.expense_ratio,

        finalValue: result.finalValue,
        principal: result.principal,
        profit: result.profit,
        multiple: result.multiple,

        taxableFinalValue: comp.taxableFinalValue,
        nisaBenefit: comp.nisaBenefit,
      };
    });
  }, [customAnnualReturn, initial, monthly, rateMode, selectedFunds, taxRate, years]);

  // ✅ 比較の結論を最速化：総資産額で降順ソート
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => b.finalValue - a.finalValue);
  }, [rows]);

  const bestFinalValue = sorted.length > 0 ? sorted[0].finalValue : null;
  const totalLabel = `${years}年後の総資産額`;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-lg font-semibold">比較結果</div>
        <div className="text-sm text-slate-600">条件を変えるとリアルタイムに更新</div>
        <div className="mt-1 text-xs text-slate-500">
          ※「NISAの節税額」は、同じ運用結果を課税口座で売却した場合（利益に税率{formatPercent(taxRate, 2)}）に
+          発生する税金を回避できる目安です。
        </div>
      </div>

      {/* ✅ Mobile：テーブルは捨てて「結論が速い」ランキングカード */}
      <div className="grid gap-2 md:hidden">
        {sorted.length === 0 ? (
          <div className="rounded-xl border bg-white px-4 py-8 text-center text-sm text-slate-600">
            左の一覧からファンドを選んでください
          </div>
        ) : (
          sorted.map((r, idx) => {
            const diffToBest =
              typeof bestFinalValue === "number" ? r.finalValue - bestFinalValue : 0;
            const isBest = idx === 0;
            const benefitIsPositive = r.nisaBenefit >= 0;
            const profitIsPositive = r.profit >= 0;

            return (
              <details
                key={r.fund.id}
                className={[
                  "rounded-xl border bg-white p-3",
                  isBest ? "ring-1 ring-emerald-200 bg-emerald-50/40" : "",
                ].join(" ")}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <div
                        className={[
                          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                          isBest ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700",
                        ].join(" ")}
                      >
                        {idx + 1}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0 truncate font-semibold text-slate-900">
                          {r.fund.name}
                        </div>
                        {isBest ? (
                          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                            最も増える
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 grid gap-1">
                        <div className="text-xs text-slate-600">{totalLabel}</div>
                        <div className="text-2xl font-extrabold tabular-nums text-slate-900">
                          {formatJPY(r.finalValue)}
                        </div>
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                          <div className={`tabular-nums ${profitIsPositive ? "text-slate-900" : "text-rose-700"}`}>
                            増えた額 {formatJPY(r.profit)}
                          </div>
                          {!isBest ? (
                            <div className="tabular-nums text-slate-700">
                              1位との差{" "}
                              {diffToBest === 0
                                ? "±0円"
                                : `${diffToBest > 0 ? "+" : ""}${Math.round(diffToBest).toLocaleString()}円`}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600">
                        <span className="rounded-md bg-slate-50 px-2 py-1 ring-1 ring-slate-200">
                          管理費用 {formatPercent(r.expenseRatio, 5)}
                        </span>
                        <span
                          className={[
                            "rounded-md px-2 py-1 ring-1",
                            benefitIsPositive
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                              : "bg-slate-50 text-slate-600 ring-slate-200",
                          ].join(" ")}
                        >
                          NISAの節税額 {formatJPY(r.nisaBenefit)}
                        </span>
                      </div>

                      <div className="mt-2 text-xs font-semibold text-slate-700">
                        詳細を表示
                      </div>
                    </div>
                  </div>
                </summary>

                {/* 詳細：上級者の納得感（透明性） */}
                <div className="mt-3 grid gap-2 rounded-lg bg-white/70 p-3 ring-1 ring-slate-200">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <div className="text-slate-600">使用年率</div>
                    <div className="tabular-nums text-slate-900">
                      {formatPercent(r.annualReturn, 2)}
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <div className="text-slate-600">管理費用</div>
                    <div className="tabular-nums text-slate-900">
                      {formatPercent(r.expenseRatio, 5)}
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <div className="text-slate-600">NISAの節税額</div>
                    <div className={`tabular-nums font-semibold ${benefitIsPositive ? "text-emerald-700" : "text-slate-700"}`}>
                      {formatJPY(r.nisaBenefit)}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    ※ 詳細は「比較の納得感」のために表示しています（結論は上の総資産額）。
                  </div>
                </div>
              </details>
            );
          })
        )}
      </div>

      {/* ✅ PC：テーブル（列を絞って読みやすく） */}
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-slate-50 text-left text-slate-700">
            <tr>
              <th className="w-[340px] px-3 py-2">ファンド</th>
              <th className="px-3 py-2">{totalLabel}</th>
              <th className="px-3 py-2">増えた額</th>
              <th className="px-3 py-2">1位との差</th>
              <th className="px-3 py-2">管理費用</th>
              <th className="px-3 py-2">NISAの節税額</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => {
              const isBest = idx === 0;
              const benefitIsPositive = r.nisaBenefit >= 0;
              const profitIsPositive = r.profit >= 0;
              const diffToBest =
                typeof bestFinalValue === "number" ? r.finalValue - bestFinalValue : 0;

              return (
                <tr
                  key={r.fund.id}
                  className={[
                    "border-t hover:bg-slate-50/60",
                    isBest ? "bg-emerald-50/30" : "",
                  ].join(" ")}
                >
                  <td className="px-3 py-2 font-medium text-slate-900">
                    <div className="min-w-0 truncate">{r.fund.name}</div>
                  </td>

                  <td className="px-3 py-2 tabular-nums text-slate-900">
                    {formatJPY(r.finalValue)}
                  </td>

                  <td className={`px-3 py-2 tabular-nums ${profitIsPositive ? "text-slate-900" : "text-rose-700"}`}>
                    {formatJPY(r.profit)}
                  </td>

                  <td className="px-3 py-2 tabular-nums text-slate-800">
                    {isBest
                      ? "—"
                      : diffToBest === 0
                        ? "±0円"
                        : `${diffToBest > 0 ? "+" : ""}${Math.round(diffToBest).toLocaleString()}円`}
                  </td>

                  <td className="px-3 py-2 tabular-nums text-slate-800">
                    {formatPercent(r.expenseRatio, 5)}
                  </td>

                  <td className={`px-3 py-2 tabular-nums font-semibold ${benefitIsPositive ? "text-emerald-700" : "text-slate-600"}`}>
                    {formatJPY(r.nisaBenefit)}
                  </td>
                </tr>
              );
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-600">
                  左の一覧からファンドを選んでください
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}