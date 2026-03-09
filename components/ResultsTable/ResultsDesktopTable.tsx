// components/ResultsTable/ResultsDesktopTable.tsx

"use client";

import { formatYen, formatPercent } from "@/lib/format";
import { Fragment, useState } from "react";

export default function ResultsDesktopTable({
  sorted,
  bestFinalValue,
  years,
}: any) {

  const totalLabel = `${years}年後の総資産額`;
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="overflow-x-auto rounded-xl border">

      <table className="w-full table-fixed text-sm">

        <thead className="bg-slate-50 text-left text-slate-700">

          <tr>

            <th className="px-3 py-2 w-[340px]">
              ファンド
            </th>

            <th className="px-3 py-2">
              {totalLabel}
            </th>

            <th className="px-3 py-2">
              1位との差
            </th>

            <th className="px-3 py-2">
              増えた額
            </th>

            <th className="px-3 py-2">
              NISAの節税額
            </th>

          </tr>

        </thead>

        <tbody>

          {sorted.map((r: any, idx: number) => {

            const isBest = idx === 0;

            const diff = r.finalValue - bestFinalValue;
            const isOpen = openId === r.fund.id;

            return (
              <Fragment key={r.fund.id}>
                <tr
                  className={[
                    "border-t hover:bg-slate-50/60",
                    isBest ? "bg-emerald-50/30" : "",
                  ].join(" ")}
                >
                  <td className="px-3 py-2 font-medium text-slate-900">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 truncate">{r.fund.name}</div>
                      {isBest ? (
                        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                          🥇 ベスト
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="mt-1 text-xs font-semibold text-slate-700 underline-offset-2 hover:underline"
                      onClick={() => setOpenId((prev) => (prev === r.fund.id ? null : r.fund.id))}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? "詳細を閉じる" : "詳細（管理費用・使用年率）"}
                    </button>
                  </td>

                  <td className="px-3 py-2 font-semibold tabular-nums text-slate-900">
                    {formatYen(r.finalValue)}
                  </td>

                  <td className="px-3 py-2 tabular-nums text-slate-800">
                    {isBest ? "—" : formatYen(diff)}
                  </td>

                  <td className="px-3 py-2 tabular-nums text-slate-900">
                    {formatYen(r.profit)}
                  </td>

                  <td className="px-3 py-2 font-semibold tabular-nums text-emerald-700">
                    {formatYen(r.nisaBenefit)}
                  </td>
                </tr>

                {isOpen ? (
                  <tr className="border-t bg-white">
                    <td colSpan={5} className="px-3 py-3">
                      <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="text-xs text-slate-600">使用年率</div>
                          <div className="text-sm tabular-nums text-slate-900">
                            {formatPercent(r.annualReturn, 2)}
                          </div>
                        </div>
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="text-xs text-slate-600">管理費用</div>
                          <div className="text-sm tabular-nums text-slate-900">
                            {formatPercent(r.expenseRatio, 5)}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}

        </tbody>

      </table>

    </div>
  );
}
