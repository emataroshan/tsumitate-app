// components/InputPanel.tsx

"use client";

import { useMemo, useState } from "react";
import { useMonthlyText } from "@/hooks/useMonthlyText";
import RateDetails from "@/components/input/RateDetails";
import ResponsiveSheet from "@/components/input/ResponsiveSheet";
import { formatJPY } from "@/lib/format";
import StepperButtons from "@/components/input/StepperButtons";

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
  const { text: monthlyText, setText: setMonthlyText, normalize, commit } = useMonthlyText({
    value: monthly,
    onCommit: setMonthly,
  });

  // 年率（%）はクイックで直接編集したいので、表示用テキストを持つ
  const [annualReturnPercentText, setAnnualReturnPercentText] = useState<string>(() => {
    return Number.isFinite(customAnnualReturn) ? (customAnnualReturn * 100).toFixed(1) : "5.0";
  });

  // customAnnualReturn が外から変わったら同期（リセット/初期化用）
  useMemo(() => {
    if (!Number.isFinite(customAnnualReturn)) return;
    const next = (customAnnualReturn * 100).toFixed(1);
    if (next !== annualReturnPercentText) setAnnualReturnPercentText(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customAnnualReturn]);

  const [detailsOpen, setDetailsOpen] = useState(false);

  function commitAnnualReturnFromText(raw: string) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      setCustomAnnualReturn(NaN);
      return;
    }
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      setCustomAnnualReturn(NaN);
      return;
    }
    // -100%〜100% の範囲で丸め（表示の暴走防止）
    const clamped = Math.max(-100, Math.min(100, n));
    const fixed = Math.round(clamped * 10) / 10;
    setAnnualReturnPercentText(fixed.toFixed(1));
    setCustomAnnualReturn(fixed / 100);
  }

  function formatYenLite(v: number) {
    // formatJPY は "￥" になるので、UIのトーンに合わせて "¥" に寄せる
    return formatJPY(v).replace("￥", "¥");
  }

  const summary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`毎月 ${formatYenLite(monthly)}`);
    parts.push(`${years}年`);

    const r = annualReturnPercentText?.trim();
    if (rateMode === "custom") {
      parts.push(`年率 ${r === "" ? "-" : `${r}%`}（共通）`);
    } else {
      parts.push("年率（ファンド別）");
    }

    if (initial > 0) parts.push(`初期 ${formatYenLite(initial)}`);
    return parts.join(" ・ ");
  }, [monthly, years, rateMode, annualReturnPercentText, initial]);

  function clampInt(v: number) {
    if (!Number.isFinite(v)) return 0;
    return Math.max(0, Math.trunc(v));
  }

  function stepMonthly(delta: number) {
    const next = clampInt(monthly + delta);
    // useMonthlyText の設計（blurで確定）を壊さず、ボタンは「確定操作」として扱う
    commit(String(next));
  }

  function stepYears(delta: number) {
    const next = Math.max(1, Math.min(60, Math.trunc(years + delta)));
    setYears(next);
  }

  function stepAnnualReturnPercent(delta: number) {
    // Quickは共通モードとして扱う
    if (rateMode !== "custom") setRateMode("custom");

    const current = Number(annualReturnPercentText);
    const base = Number.isFinite(current) ? current : 0;
    const next = Math.round((base + delta) * 10) / 10; // 0.1刻み
    const fixed = next.toFixed(1);
    setAnnualReturnPercentText(fixed);
    commitAnnualReturnFromText(fixed);
  }

  function stepInitial(delta: number) {
    const next = clampInt(initial + delta);
    setInitial(next);
  }

  return (
    <div className="grid gap-3">
      {/* Summary（このエリアの“見出し”）：結論ファースト */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border bg-white px-3 py-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{summary}</div>
        </div>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="shrink-0 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
          aria-haspopup="dialog"
          aria-expanded={detailsOpen}
        >
          条件変更
        </button>
      </div>

      {/* 金融庁型：3カード（モバイル縦 / sm+ 横） */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* 毎月 */}
        <label className="rounded-2xl border bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900">毎月の積立金額</div>
          <div className="mt-2 flex items-center gap-1">
            {/* 入力＋単位を1つのグループにして、ステッパーを押し出さない */}
            <div className="flex flex-1 items-center gap-1 min-w-0">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={monthlyText}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setMonthlyText(normalize(e.target.value))}
                onBlur={() => commit(monthlyText)}
                className={[
                  "min-w-0 flex-1",
                  // 見た目が崩れない最低幅（ただし小さめにして押し出しを防ぐ）
                  "min-w-[110px]",
                  "rounded-2xl border bg-white px-3 py-3 text-center text-lg font-semibold text-slate-900",
                  "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200",
                ].join(" ")}
                aria-label="毎月の積立金額（円）"
              />
              <div className="shrink-0 text-sm font-semibold text-slate-700">円</div>
            </div>
            <div className="shrink-0">
              <StepperButtons
                onDec={() => stepMonthly(-1000)}
                onInc={() => stepMonthly(1000)}
                decLabel="毎月の積立金額を1,000円減らす"
                incLabel="毎月の積立金額を1,000円増やす"
              />
            </div>
          </div>
        </label>

        {/* 利回り */}
        <label className="rounded-2xl border bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900">利回り（年率）</div>
          <div className="mt-2 flex items-center gap-1">
            <div className="flex flex-1 items-center gap-1 min-w-0">
              <input
                type="text"
                inputMode="decimal"
                value={annualReturnPercentText}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => setAnnualReturnPercentText(e.target.value)}
                onBlur={() => {
                  // Quickは「共通（custom）」の操作として扱う
                  if (rateMode !== "custom") setRateMode("custom");
                  commitAnnualReturnFromText(annualReturnPercentText);
                }}
                className={[
                  "min-w-0 flex-1",
                  "min-w-[110px]",
                  "rounded-2xl border bg-white px-3 py-3 text-center text-lg font-semibold text-slate-900",
                  "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200",
                ].join(" ")}
                aria-label="想定利回り（%）"
              />
              <div className="shrink-0 text-sm font-semibold text-slate-700">%</div>
            </div>
            <div className="shrink-0">
              <StepperButtons
                onDec={() => stepAnnualReturnPercent(-0.1)}
                onInc={() => stepAnnualReturnPercent(0.1)}
                decLabel="想定利回りを0.1%減らす"
                incLabel="想定利回りを0.1%増やす"
              />
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {rateMode === "custom" ? "共通年率" : "現在：ファンド別"}
          </div>
        </label>

        {/* 期間 */}
        <label className="rounded-2xl border bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900">積立期間</div>
          <div className="mt-2 flex items-center gap-1">
            <div className="flex flex-1 items-center gap-1 min-w-0">
              <input
                type="number"
                min={1}
                max={60}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className={[
                  "min-w-0 flex-1",
                  "min-w-[90px]",
                  "rounded-2xl border bg-white px-3 py-3 text-center text-lg font-semibold text-slate-900",
                  "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200",
                  // ネイティブ矢印は統一感を壊すので消す（Chrome/Safari）
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                ].join(" ")}
                aria-label="積立期間（年）"
              />
              <div className="shrink-0 text-sm font-semibold text-slate-700">年</div>
            </div>
            <div className="shrink-0">
              <StepperButtons
                onDec={() => stepYears(-1)}
                onInc={() => stepYears(1)}
                decLabel="積立期間を1年減らす"
                incLabel="積立期間を1年増やす"
              />
            </div>
          </div>
        </label>
      </div>

      {/* 詳細：モバイルはBottomSheet / PCは右Drawer（押し下げない） */}
      <ResponsiveSheet
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="詳細設定"
      >
        <div className="grid gap-3">
          {/* 初期投資：メインと同じカード/入力形状に統一＋±1,000円 */}
          <div className="rounded-2xl border bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-900">初期投資</div>
            <div className="mt-2 flex items-center gap-1">
              <input
                type="number"
                min={0}
                step={1000}
                value={initial}
                onChange={(e) => setInitial(clampInt(Number(e.target.value)))}
                className={[
                  "flex-1 min-w-0",
                  "min-w-[140px]",
                  "rounded-2xl border bg-white px-3 py-3 text-center text-lg font-semibold text-slate-900",
                  "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200",
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                ].join(" ")}
                aria-label="初期投資（円）"
              />
              <div className="shrink-0 text-sm font-semibold text-slate-700">円</div>
              <StepperButtons
                onDec={() => stepInitial(-1000)}
                onInc={() => stepInitial(1000)}
                decLabel="初期投資を1,000円減らす"
                incLabel="初期投資を1,000円増やす"
              />
            </div>
          </div>

          <RateDetails
            rateMode={rateMode}
            setRateMode={setRateMode}
            annualReturnPercentText={annualReturnPercentText}
            setAnnualReturnPercentText={setAnnualReturnPercentText}
            onCommitAnnualReturnPercentText={(raw) => {
              // 詳細側も blur 確定で統一（既存方針を維持）
              if (rateMode !== "custom") return;
              commitAnnualReturnFromText(raw);
            }}
          />
        </div>
      </ResponsiveSheet>
    </div>
  );
}