// components/ResultsTable/ResultsMobileCards.tsx

"use client";

import { formatJPY, formatPercent } from "@/lib/format";

export default function ResultsMobileCards({
  sorted,
  bestFinalValue,
  years,
}: any) {
  const totalLabel = `${years}年後の総資産額`;

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border bg-white px-4 py-8 text-center text-sm text-slate-600">
        左の一覧からファンドを選んでください
      </div>
    );
  }

  return (
    <>
      {sorted.map((r: any, idx: number) => {
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

              {/* header */}

              <div className="flex items-start gap-3">

                {/* rank */}

                <div className="mt-0.5 shrink-0">
                  <div
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      isBest
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-700",
                    ].join(" ")}
                  >
                    {idx + 1}
                  </div>
                </div>

                <div className="min-w-0 flex-1">

                  {/* fund name */}

                  <div className="flex items-center gap-2">
                    <div className="truncate font-semibold text-slate-900">
                      {r.fund.name}
                    </div>

                    {isBest && (
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        🥇 ベスト
                      </span>
                    )}
                  </div>

                  {/* main value */}

                  <div className="mt-2">
                    <div className="text-xs text-slate-600">
                      {totalLabel}
                    </div>

                    <div className="text-2xl font-extrabold tabular-nums">
                      {formatJPY(r.finalValue)}
                    </div>
                  </div>

                  {/* diff -> profit（PCと順番を揃える） */}
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                    {!isBest ? (
                      <span className="tabular-nums text-slate-700">
                        1位との差 {formatJPY(diffToBest)}
                      </span>
                    ) : (
                      <span className="text-slate-500">1位との差 —</span>
                    )}

                    <span
                      className={[
                        "tabular-nums",
                        profitIsPositive ? "text-slate-900" : "text-rose-700",
                      ].join(" ")}
                    >
                      増えた額 {formatJPY(r.profit)}
                    </span>
                  </div>

                  {/* only tax benefit visible */}

                  <div className="mt-2">

                    <span
                      className={[
                        "rounded-md px-2 py-1 text-xs ring-1",
                        benefitIsPositive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-50 text-slate-600 ring-slate-200",
                      ].join(" ")}
                    >
                      NISAの節税額 {formatJPY(r.nisaBenefit)}
                    </span>

                  </div>

                  {/* detail label */}

                  <div className="mt-2 text-xs font-semibold text-slate-700">
                    詳細（管理費用・使用年率）
                  </div>

                </div>

              </div>

            </summary>

            {/* detail */}

            <div className="mt-3 grid gap-2 rounded-lg bg-white p-3 ring-1 ring-slate-200">

              <Row
                label="使用年率"
                value={formatPercent(r.annualReturn, 2)}
              />

              <Row
                label="管理費用"
                value={formatPercent(r.expenseRatio, 5)}
              />

            </div>

          </details>
        );
      })}
    </>
  );
}

function Row({ label, value, highlight }: any) {

  return (
    <div className="flex justify-between text-sm">

      <div className="text-slate-600">
        {label}
      </div>

      <div
        className={[
          "tabular-nums",
          highlight
            ? "font-semibold text-emerald-700"
            : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </div>

    </div>
  );
}
