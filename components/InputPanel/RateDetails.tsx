// components/InputPanel/RateDetails.tsx

"use client";

import Tooltip from "@/components/InputPanel/Tooltip";
import StepperButtons from "@/components/InputPanel/StepperButtons";

export default function RateDetails({
  rateMode,
  setRateMode,
  annualReturnPercentText,
  setAnnualReturnPercentText,
  onCommitAnnualReturnPercentText,
  onDecAnnualReturn,
  onIncAnnualReturn,
  controlWidthClass = "w-[12.5rem]",
}: {
  rateMode: "fund" | "custom";
  setRateMode: (v: "fund" | "custom") => void;
  annualReturnPercentText: string;
  setAnnualReturnPercentText: (v: string) => void;
  onCommitAnnualReturnPercentText: (raw: string) => void;
  onDecAnnualReturn: () => void;
  onIncAnnualReturn: () => void;
  controlWidthClass?: string;
}) {
  return (
    <div className="min-w-0">
      {/* 行1：年率（右にsegmented） */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
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

        <div className={["rounded-xl bg-white p-1 ring-1 ring-slate-200", controlWidthClass].join(" ")}>
          <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setRateMode("custom")}
            className={[
              "min-w-0 flex-1 rounded-lg px-3 py-2 text-sm font-semibold",
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
              "min-w-0 flex-1 rounded-lg px-3 py-2 text-sm font-semibold",
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
    </div>

      <div className="mt-2 text-xs text-slate-600">
        {rateMode === "custom"
          ? "共通：すべて同じ年率で比較します"
          : "ファンド別：各ファンドの参考年率で比較します"}
      </div>

       {/* 行2：利回り（右に入力、Stepperは右端） */}
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2">
        <div className="text-sm font-semibold text-slate-900">利回り</div>

        <div className="flex items-center justify-end gap-2">
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
                controlWidthClass,
                "rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-base font-semibold tabular-nums text-slate-900",
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
  );
}
