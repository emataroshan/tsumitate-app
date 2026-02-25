// components/InputPanel.tsx

"use client";

type Props = {
  monthly: number;
  setMonthly: (v: number) => void;
  years: number;
  setYears: (v: number) => void;
  initial: number;
  setInitial: (v: number) => void;
  // 年率モード：参考（ファンドごと） or 想定（共通）
  rateMode: "fund" | "custom";
  setRateMode: (v: "fund" | "custom") => void;
  // 想定年率（小数、例：0.07 = 7%）
  customAnnualReturn: number;
  setCustomAnnualReturn: (v: number) => void;
};

export default function InputPanel({
  monthly,
  setMonthly,
  years,
  setYears,
  initial,
  setInitial,
  rateMode,
  setRateMode,
  customAnnualReturn,
  setCustomAnnualReturn,
}: Props) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-lg font-semibold">条件（共通）</div>
        <div className="text-sm text-slate-600">まずはここだけで比較できます</div>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-sm text-slate-700">毎月の積立額（円）</span>
          <input
            type="number"
            min={0}
            step={1000}
            value={monthly}
            onChange={(e) => setMonthly(Number(e.target.value))}
            className="rounded-xl border px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-slate-700">期間（年）</span>
          <input
            type="number"
            min={1}
            max={60}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="rounded-xl border px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-slate-700">初期投資（円・任意）</span>
          <input
            type="number"
            min={0}
            step={10000}
            value={initial}
            onChange={(e) => setInitial(Number(e.target.value))}
            className="rounded-xl border px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <div className="grid gap-2 rounded-xl border bg-slate-50 p-3">
          <div className="text-sm font-medium text-slate-800">年率（計算方法）</div>
          
          <div className="grid gap-1">
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name="rateMode"
                value="custom"
                checked={rateMode === "custom"}
                onChange={() => setRateMode("custom")}
              />
              <span className="flex items-center gap-2">
                想定年率（共通）で計算

                {/* ? アイコン（ツールチップ） */}
                <span className="relative inline-flex group cursor-help">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-600">
                    ?
                  </span>
                  <span className="pointer-events-none absolute left-1/2 top-7 z-10 w-64 -translate-x-1/2 rounded-lg border bg-white p-2 text-xs text-slate-600 shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                    すべてのファンドを同じ条件で比較するための年率です
                  </span>
                </span>
              </span>
            </label>

            <div className="flex items-center gap-2 pl-6">
              <input
                type="number"
                min={-100}
                max={100}
                step={0.1}
                value={Number.isFinite(customAnnualReturn) ? (customAnnualReturn * 100).toFixed(1) : ""}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCustomAnnualReturn(Number.isFinite(v) ? v / 100 : NaN);
                }}
                disabled={rateMode !== "custom"}
                className={`w-28 rounded-xl border px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 ${
                  rateMode !== "custom" ? "opacity-50" : ""
                }`}
                aria-label="想定年率（%）"
              />
              <span className={`text-sm ${rateMode !== "custom" ? "text-slate-500" : "text-slate-700"}`}>%</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="radio"
              name="rateMode"
              value="fund"
              checked={rateMode === "fund"}
              onChange={() => setRateMode("fund")}
            />
            <span className="flex items-center gap-2">
              参考年率（ファンドごと）で計算

              {/* ? アイコン（ツールチップ） */}
              <span className="relative inline-flex group cursor-help">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-400 hover:border-slate-500 hover:text-slate-600">
                  ?
                </span>

                <span className="pointer-events-none absolute left-1/2 top-7 z-10 w-72 -translate-x-1/2 rounded-lg border bg-white p-2 text-xs text-slate-600 shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                  各ファンドの過去の実績（主に5年、未満の場合は3年・1年など）をもとにした参考値です。
                </span>

              </span>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}