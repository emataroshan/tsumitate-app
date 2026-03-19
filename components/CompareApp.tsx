// components/CompareApp.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Fund } from "@/lib/types";
import { toPng } from "html-to-image";
import InputPanel from "@/components/InputPanel/InputPanel";
import FundPicker from "@/components/FundPicker";
import ResultsTable from "@/components/ResultsTable/ResultsTable";
import { FUND_CONFIG as fundConfig } from "@/data/fund-config";
import { FUND_ANALYTICS_BY_ID } from "@/data/fund-analytics";
import BalanceChart from "@/components/BalanceChart/BalanceChart";
import BestFundCard from "@/components/BestFundCard";
import { simulate, compareNisaVsTaxable } from "@/lib/calc";
import ResponsiveSheet from "@/components/InputPanel/ResponsiveSheet";
import { formatJPY } from "@/lib/format";

const allFunds = fundConfig as unknown as Fund[];

function getReferenceAnnualReturn(fundId: string): number | null {
  const analytics = FUND_ANALYTICS_BY_ID[fundId];
  return (
    analytics?.annualizedReturn5y ??
    analytics?.annualizedReturn3y ??
    analytics?.annualizedReturn1y ??
    analytics?.annualizedReturnSinceInception ??
    null
  );
}

function formatYearMonthJa(dateStr: string): string | null {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function parseRate(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
}

function buildShareUrl(params: {
  monthly: number;
  years: number;
  initial: number;
  rateMode: "fund" | "custom";
  customAnnualReturn: number;
  selectedIds: string[];
}) {
  const url = new URL(window.location.href);
  const search = new URLSearchParams();

  search.set("monthly", String(params.monthly));
  search.set("years", String(params.years));

  if (params.initial > 0) {
    search.set("initial", String(params.initial));
  }

  search.set("rateMode", params.rateMode);

  if (params.rateMode === "custom") {
    search.set("rate", String(params.customAnnualReturn));
  }

  if (params.selectedIds.length > 0) {
    search.set("funds", params.selectedIds.join(","));
  }

  url.search = search.toString();
  return url.toString();
}

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
    () => [
      "mufg_emaxis_slim_all_country",
      "mufg_emaxis_slim_sp500",
    ],
    []
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(DEFAULT_SELECTED_IDS);
  const bestCardCaptureRef = useRef<HTMLDivElement | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isImageSaved, setIsImageSaved] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const hasInitializedFromUrlRef = useRef(false);

  const selectedFunds = useMemo(
    () => allFunds.filter((f) => selectedIds.includes(f.id)),
    [selectedIds]
  );

  const fundDataUpdatedLabel = useMemo(() => {
    const asOfList = Object.values(FUND_ANALYTICS_BY_ID)
      .map((item) => item.asOf)
      .filter((v): v is string => typeof v === "string" && v.length > 0);

    if (asOfList.length === 0) return null;

    const latest = asOfList.reduce((max, cur) => (cur > max ? cur : max));
    return formatYearMonthJa(latest);
  }, []);

  // BestFundCard用：この条件で「資産が最も増える」ファンドを計算
  // ついでに NISA の節税（目安）もバッジ用に算出
  const best = useMemo(() => {
    if (selectedFunds.length === 0) return null;

    const taxRate = 0.20315;
    const rows: {
      fund: (typeof selectedFunds)[number];
      finalValue: number;
      principal: number;
      profit: number;
      benefit: number;
      annualReturn: number;
      effectiveAnnualReturn: number;
      feeDrag: number;
    }[] = [];


    for (const f of selectedFunds) {
      const annualReturn =
        rateMode === "custom"
          ? customAnnualReturn
          : (getReferenceAnnualReturn(f.id) ?? 0);

      const res = simulate({
        monthly,
        years,
        initial,
        annualReturn,
        expenseRatio: f.expenseRatio,
      });

      // 手数料の影響（概算）：同条件で expenseRatio=0 と比較
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
          expenseRatio: f.expenseRatio,
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
        effectiveAnnualReturn: annualReturn - f.expenseRatio,
        feeDrag,
      };

      // 「最終評価額」が最大のファンドを best とする（元本が共通なので profit 最大とほぼ同義）
      rows.push(row);
    }

    if (rows.length === 0) return null;

    const sorted = [...rows].sort((a, b) => b.finalValue - a.finalValue);

    const bestRow = sorted[0];
    const secondRow = sorted[1];

    const secondDiff =
      secondRow ? bestRow.finalValue - secondRow.finalValue : null;

    return {
      ...bestRow,
      secondDiff,
    };
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

  async function handleSaveBestCardImage() {
    if (!bestCardCaptureRef.current || !best) return;

    try {
      setIsSavingImage(true);
      const node = bestCardCaptureRef.current;
      const rect = node.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);

      const dataUrl = await toPng(node, {
        width,
        height,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
        style: {
          boxSizing: "border-box",
          width: `${width}px`,
          minWidth: `${width}px`,
          maxWidth: `${width}px`,
          height: `${height}px`,
          overflow: "hidden",
        },
        filter: (domNode) => {
          if (!(domNode instanceof HTMLElement)) return true;
          return domNode.dataset?.captureExclude !== "true";
        },
      });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `tsumitate-best-${monthly}-${years}.png`;
      setIsImageSaved(true);
      link.click();
    } catch (error) {
      console.error("画像保存に失敗しました", error);
      window.alert("画像の保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSavingImage(false);
    }
  }

  useEffect(() => {
    if (hasInitializedFromUrlRef.current) return;

    const search = new URLSearchParams(window.location.search);

    const monthlyParam = parsePositiveInt(search.get("monthly"));
    const yearsParam = parsePositiveInt(search.get("years"));
    const initialParam = parsePositiveInt(search.get("initial"));
    const rateModeParam = search.get("rateMode");
    const rateParam = parseRate(search.get("rate"));
    const fundsParam = search.get("funds");

    if (monthlyParam !== null) {
      setMonthly(monthlyParam);
      setMonthlyDraft(monthlyParam);
    }

    if (yearsParam !== null && yearsParam > 0) {
      setYears(yearsParam);
      setYearsDraft(yearsParam);
    }

    if (initialParam !== null) {
      setInitial(initialParam);
      setInitialDraft(initialParam);
    }

    if (rateModeParam === "fund" || rateModeParam === "custom") {
      setRateMode(rateModeParam);
      setRateModeDraft(rateModeParam);
    }

    if (rateParam !== null) {
      setCustomAnnualReturn(rateParam);
      setCustomReturnDraft(rateParam);
    }

    if (fundsParam) {
      const validIds = fundsParam
        .split(",")
        .map((id) => id.trim())
        .filter((id) => allFunds.some((f) => f.id === id));

      if (validIds.length > 0) {
        setSelectedIds(validIds);
      }
    }

    hasInitializedFromUrlRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasInitializedFromUrlRef.current) return;

    const nextUrl = buildShareUrl({
      monthly,
      years,
      initial,
      rateMode,
      customAnnualReturn,
      selectedIds,
    });

    window.history.replaceState(null, "", nextUrl);
  }, [monthly, years, initial, rateMode, customAnnualReturn, selectedIds]);

  useEffect(() => {
    if (!isLinkCopied) return;

    const timer = window.setTimeout(() => {
      setIsLinkCopied(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [isLinkCopied]);

  useEffect(() => {
    if (!isImageSaved) return;

    const timer = window.setTimeout(() => {
      setIsImageSaved(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, [isImageSaved]);

  async function handleCopyLink() {
    try {
      const shareUrl = buildShareUrl({
        monthly,
        years,
        initial,
        rateMode,
        customAnnualReturn,
        selectedIds,
      });

      await navigator.clipboard.writeText(shareUrl);
      setIsLinkCopied(true);
    } catch (error) {
      console.error("リンクコピーに失敗しました", error);
      window.alert("リンクのコピーに失敗しました。");
    }
  }

  function handleShareOnX() {
    if (!best) return;

    function formatYenForShare(v: number) {
      return new Intl.NumberFormat("ja-JP", {
        maximumFractionDigits: 0,
      }).format(v) + "円";
    }

    const shareUrlValue = buildShareUrl({
      monthly,
      years,
      initial,
      rateMode,
      customAnnualReturn,
      selectedIds,
    });

    const text = [
      `毎月${formatYenForShare(monthly)}`,
      `${years}年積立`,
      "",
      "↓",
      "",
      `${formatYenForShare(best.finalValue)}`,
      "",
      `利益 ${best.profit >= 0 ? "+" : ""}${formatYenForShare(best.profit)}`,
      "",
      "👇 無料でシミュレーションする",
      "",
    ].join("\n");

    const shareUrl = new URL("https://twitter.com/intent/tweet");
    shareUrl.searchParams.set("text", text);
    shareUrl.searchParams.set("url", shareUrlValue);

    window.open(
      shareUrl.toString(),
      "_blank",
      "noopener,noreferrer,width=600,height=700"
    );
  }

  return (
    <div className="grid gap-4">
      <div className="pb-2 pt-3 text-center sm:pb-4 sm:pt-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          積立投資の未来がわかる
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          ファンドごとの将来資産を、
          <span className="font-semibold text-emerald-600">
            手数料込み
          </span>
          で比較できます
        </p>
      </div>

      {/* ファンド一覧は独立セクションとして上に配置 */}
      <FundPicker
        funds={allFunds}
        selectedIds={selectedIds}
        onToggle={toggle}
        maxSelect={8}
        dataUpdatedLabel={fundDataUpdatedLabel}
        defaultSelectionNote="※ 例として人気の2本を初期選択しています（いつでも変更できます）"
        onClearAll={clearAll}
        onResetExample={resetExample}
      />

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

      {/* 結果エリア：広い画面では ベストカード | グラフ、狭い画面では縦積み */}
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0">
          {best && (
            <div className="mx-auto w-full max-w-3xl lg:max-w-none">
              <div ref={bestCardCaptureRef} className="w-full">
                <BestFundCard
                  fund={best.fund}
                  finalValue={best.finalValue}
                  principal={best.principal}
                  profit={best.profit}
                  benefit={best.benefit}
                  years={years}
                  monthly={monthly}
                  annualRatePercent={best.annualReturn * 100}
                  secondDiff={best.secondDiff}
                  rateMode={rateMode}
                  expenseRatio={best.fund.expenseRatio}
                  feeDrag={best.feeDrag}
                />
              </div>

              <div className="mt-4 text-sm font-semibold text-slate-700">
                結果をシェア
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveBestCardImage}
                  disabled={isSavingImage || isImageSaved}
                  className={[
                    "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition",
                    isImageSaved
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                  ].join(" ")}
                >
                  {isSavingImage ? "画像作成中" : isImageSaved ? "✓ 保存済み" : "画像を保存"}
                </button>

                <button
                  type="button"
                  onClick={handleShareOnX}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Xで共有
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={[
                    "inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold shadow-sm transition",
                    isLinkCopied
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {isLinkCopied ? "✓ コピー済み" : "リンクをコピー"}
                </button>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                画像を保存すると、このカードをSNSで共有できます。
              </p>
            </div>
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