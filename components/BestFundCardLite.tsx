// components/BestFundCardLite.tsx

"use client";

import type { Fund } from "@/lib/types";

type Props = {
  fund: Fund;
  finalValue: number;
  years: number;
  monthly: number;
  initial: number;
  rateMode: "fund" | "custom";
  customAnnualReturn: number;
  onOpenInput: () => void;
};

function formatMonthlyLabel(value: number): string {
  if (value >= 10000) {
    const man = Math.floor(value / 10000);
    const sen = (value % 10000) / 1000;
    if (sen === 0) return `${man}万円`;
    return `${man}万${sen}千円`;
  }
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatInitialLabel(value: number): string {
  if (value >= 10000) {
    const man = value / 10000;
    if (Number.isInteger(man)) return `${man.toLocaleString("ja-JP")}万円`;
    return `${man.toFixed(1).replace(/\.0$/, "")}万円`;
  }
  return `${value.toLocaleString("ja-JP")}円`;
}

function formatAnnualReturnLabel(
  rateMode: "fund" | "custom",
  customAnnualReturn: number
): string {
  if (rateMode === "fund") return "年率はファンド別";
  const percent = Number.isFinite(customAnnualReturn)
    ? (customAnnualReturn * 100).toFixed(1)
    : "-";
  return `年率${percent}%`;
}

function formatFinalValueInManen(value: number): string {
  const man = Math.round(value / 10000);
  return `${man.toLocaleString("ja-JP")}万円`;
}

export default function BestFundCardLite({
  fund,
  finalValue,
  years,
  monthly,
  initial,
  rateMode,
  customAnnualReturn,
  onOpenInput,
}: Props) {
  const monthlyLabel = formatMonthlyLabel(monthly);
  const annualReturnLabel = formatAnnualReturnLabel(rateMode, customAnnualReturn);

  const conditionParts = [`月${monthlyLabel}`, `${years}年`, annualReturnLabel];
  if (initial > 0) {
    conditionParts.splice(2, 0, `初期${formatInitialLabel(initial)}`);
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center shadow-sm sm:px-5 sm:py-6">
      <div className="text-[15px] font-semibold text-amber-600">
        🏆 この条件のベストファンド
      </div>

      <div className="mt-2 text-[15px] font-semibold leading-snug text-slate-900 sm:text-[16px]">
        {fund.name}
      </div>

      <div className="mt-5 text-[15px] text-slate-700 sm:text-[16px]">
        {years}年後：
        <span className="block mt-2 text-[40px] font-bold leading-none tracking-[-0.03em] text-slate-950 sm:text-[52px]">
          {" "}
          {formatFinalValueInManen(finalValue)}
        </span>
      </div>

      <div className="mt-5 text-sm text-slate-600">
        （条件：{conditionParts.join(" / ")}）
      </div>

      <button
        type="button"
        onClick={onOpenInput}
        className="mt-6 text-[15px] font-semibold text-slate-900 transition hover:text-slate-700"
      >
        👇 条件を変えてシミュレーション
      </button>
    </div>
  );
}