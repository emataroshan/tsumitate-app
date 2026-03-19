// components/BestFundCard.tsx

"use client";

import { Fund } from "@/lib/types";
import { formatYen } from "@/lib/format";

type Props = {
  fund: Fund;
  finalValue: number;
  principal: number;
  profit: number;
  benefit: number; // NISAで払わずに済む税金（目安）
  years: number;
  monthly: number;
  annualRatePercent: number;
  rateMode: "fund" | "custom";
  expenseRatio: number; // 小数 (例: 0.000814)
  feeDrag: number; // 手数料が最終評価額に与える差分（概算）
  secondDiff: number | null; // 2位との差額
};

export default function BestFundCard({
  fund,
  finalValue,
  principal,
  profit,
  benefit,
  years,
  monthly,
  annualRatePercent,
  rateMode,
  expenseRatio,
  feeDrag,
  secondDiff,
}: Props) {
  const profitIsPositive = profit >= 0;
  const expenseRatioPct = (expenseRatio * 100).toFixed(3);
  const hasDetails = feeDrag > 0 || benefit > 0;
  const annualRateLabel = annualRatePercent.toFixed(1);

  function formatMonthlyLabel(value: number): string {
    if (value >= 10000) {
      const man = Math.floor(value / 10000);
      const sen = (value % 10000) / 1000;
      if (sen === 0) return `${man}万円`;
      return `${man}万${sen}千円`;
    }
    return `${value.toLocaleString("ja-JP")}円`;
  }

  const monthlyLabel = formatMonthlyLabel(monthly);

  return (
    <div className="mx-auto box-border w-full max-w-3xl overflow-hidden rounded-[28px] border border-emerald-200 bg-emerald-50/70 p-5 shadow-[0_8px_30px_rgba(16,185,129,0.08)] lg:max-w-none sm:p-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-start gap-2">
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] text-white shadow-sm">
            🏆 BEST
          </span>
          <div className="min-w-0 flex-1">
            <div className="break-words text-[18px] font-medium leading-tight text-emerald-950 sm:text-[20px]">
              {fund.name}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-[15px] font-medium text-emerald-900">
          毎月{monthlyLabel} × {years}年
        </div>
        <div className="mt-1 text-[48px] font-bold tracking-[-0.03em] text-emerald-700 sm:text-[56px]">
          {formatYen(finalValue)}
        </div>
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium text-slate-600">貯金より</div>
        <div
          className={`mt-1 text-[28px] font-semibold tracking-[-0.03em] tabular-nums ${
            profitIsPositive ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {profitIsPositive ? "+" : ""}
          {formatYen(profit)}増
        </div>
      </div>

      {hasDetails ? (
        <details className="mt-6 group border-t border-emerald-100 pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:content-none">
            <div className="text-[14px] text-slate-700">
              <span className="text-slate-500">手数料 </span>
              <span className="font-medium tabular-nums">{expenseRatioPct}%</span>
              <span className="text-slate-500"> / 年</span>
            </div>
            <span className="text-[14px] font-medium text-slate-500 transition hover:text-slate-700">
              計算の前提 ⓘ
            </span>
          </summary>

          <div className="mt-4 rounded-2xl bg-white/80 p-4 ring-1 ring-emerald-100 backdrop-blur">
            <div className="space-y-3">
              <div className="space-y-2 text-[14px] text-slate-700">
                <div>
                  <span className="text-slate-500">想定年率 </span>
                  <span className="font-medium tabular-nums text-slate-900">
                    {annualRateLabel}%
                  </span>
                </div>

                <div>
                  <span className="text-slate-500">投資元本 </span>
                  <span className="font-medium tabular-nums text-slate-900">
                    {formatYen(principal)}
                  </span>
                </div>

                {secondDiff !== null && (
                  <div>
                    <span className="text-slate-500">2位との差 </span>
                      <span className="font-semibold tabular-nums text-emerald-700">
                      {formatYen(secondDiff)}
                    </span>
                  </div>
                )}

                {feeDrag > 0 && (
                  <div>
                    <span className="text-slate-500">手数料で減る金額 </span>
                    <span className="font-medium tabular-nums text-slate-900">
                      −{formatYen(feeDrag)}
                    </span>
                  </div>
                )}

                {benefit > 0 && (
                  <div>
                    <span className="text-slate-500">NISAの節税額 </span>
                    <span className="font-medium tabular-nums text-slate-900">
                      {formatYen(benefit)}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1 pt-1 text-[11px] text-slate-500">
                <div className="text-[11px] text-emerald-700/80">
                  手数料まで考慮したシミュレーション
                </div>
                <div>※非課税枠（1800万円）内での運用を前提とした試算です</div>
                <div>※将来のリターンを保証するものではありません</div>
              </div>
            </div>
          </div>
        </details>
      ) : (
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-emerald-100 pt-4">
          <div className="text-[14px] text-slate-700">
            <span className="text-slate-500">手数料 </span>
            <span className="font-medium tabular-nums">{expenseRatioPct}%</span>
            <span className="text-slate-500"> / 年</span>
          </div>
        </div>
      )}
    </div>
  );
}