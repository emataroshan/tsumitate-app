// components/CompareApp.tsx

"use client";

import { useMemo, useRef, useState } from "react";
import InputPanel from "@/components/InputPanel";
import FundPicker from "@/components/FundPicker";
import ResultsTable from "@/components/ResultsTable";
import { funds as allFunds } from "@/data/funds";
import BalanceChart from "@/components/BalanceChart";
import BestFundCard from "@/components/BestFundCard";
import { simulate, compareNisaVsTaxable } from "@/lib/calc";
import ResponsiveSheet from "@/components/input/ResponsiveSheet";
import { formatJPY } from "@/lib/format";

export default function CompareApp() {
  const [monthly, setMonthly] = useState<number>(50000);
  const [years, setYears] = useState<number>(20);
  const [initial, setInitial] = useState<number>(0);
  // 年率モード：参考（ファンドごと） or 想定（共通）
  const [rateMode, setRateMode] = useState<"fund" | "custom">("custom");
  // 想定年率（小数、例：0.07 = 7%）
  const [customAnnualReturn, setCustomAnnualReturn] = useState<number>(0.05);

  const [inputOpen, setInputOpen] = useState(false);
  const monthlyInputRef = useRef<HTMLInputElement | null>(null);
  const DEFAULT_SELECTED_IDS = useMemo(
    () => ["emaxis-slim-全世界株式ｵｰﾙ-ｶﾝﾄﾘｰ", "emaxis-slim-米国株式sandp500"],
    []
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTED_IDS);

  const selectedFunds = useMemo(
    () => allFunds.filter((f) => selectedIds.includes(f.id)),
    [selectedIds]
  );

  // BestFundCard用：この条件で「資産が最も増える」ファンドを計算
  // ついでに NISA の節税（目安）もバッジ用に算出
  const best = useMemo(() => {
    if (selectedFunds.length === 0) return null;

    const taxRate = 0.20315;
    let bestRow:
      | {
          fund: (typeof selectedFunds)[number];
          finalValue: number;
          principal: number;
          profit: number;
          benefit: number;
          annualReturn: number;
          effectiveAnnualReturn: number;
          feeDrag: number;
        }
      | null = null;

    for (const f of selectedFunds) {
      const annualReturn = rateMode === "custom" ? customAnnualReturn : f.ref_return;

      const res = simulate({
        monthly,
        years,
        initial,
        annualReturn,
        expenseRatio: f.expense_ratio,
      });

      // 管理費用の影響（概算）：同条件で expenseRatio=0 と比較
      const resNoFee = simulate({
        monthly,
        years,
        initial,
        annualReturn,
        expenseRatio: 0,
      });
      const feeDrag = Math.max(0, resNoFee.finalValue - res.finalValue);

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

      const row = {
        fund: f,
        finalValue: res.finalValue,
        principal: res.principal,
        profit: res.profit,
        benefit: comp.nisaBenefit,
        annualReturn,
        effectiveAnnualReturn: annualReturn - f.expense_ratio,
        feeDrag,
      };

      // 「最終評価額」が最大のファンドを best とする（元本が共通なので profit 最大とほぼ同義）
      if (!bestRow || row.finalValue > bestRow.finalValue) {
        bestRow = row;
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

  function clearAll() {
    setSelectedIds([]);
  }

  function resetExample() {
    setSelectedIds(DEFAULT_SELECTED_IDS);
  }

  function formatYenLite(v: number) {
    // formatJPY は "￥" になるので、UIのトーンに合わせて "¥" に寄せる
    return formatJPY(v).replace("￥", "¥");
  }

  const summary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`毎月 ${formatYenLite(monthly)}`);
    parts.push(`${years}年`);

    if (rateMode === "custom") {
      const percent = Number.isFinite(customAnnualReturn) ? customAnnualReturn * 100 : NaN;
      const text = Number.isFinite(percent) ? percent.toFixed(1) : "-";
      parts.push(`年率 ${text}%（共通）`);
    } else {
      parts.push("年率（ファンド別）");
    }

    if (initial > 0) parts.push(`初期 ${formatYenLite(initial)}`);
    return parts.join(" ・ ");
  }, [monthly, years, rateMode, customAnnualReturn, initial]);

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-2xl font-bold text-slate-900">
          管理費用込みで比較できる積立投資シミュレーター
        </div>
        <div className="mt-1 text-sm text-slate-600">
          ファンドごとの将来資産と、NISAで払わずに済む税金の目安を比較できます
        </div>
      </div>

      {/* ✅ Summaryは唯一の入口（sticky） */}
      <div className="sticky top-3 z-20">
        <button
          type="button"
          onClick={() => setInputOpen(true)}
          className={[
            "w-full rounded-2xl border bg-white/90 px-3 py-2 text-left shadow-sm backdrop-blur",
            "focus:outline-none focus:ring-2 focus:ring-slate-200",
          ].join(" ")}
          aria-haspopup="dialog"
          aria-expanded={inputOpen}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{summary}</div>
              <div className="mt-0.5 text-xs text-slate-600">タップして条件を調整</div>
            </div>
            <div className="shrink-0 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              変更
              <span aria-hidden="true" className="ml-1 inline-block align-middle text-slate-500">
                ›
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* ✅ 入力はSheetに集約 */}
      <ResponsiveSheet
        open={inputOpen}
        onClose={() => setInputOpen(false)}
        title="条件の調整"
        initialFocusRef={monthlyInputRef}
      >
        <div className="mx-auto w-full max-w-2xl">
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
            monthlyInputRef={monthlyInputRef}
          />
        </div>
      </ResponsiveSheet>

      {/* 上段：比較の因果が見える（左=ファンド / 右=条件+結論+グラフ） */}
      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(440px,520px)_minmax(0,1fr)] xl:items-start">
        {/* 左（PCでsticky） */}
        <div className="order-1 min-w-0 xl:order-1">
          <div className="xl:sticky xl:top-4">
            <FundPicker
              funds={allFunds}
              selectedIds={selectedIds}
              onToggle={toggle}
              maxSelect={8}
              defaultSelectionNote="※ 例として人気の2本を初期選択しています（いつでも変更できます）"
              onClearAll={clearAll}
              onResetExample={resetExample}
            />
          </div>
        </div>

        {/* 右（結果＋グラフ） */}
        <div className="order-2 min-w-0 xl:order-2">
          <div className="grid gap-4">
            {/* ★結論カード：推移グラフの直前に配置 */}
            {best && (
              <BestFundCard
                fund={best.fund}
                finalValue={best.finalValue}
                principal={best.principal}
                profit={best.profit}
                benefit={best.benefit}
                monthly={monthly}
                years={years}
                rateMode={rateMode}
                annualReturn={best.annualReturn}
                effectiveAnnualReturn={best.effectiveAnnualReturn}
                expenseRatio={best.fund.expense_ratio}
                feeDrag={best.feeDrag}
              />
            )}

            <BalanceChart
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

      {/* 下段：比較結果は横幅が命なので全幅 */}
      <ResultsTable
        selectedFunds={selectedFunds}
        monthly={monthly}
        years={years}
        initial={initial}
        rateMode={rateMode}
        customAnnualReturn={customAnnualReturn}
      />
    </div>
  );
}