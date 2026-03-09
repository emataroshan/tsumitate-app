// components/CompareApp.tsx

"use client";

import { useMemo, useState } from "react";
import InputPanel from "@/components/InputPanel/InputPanel";
import FundPicker from "@/components/FundPicker";
import ResultsTable from "@/components/ResultsTable/ResultsTable";
import { funds as allFunds } from "@/data/funds";
import BalanceChart from "@/components/BalanceChart/BalanceChart";
import BestFundCard from "@/components/BestFundCard";
import { simulate, compareNisaVsTaxable } from "@/lib/calc";
import ResponsiveSheet from "@/components/InputPanel/ResponsiveSheet";
import { formatJPY } from "@/lib/format";

export default function CompareApp() {
  const [monthly, setMonthly] = useState<number>(30000);
  const [years, setYears] = useState<number>(20);
  const [initial, setInitial] = useState<number>(0);
  // 年率モード：参考（ファンドごと） or 想定（共通）
  const [rateMode, setRateMode] = useState<"fund" | "custom">("custom");
  // 想定年率（小数、例：0.07 = 7%）
  const [customAnnualReturn, setCustomAnnualReturn] = useState<number>(0.05);
  const [monthlyDraft, setMonthlyDraft] = useState<number>(monthly);
 const [yearsDraft, setYearsDraft] = useState<number>(years);
 const [initialDraft, setInitialDraft] = useState<number>(initial);
 const [customReturnDraft, setCustomReturnDraft] = useState<number>(customAnnualReturn);
 const [rateModeDraft, setRateModeDraft] = useState<"fund" | "custom">(rateMode);

  const [inputOpen, setInputOpen] = useState(false);
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

  function openInput() {
    setMonthlyDraft(monthly);
    setYearsDraft(years);
    setInitialDraft(initial);
    setCustomReturnDraft(customAnnualReturn);
    setRateModeDraft(rateMode);
    setInputOpen(true);
  }

  function applyInput() {
    setMonthly(monthlyDraft);
    setYears(yearsDraft);
    setInitial(initialDraft);
    setCustomAnnualReturn(customReturnDraft);
    setRateMode(rateModeDraft);
    setInputOpen(false);
  }

  function cancelInput() {
    setInputOpen(false);
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

  const hasChanges = useMemo(() => {
    return (
      monthlyDraft !== monthly ||
      yearsDraft !== years ||
      initialDraft !== initial ||
      customReturnDraft !== customAnnualReturn ||
      rateModeDraft !== rateMode
    );
  }, [
    monthlyDraft,
    yearsDraft,
    initialDraft,
    customReturnDraft,
    rateModeDraft,
    monthly,
    years,
    initial,
    customAnnualReturn,
    rateMode,
  ]);

  return (
    <div className="grid gap-4">
      <div className="pb-2 pt-3 text-center sm:pb-4 sm:pt-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          管理費用まで考慮した積立投資シミュレーター
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          ファンドごとの将来資産を、管理費用込みで比較できます
        </p>
      </div>

      {/* ✅ Summaryは唯一の入口 */}
      <div className="mx-auto w-full max-w-3xl">
        <button
          type="button"
          onClick={openInput}
          className={[
            "group flex w-full items-center justify-between rounded-2xl border bg-slate-50 px-5 py-4 text-left shadow-sm",
            "cursor-pointer transition hover:bg-slate-100 hover:shadow-md",
            "focus:outline-none focus:ring-2 focus:ring-slate-200",
          ].join(" ")}
          aria-haspopup="dialog"
          aria-expanded={inputOpen}
          aria-label="現在の条件を編集"
        >
          <div className="min-w-0 text-sm text-slate-700">
            <span className="font-medium">積立月額</span>{" "}
            <span className="font-semibold text-slate-900">{monthly.toLocaleString()}円</span>
            <span className="mx-2 text-slate-400">/</span>

            <span className="font-medium">期間</span>{" "}
            <span className="font-semibold text-slate-900">{years}年</span>

            {initial > 0 && (
              <>
                <span className="mx-2 text-slate-400">/</span>
                <span className="font-medium">初期投資</span>{" "}
                <span className="font-semibold text-slate-900">{formatYenLite(initial)}</span>
              </>
            )}

            <span className="mx-2 text-slate-400">/</span>

            {rateMode === "custom" ? (
              <>
                <span className="font-medium">年率</span>{" "}
                <span className="font-semibold text-slate-900">
                  {(customAnnualReturn * 100).toFixed(1)}%
                </span>
              </>
            ) : (
              <span className="font-semibold text-slate-900">年率（ファンド別）</span>
            )}
          </div>

          <div className="shrink-0 text-xs text-slate-500">
            ※タップで編集
          </div>
        </button>
      </div>

      {/* ✅ 入力はSheetに集約 */}
      <ResponsiveSheet
        open={inputOpen}
        onClose={cancelInput}
        onCancel={cancelInput}
        onApply={applyInput}
        canApply={hasChanges}
        title="条件の調整"
      >
        <div className="mx-auto w-full max-w-2xl">
          <InputPanel
            monthly={monthlyDraft}
            setMonthly={setMonthlyDraft}
            years={yearsDraft}
            setYears={setYearsDraft}
            initial={initialDraft}
            setInitial={setInitialDraft}
            rateMode={rateModeDraft}
            setRateMode={setRateModeDraft}
            customAnnualReturn={customReturnDraft}
            setCustomAnnualReturn={setCustomReturnDraft}
          />
        </div>
      </ResponsiveSheet>

      {/* ファンド一覧は独立セクションとして上に配置 */}
      <FundPicker
        funds={allFunds}
        selectedIds={selectedIds}
        onToggle={toggle}
        maxSelect={8}
        defaultSelectionNote="※ 例として人気の2本を初期選択しています（いつでも変更できます）"
        onClearAll={clearAll}
        onResetExample={resetExample}
      />

      {/* 結果エリア：広い画面では ベストカード | グラフ、狭い画面では縦積み */}
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0">
          {best && (
            <BestFundCard
              fund={best.fund}
              finalValue={best.finalValue}
              principal={best.principal}
              profit={best.profit}
              benefit={best.benefit}
              years={years}
              rateMode={rateMode}
              expenseRatio={best.fund.expense_ratio}
              feeDrag={best.feeDrag}
            />
          )}
        </div>

        <div className="min-w-0">
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