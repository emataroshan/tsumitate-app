// components/InputPanel.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMonthlyText } from "@/hooks/useMonthlyText";
import { useCommittedNumberText } from "@/hooks/useCommittedNumberText";
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
  const initialInputRef = useRef<HTMLInputElement | null>(null);
  // ✅ monthly は既存 hook を維持（モバイル癖対策の主戦場）
  const {
    text: monthlyText,
    setText: setMonthlyText,
    normalize,
    commit: commitMonthly,
  } = useMonthlyText({
    value: monthly,
    onCommit: setMonthly,
  });

  // 初期投資：ステップ/Enter/blur を統一（責務をhookへ）
  const initialField = useCommittedNumberText({
    value: initial,
    onCommit: setInitial,
    kind: "int",
    min: 0,
    emptyValue: 0,
  });

  // 年数：text基準でstep/Enter/blurを統一
  const yearsField = useCommittedNumberText({
    value: years,
    onCommit: setYears,
    kind: "int",
    min: 1,
    max: 60,
    emptyValue: 20,
  });

  // 年率（%）はクイックで直接編集したいので、表示用テキストを持つ
  const annualReturnField = useCommittedNumberText({
    value: Number.isFinite(customAnnualReturn) ? customAnnualReturn * 100 : NaN,
    onCommit: (percent) => {
      // Quickは共通モードとして扱う
      if (rateMode !== "custom") setRateMode("custom");
      // emptyValue が NaN のときはそのまま保持
      if (!Number.isFinite(percent)) {
        setCustomAnnualReturn(NaN);
        return;
      }
      setCustomAnnualReturn(percent / 100);
    },
    kind: "decimal",
    min: -100,
    max: 100,
    decimals: 1,
    emptyValue: NaN,
  });

  // ※ annualReturn は hook 内で value 同期するので useMemo 同期は不要

  const [detailsOpen, setDetailsOpen] = useState(false);

  function commitAnnualReturnFromText(raw: string) {
    // 既存API（RateDetails）が raw を渡してくるので、hookへ委譲
    annualReturnField.commit(raw);
  }  

  function formatYenLite(v: number) {
    // formatJPY は "￥" になるので、UIのトーンに合わせて "¥" に寄せる
    return formatJPY(v).replace("￥", "¥");
  }

  const summary = useMemo(() => {
    const parts: string[] = [];
    parts.push(`毎月 ${formatYenLite(monthly)}`);
    parts.push(`${years}年`);

    const r = annualReturnField.text?.trim();
    if (rateMode === "custom") {
      parts.push(`年率 ${r === "" ? "-" : `${r}%`}（共通）`);
    } else {
      parts.push("年率（ファンド別）");
    }

    if (initial > 0) parts.push(`初期 ${formatYenLite(initial)}`);
    return parts.join(" ・ ");
  }, [monthly, years, rateMode, annualReturnField.text, initial]);

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
                onBlur={() => commitMonthly(monthlyText)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "NumpadEnter") {
                    e.preventDefault();
                    commitMonthly(monthlyText);
                    e.currentTarget.blur();
                  }
                }}
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
                onDec={() => {
                  // monthly は既存 hook を使うので “見えてる値基準” をここで実装
                  const digits = monthlyText.replace(/[^\d]/g, "");
                  const base = digits === "" ? monthly : Number(digits);
                  const next = Math.max(0, Math.trunc(base - 1000));
                  setMonthlyText(String(next));
                  commitMonthly(String(next));
                }}
                onInc={() => {
                  const digits = monthlyText.replace(/[^\d]/g, "");
                  const base = digits === "" ? monthly : Number(digits);
                  const next = Math.max(0, Math.trunc(base + 1000));
                  setMonthlyText(String(next));
                  commitMonthly(String(next));
                }}
                decLabel="毎月の積立金額を1,000円減らす"
                incLabel="毎月の積立金額を1,000円増やす"
              />
            </div>
          </div>
        </label>

        {/* 期間 */}
        <label className="rounded-2xl border bg-slate-50 p-3">
          <div className="text-sm font-semibold text-slate-900">積立期間</div>
          <div className="mt-2 flex items-center gap-1">
            <div className="flex flex-1 items-center gap-1 min-w-0">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={yearsField.text}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  yearsField.setText(yearsField.normalizeText(e.target.value));
                }}
                onBlur={() => {
                  yearsField.commit(yearsField.text);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "NumpadEnter") {
                    e.preventDefault();
                    yearsField.commit(yearsField.text);
                    e.currentTarget.blur();
                  }
                }}
                className={[
                  "min-w-0 flex-1",
                  "min-w-[90px]",
                  "rounded-2xl border bg-white px-3 py-3 text-center text-lg font-semibold text-slate-900",
                  "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200",
                ].join(" ")}
                aria-label="積立期間（年）"
              />
              <div className="shrink-0 text-sm font-semibold text-slate-700">年</div>
            </div>
            <div className="shrink-0">
              <StepperButtons
                onDec={() => yearsField.step(-1, years)}
                onInc={() => yearsField.step(1, years)}
                decLabel="積立期間を1年減らす"
                incLabel="積立期間を1年増やす"
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
                value={annualReturnField.text}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => annualReturnField.setText(annualReturnField.normalizeText(e.target.value))}
                onBlur={() => {
                  // Quickは「共通（custom）」の操作として扱う
                  if (rateMode !== "custom") setRateMode("custom");
                  commitAnnualReturnFromText(annualReturnField.text);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "NumpadEnter") {
                    e.preventDefault();
                    if (rateMode !== "custom") setRateMode("custom");
                    commitAnnualReturnFromText(annualReturnField.text);
                    e.currentTarget.blur();
                  }
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
                onDec={() => annualReturnField.step(-0.1, Number.isFinite(customAnnualReturn) ? customAnnualReturn * 100 : 0)}
                onInc={() => annualReturnField.step(0.1, Number.isFinite(customAnnualReturn) ? customAnnualReturn * 100 : 0)}
                decLabel="想定利回りを0.1%減らす"
                incLabel="想定利回りを0.1%増やす"
              />
            </div>
          </div>
          <div className="mt-1 text-xs text-slate-600">
            {rateMode === "custom" ? "共通年率" : "現在：ファンド別"}
          </div>
        </label>
      </div>

      {/* 詳細：モバイルはBottomSheet / PCは右Drawer（押し下げない） */}
      <ResponsiveSheet
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="詳細設定"
        initialFocusRef={initialInputRef}
      >
        <div className="grid gap-3">
          {/* 初期投資：メインと同じカード/入力形状に統一＋±1,000円 */}
          <div className="rounded-2xl border bg-slate-50 p-3">
            <div className="text-sm font-semibold text-slate-900">初期投資</div>
            <div className="mt-2 flex items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={initialField.text}
                ref={initialInputRef}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => initialField.setText(initialField.normalizeText(e.target.value))}
                onBlur={() => initialField.commit(initialField.text)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "NumpadEnter") {
                    e.preventDefault();
                    initialField.commit(initialField.text);
                    e.currentTarget.blur();
                  }
                }}
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
                onDec={() => initialField.step(-1000, initial)}
                onInc={() => initialField.step(1000, initial)}
                decLabel="初期投資を1,000円減らす"
                incLabel="初期投資を1,000円増やす"
              />
            </div>
          </div>

          <RateDetails
            rateMode={rateMode}
            setRateMode={setRateMode}
            annualReturnPercentText={annualReturnField.text}
            setAnnualReturnPercentText={(v) => annualReturnField.setText(annualReturnField.normalizeText(v))}
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