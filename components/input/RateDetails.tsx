// components/input/RateDetails.tsx

"use client";

import Tooltip from "@/components/input/Tooltip";
import StepperButtons from "@/components/input/StepperButtons";

export default function RateDetails({
  rateMode,
  setRateMode,
  annualReturnPercentText,
  setAnnualReturnPercentText,
  onCommitAnnualReturnPercentText,
  onDecAnnualReturn,
  onIncAnnualReturn,
}: {
  rateMode: "fund" | "custom";
  setRateMode: (v: "fund" | "custom") => void;
  annualReturnPercentText: string;
  setAnnualReturnPercentText: (v: string) => void;
  onCommitAnnualReturnPercentText: (raw: string) => void;
  onDecAnnualReturn: () => void;
  onIncAnnualReturn: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm min-w-0">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">年率</div>
        <Tooltip
          id="rateMode"
          ariaLabel="年率モードの説明"
          text={
            "共通\nすべてのファンドを同じ年率で計算（公平に比較）。\n\n" +
            "ファンド別\n各ファンドの参考年率（過去5年のリターンベース）で計算。"
          }
        />
      </div>

      <div className="mt-2 rounded-2xl bg-white p-1 ring-1 ring-slate-200">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setRateMode("custom")}
            className={[
              "min-w-0 flex-1 rounded-2xl px-3 py-2 text-sm font-semibold",
              "truncate",
              rateMode === "custom"
                ? "bg-slate-900 text-white"
                : "bg-transparent text-slate-700 hover:bg-slate-50",
            ].join(" ")}
            aria-pressed={rateMode === "custom"}
          >
            共通
          </button>
          <button
            type="button"
            onClick={() => setRateMode("fund")}
            className={[
              "min-w-0 flex-1 rounded-2xl px-3 py-2 text-sm font-semibold",
              "truncate",
              rateMode === "fund"
                ? "bg-slate-900 text-white"
                : "bg-transparent text-slate-700 hover:bg-slate-50",
            ].join(" ")}
            aria-pressed={rateMode === "fund"}
          >
            ファンド別
          </button>
        </div>
      </div>

      <div className="mt-2 text-xs leading-relaxed text-slate-600">
        {rateMode === "custom"
          ? "共通：すべて同じ年率で比較します"
          : "ファンド別：各ファンドの参考年率で比較します"}
      </div>

      <div className="mt-3">
        <div className="text-sm font-semibold text-slate-900">利回り</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <input
              type="text"
              inputMode="decimal"
              value={annualReturnPercentText}
              onFocus={(e) => e.currentTarget.select()}
              onChange={(e) => setAnnualReturnPercentText(e.target.value)}
              onBlur={() => {
                if (rateMode !== "custom") return;
                onCommitAnnualReturnPercentText(annualReturnPercentText);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "NumpadEnter") {
                  e.preventDefault();
                  if (rateMode !== "custom") return;
                  onCommitAnnualReturnPercentText(annualReturnPercentText);
                  e.currentTarget.blur();
                }
              }}
              disabled={rateMode !== "custom"}
              className={[
                "min-w-0 flex-1",
                "rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center text-lg font-semibold text-slate-900",
                "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200",
                rateMode !== "custom" ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
              aria-label="利回り（年率）（%）"
            />
            <div className="shrink-0 text-sm font-semibold text-slate-700">%</div>
          </div>
          <div className="shrink-0">
            <StepperButtons
              onDec={onDecAnnualReturn}
              onInc={onIncAnnualReturn}
              decLabel="利回りを0.1%減らす"
              incLabel="利回りを0.1%増やす"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
