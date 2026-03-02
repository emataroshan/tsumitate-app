// components/input/RateDetails.tsx

"use client";

import Tooltip from "@/components/input/Tooltip";

export default function RateDetails({
  rateMode,
  setRateMode,
  annualReturnPercentText,
  setAnnualReturnPercentText,
  onCommitAnnualReturnPercentText,
}: {
  rateMode: "fund" | "custom";
  setRateMode: (v: "fund" | "custom") => void;
  annualReturnPercentText: string;
  setAnnualReturnPercentText: (v: string) => void;
  onCommitAnnualReturnPercentText: (raw: string) => void;
}) {
  return (
    <div className="grid gap-2 rounded-xl border bg-slate-50 p-3">
      <div className="text-sm font-medium text-slate-800">年率の詳細</div>

      <div className="grid gap-3">
       {/* 年率モード：i は1つに統合（Apple） */}
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-slate-800">年率モード</div>
          <Tooltip
            id="rateMode"
            ariaLabel="年率モードの説明"
            text={
              "共通\nすべてのファンドを同じ年率で計算（公平に比較）。\n\n" +
              "ファンド別\n各ファンドの参考年率（過去5年のリターンベース）で計算。"
            }
          />
        </div>

        <div className="rounded-2xl bg-white p-1 ring-1 ring-slate-200">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setRateMode("custom")}
              className={[
                "rounded-2xl px-3 py-2 text-sm font-semibold",
                rateMode === "custom"
                  ? "bg-slate-900 text-white"
                  : "bg-transparent text-slate-700",
              ].join(" ")}
              aria-pressed={rateMode === "custom"}
            >
              共通
            </button>
            <button
              type="button"
              onClick={() => setRateMode("fund")}
              className={[
                "rounded-2xl px-3 py-2 text-sm font-semibold",
                rateMode === "fund"
                  ? "bg-slate-900 text-white"
                  : "bg-transparent text-slate-700",
              ].join(" ")}
              aria-pressed={rateMode === "fund"}
            >
              ファンド別
            </button>
          </div>
        </div>

        {/* 共通モードのときだけ入力を強調 */}
        <div className="grid gap-1">
          <div className="text-sm font-medium text-slate-800">想定利回り（年率）</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="decimal"
              value={annualReturnPercentText}
              onChange={(e) => setAnnualReturnPercentText(e.target.value)}
              onBlur={() => onCommitAnnualReturnPercentText(annualReturnPercentText)}
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
                "w-32 rounded-2xl border bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400",
                "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200",
                rateMode !== "custom" ? "opacity-50" : "",
              ].join(" ")}
              aria-label="想定年率（%）"
            />
            <span className={rateMode !== "custom" ? "text-sm text-slate-500" : "text-sm text-slate-700"}>
              %
            </span>
            <div className="text-xs text-slate-600">
              {rateMode === "custom" ? "共通条件で比較します" : "ファンドごとの参考年率を使います"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
