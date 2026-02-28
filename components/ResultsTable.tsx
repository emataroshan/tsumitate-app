// components/ResultsTable.tsx

"use client";

import { Fund } from "@/lib/types";
import { formatJPY, formatPercent } from "@/lib/format";
import { simulate, compareNisaVsTaxable } from "@/lib/calc";
import BestFundCard from "@/components/BestFundCard";

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
  const rows: Row[] = selectedFunds.map((f) => {
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
      taxRate
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

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-lg font-semibold">比較結果</div>
        <div className="text-sm text-slate-600">条件を変えるとリアルタイムに更新</div>
        <div className="mt-1 text-xs text-slate-500">
          ※「損失回避額」は、同じ運用結果を課税口座で売却した場合（利益に税率{formatPercent(taxRate, 2)}）に
+          発生する税金を回避できる目安です。
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-slate-50 text-left text-slate-700">
            <tr>
              <th className="px-3 py-2 w-[260px]">ファンド</th>
              <th className="px-3 py-2">使用年率</th>
              <th className="px-3 py-2">管理費用</th>

              <th className="px-3 py-2">最終評価額</th>
              <th className="px-3 py-2">元本</th>
              <th className="px-3 py-2">損益</th>
              <th className="px-3 py-2">回収倍率</th>

              {/* v1.1 神機能 */}
              <th className="px-3 py-2">損失回避額</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const benefitIsPositive = r.nisaBenefit >= 0;
              const profitIsPositive = r.profit >= 0;

              return (
                <tr key={r.fund.id} className="border-t hover:bg-slate-50/60">
                  <td className="px-3 py-2 font-medium text-slate-900 break-words">
                    {r.fund.name}
                  </td>

                  <td className="px-3 py-2 text-slate-800">{formatPercent(r.annualReturn, 2)}</td>
                  <td className="px-3 py-2 text-slate-800">{formatPercent(r.expenseRatio, 5)}</td>

                  <td className="px-3 py-2 text-slate-900">{formatJPY(r.finalValue)}</td>
                  <td className="px-3 py-2 text-slate-800">{formatJPY(r.principal)}</td>

                  <td className={`px-3 py-2 ${profitIsPositive ? "text-slate-900" : "text-rose-700"}`}>
                    {formatJPY(r.profit)}
                  </td>

                  <td className="px-3 py-2 text-slate-800">{r.multiple.toFixed(2)}</td>

                  {/* v1.1 神機能：差分を強調 */}
                  <td className={`px-3 py-2 font-semibold ${benefitIsPositive ? "text-emerald-700" : "text-slate-600"}`}>
                    {formatJPY(r.nisaBenefit)}
                  </td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-slate-600">
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