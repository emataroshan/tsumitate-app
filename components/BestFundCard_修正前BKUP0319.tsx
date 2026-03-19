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
  rateMode: "fund" | "custom";
  expenseRatio: number; // 小数 (例: 0.000814)
  feeDrag: number; // 手数料が最終評価額に与える差分（概算）
};

export default function BestFundCard({
  fund,
  finalValue,
  principal,
  profit,
  benefit,
  years,
  rateMode,
  expenseRatio,
  feeDrag,
}: Props) {
  const profitIsPositive = profit >= 0;
  const expenseRatioPct = (expenseRatio * 100).toFixed(3);
  const hasDetails = feeDrag > 0 || benefit > 0;

  return (
    <div className="mx-auto box-border w-full max-w-3xl overflow-hidden rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 shadow-sm lg:max-w-none">
      <div className="min-w-0">
        <div className="text-[11px] font-semibold tracking-wide text-emerald-700">つみたて比較アプリ</div>
        <div className="text-sm font-medium text-emerald-800">
          この条件のベストファンド
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <div className="min-w-0 text-lg font-semibold text-emerald-950 break-words">
            {fund.name}
          </div>
          <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
            🥇 ベスト
          </span>
        </div>
      </div>

      {/* 主役：最終評価額 */}
      <div className="mt-4">
        <div className="text-sm text-emerald-900">{years}年後の資産総額</div>
        <div className="text-4xl font-extrabold text-emerald-700 tracking-tight">
          {formatYen(finalValue)}
        </div>
      </div>

      {/* 補助：元本と損益（安心材料＋増えた実感） */}
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/70 p-3 ring-1 ring-emerald-200">
        <div>
          <div className="text-xs text-slate-600">増えた額</div>
          <div
            className={`mt-0.5 font-semibold tabular-nums ${
              profitIsPositive ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {profitIsPositive ? "+" : ""}
            {formatYen(profit)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-600">積立元本</div>
          <div className="mt-0.5 font-semibold tabular-nums text-slate-900">
            {formatYen(principal)}
          </div>
        </div>
      </div>

      {hasDetails && (
        <details className="mt-3 group rounded-xl bg-white/70 ring-1 ring-emerald-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-sm font-semibold text-emerald-900 marker:content-none">
            <span>この結果の内訳</span>
            <span className="text-emerald-700 transition group-open:rotate-180">⌄</span>
          </summary>

          <div className="border-t border-emerald-100 px-3 pb-3 pt-3">
            <div className="grid gap-3">
              {feeDrag > 0 && (
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-600">💸手数料で減る金額（概算）</div>
                    <div className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-emerald-200">
                      手数料 {expenseRatioPct}%/年
                    </div>
                  </div>
                  <div className="mt-0.5 font-semibold tabular-nums text-slate-900">
                    −{formatYen(feeDrag)}
                  </div>
                </div>
              )}

              {benefit > 0 && (
                <div>
                  <div className="text-xs text-slate-600">NISAの節税額（目安）</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-slate-900">
                    {formatYen(benefit)}
                  </div>
                </div>
              )}

              <div className="space-y-1 text-[11px] text-slate-500">
                <div>※非課税枠（1800万円）内での運用を前提とした試算です</div>
                <div>※将来のリターンを保証するものではありません</div>
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}