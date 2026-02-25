// components/CompareApp.tsx

"use client";

import { useMemo, useState } from "react";
import InputPanel from "@/components/InputPanel";
import FundPicker from "@/components/FundPicker";
import ResultsTable from "@/components/ResultsTable";
import { funds as allFunds } from "@/data/funds";
import BalanceChart from "@/components/BalanceChart";

export default function CompareApp() {
  const [monthly, setMonthly] = useState<number>(50000);
  const [years, setYears] = useState<number>(20);
  const [initial, setInitial] = useState<number>(0);
  // 年率モード：参考（ファンドごと） or 想定（共通）
  const [rateMode, setRateMode] = useState<"fund" | "custom">("fund");
  // 想定年率（小数、例：0.07 = 7%）
  const [customAnnualReturn, setCustomAnnualReturn] = useState<number>(0.07);
  const [selectedIds, setSelectedIds] = useState<string[]>([
    "emaxis-slim-all-country",
    "emaxis-slim-sp500",
  ]);

  const selectedFunds = useMemo(
    () => allFunds.filter((f) => selectedIds.includes(f.id)),
    [selectedIds]
  );

  function toggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-2xl font-bold">NISA積立ファンド比較（v1）</div>
        <div className="mt-1 text-sm text-slate-600">
          まずは「共通条件」でサクッと比較。v2で個別条件を追加します。
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">毎月：{monthly.toLocaleString()}円</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">期間：{years}年</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">初期：{initial.toLocaleString()}円</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            年率：{rateMode === "fund" ? "参考（ファンド別）" : `想定（${(customAnnualReturn * 100).toFixed(1)}%）`}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">選択：{selectedIds.length}本</span>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4 min-w-0">
          <InputPanel
            monthly={monthly}
            setMonthly={setMonthly}
            years={years}
            setYears={setYears}
            initial={initial}
            setInitial={setInitial}
            rateMode={rateMode}
            setRateMode={setRateMode}
            customAnnualReturn={customAnnualReturn}
            setCustomAnnualReturn={setCustomAnnualReturn}
          />
        </div>

        <div className="lg:col-span-8 min-w-0">
          <FundPicker
            funds={allFunds}
            selectedIds={selectedIds}
            onToggle={toggle}
            maxSelect={8}
          />
        </div>

        <div className="lg:col-span-12 min-w-0">
          <BalanceChart
            selectedFunds={selectedFunds}
            monthly={monthly}
            years={years}
            initial={initial}
            rateMode={rateMode}
            customAnnualReturn={customAnnualReturn}
          />
        </div>

        <div className="lg:col-span-12 min-w-0">
          <ResultsTable
            selectedFunds={selectedFunds}
            monthly={monthly}
            years={years}
            initial={initial}
            rateMode={rateMode}
            customAnnualReturn={customAnnualReturn}
          />
        </div>
      </div>
    </div>
  );
}