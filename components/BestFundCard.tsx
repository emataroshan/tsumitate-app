// components/BestFundCard.tsx

"use client";

import { Fund } from "@/lib/types";
import { formatJPY } from "@/lib/format";

type Props = {
  fund: Fund;
  finalValue: number;
  principal: number;
  profit: number;
  benefit: number; // NISAで払わずに済む税金（目安）
  monthly: number;
  years: number;
  rateMode: "fund" | "custom";
  annualReturn: number; // 小数 (例: 0.05)
  effectiveAnnualReturn: number; // 概算: annualReturn - expenseRatio
  expenseRatio: number; // 小数 (例: 0.000814)
  feeDrag: number; // 管理費用が最終評価額に与える差分（概算）
};

export default function BestFundCard({
  fund,
  finalValue,
  principal,
  profit,
  benefit,
  monthly,
  years,
  rateMode,
  annualReturn,
  effectiveAnnualReturn,
  expenseRatio,
  feeDrag,
}: Props) {
  const profitIsPositive = profit >= 0;
  const expenseRatioPct = (expenseRatio * 100).toFixed(3);
  const annualReturnPct = (annualReturn * 100).toFixed(1);
  const showFeeStory = rateMode === "custom";

  return (
    <div className="max-w-full rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 shadow-sm">
      {/* Header: gridにして「横に押し出せない」構造へ */}
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <div className="text-sm font-medium text-emerald-800">
            この条件で最も資産が増えるファンド
          </div>
          <div className="mt-0.5 text-lg font-semibold text-emerald-950 break-words">
            {fund.name}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="max-w-full break-words rounded-full bg-white/70 px-2 py-0.5 ring-1 ring-emerald-200">
              毎月 {formatJPY(monthly)}
            </span>
            <span className="max-w-full break-words rounded-full bg-white/70 px-2 py-0.5 ring-1 ring-emerald-200">
              想定年率 {annualReturnPct}%
            </span>
          </div>
        </div>

        {/* 税金差額は“補助”として右上に（狭幅では必ず次行で全幅） */}
        {benefit > 0 && (
          <div className="min-w-0">
            <div className="w-full max-w-full whitespace-normal break-all rounded-lg sm:rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200 sm:w-auto">
              NISAメリット（節税推定額）：{formatJPY(benefit)}
            </div>
          </div>
        )}
      </div>

      {/* 主役：最終評価額 */}
      <div className="mt-4">
        <div className="text-sm text-emerald-900">{years}年後の資産総額</div>
        <div className="text-4xl font-extrabold text-emerald-700 tracking-tight">
          {formatJPY(finalValue)}
        </div>
        <div className="mt-1 text-xs text-slate-600">
          {showFeeStory
            ? "共通年率のため、手数料が低いほど将来の資産総額が増えやすいです"
            : "参考年率と手数料を加味した結果、このファンドが最も増える試算です"}
        </div>
      </div>

      {/* 補助：元本と損益（安心材料＋増えた実感） */}
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white/70 p-3 ring-1 ring-emerald-200">
        <div>
          <div className="text-xs text-slate-600">積立元本</div>
          <div className="mt-0.5 font-semibold tabular-nums text-slate-900">
            {formatJPY(principal)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-600">増えた額</div>
          <div
            className={`mt-0.5 font-semibold tabular-nums ${
              profitIsPositive ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {profitIsPositive ? "+" : ""}
            {formatJPY(profit)}
          </div>
        </div>
      </div>

      {feeDrag > 0 && (
        <div className="mt-2 rounded-xl bg-white/70 p-3 ring-1 ring-emerald-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs text-slate-600">手数料で減る金額（{years}年間・概算）</div>
            <div className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-emerald-200">
              管理費用 {expenseRatioPct}%/年
            </div>
          </div>
          <div className="mt-0.5 font-semibold tabular-nums text-slate-900">
            −{formatJPY(feeDrag)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            ※手数料は毎年かかるため、長期ほど差が広がります
          </div>
          <div className="mt-1 text-[11px] text-slate-500">※「管理費用0%」のケースとの差（概算）</div>
        </div>
      )}

      <div className="mt-2 text-xs text-slate-500">
        ※非課税枠（1800万円）内での運用を前提とした試算です（将来のリターンを保証するものではありません）
      </div>
    </div>
  );
}