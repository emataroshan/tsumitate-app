// components/CompareApp.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import InputPanel from "@/components/InputPanel";
import FundPicker from "@/components/FundPicker";
import ResultsTable from "@/components/ResultsTable";
import { funds as allFunds } from "@/data/funds";
import BalanceChart from "@/components/BalanceChart";
import BestFundCard from "@/components/BestFundCard";
import { compareNisaVsTaxable } from "@/lib/calc";

export default function CompareApp() {
  const [monthly, setMonthly] = useState<number>(50000);
  const [years, setYears] = useState<number>(20);
  const [initial, setInitial] = useState<number>(0);
  // 年率モード：参考（ファンドごと） or 想定（共通）
  const [rateMode, setRateMode] = useState<"fund" | "custom">("custom");
  // 想定年率（小数、例：0.07 = 7%）
  const [customAnnualReturn, setCustomAnnualReturn] = useState<number>(0.05);
  const DEFAULT_SELECTED_IDS = useMemo(
    () => ["emaxis-slim-全世界株式ｵｰﾙ-ｶﾝﾄﾘｰ", "emaxis-slim-米国株式sandp500"],
    []
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTED_IDS);

  const selectedFunds = useMemo(
    () => allFunds.filter((f) => selectedIds.includes(f.id)),
    [selectedIds]
  );

  // BestFundCard用：損失回避額（NISAメリット）が最大のファンドを計算
  // ※ 20.315% はデフォルト税率（ResultsTableと同じ想定）
  const best = useMemo(() => {
    if (selectedFunds.length === 0) return null;

    const taxRate = 0.20315;
    let bestRow: { fund: (typeof selectedFunds)[number]; benefit: number } | null = null;

    for (const f of selectedFunds) {
      const annualReturn = rateMode === "custom" ? customAnnualReturn : f.ref_return;
      const comp = compareNisaVsTaxable(
        {
          monthly,
          years,
          initial,
          annualReturn,
          expenseRatio: f.expense_ratio,
        },
        taxRate
      );

      const benefit = comp.nisaBenefit;
      if (!bestRow || benefit > bestRow.benefit) {
        bestRow = { fund: f, benefit };
      }
    }

    return bestRow;
  }, [selectedFunds, monthly, years, initial, rateMode, customAnnualReturn]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-2xl font-bold text-slate-900">
          つみたて投資シミュレーター｜NISAの非課税額も比較
        </div>
        <div className="mt-1 text-sm text-slate-600">
          ファンドごとの将来資産と、NISAで払わずに済む税金の目安を比較できます
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

        {/* ★結論カード：推移グラフの直前に配置 */}
        {best && (
          <div className="lg:col-span-12 min-w-0">
            <BestFundCard fund={best.fund} benefit={best.benefit} />
          </div>
        )}

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