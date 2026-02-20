// components/ResultsTable.tsx

"use client";

import { Fund } from "@/lib/types";
import { formatJPY, formatPercent } from "@/lib/format";
import { simulate } from "@/lib/calc";

type Row = {
  fund: Fund;
  annualReturn: number;
  expenseRatio: number;
  finalValue: number;
  principal: number;
  profit: number;
  multiple: number;
};

type Props = {
  selectedFunds: Fund[];
  monthly: number;
  years: number;
  initial: number;
  rateMode: "fund" | "custom";
  customAnnualReturn: number; // 小数（例：0.07）
};

export default function ResultsTable({ selectedFunds, monthly, years, initial, rateMode, customAnnualReturn }: Props) {
  const rows: Row[] = selectedFunds.map((f) => {
    const annualReturn = rateMode === "custom" ? customAnnualReturn : f.ref_return;

    const result = simulate({
      monthly,
      years,
      initial,
      annualReturn,
      expenseRatio: f.expense_ratio,
    });

    return {
      fund: f,
      annualReturn,
      expenseRatio: f.expense_ratio,
      finalValue: result.finalValue,
      principal: result.principal,
      profit: result.profit,
      multiple: result.multiple,
    };
  });

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-lg font-semibold">比較結果</div>
        <div className="text-sm text-slate-600">
          条件を変えるとリアルタイムに更新
        </div>
      </div>

      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-700">
            <tr>
              <th className="px-3 py-2">ファンド</th>
              <th className="px-3 py-2">使用年率</th>
              <th className="px-3 py-2">管理費用</th>
              <th className="px-3 py-2">最終評価額</th>
              <th className="px-3 py-2">元本</th>
              <th className="px-3 py-2">損益</th>
              <th className="px-3 py-2">回収倍率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.fund.id} className="border-t hover:bg-slate-50/60">
                <td className="px-3 py-2 font-medium text-slate-900">{r.fund.name}</td>
                <td className="px-3 py-2 text-slate-800">
                   {formatPercent(r.annualReturn, 2)}
                </td>
                <td className="px-3 py-2 text-slate-800">{formatPercent(r.expenseRatio, 4)}</td>
                <td className="px-3 py-2 text-slate-900">{formatJPY(r.finalValue)}</td>
                <td className="px-3 py-2 text-slate-800">{formatJPY(r.principal)}</td>
                <td className="px-3 py-2 text-slate-900">{formatJPY(r.profit)}</td>
                <td className="px-3 py-2 text-slate-800">
                  {r.multiple.toFixed(2)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-slate-600">
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