// components/InputPanel.tsx

"use client";

import type { RefObject } from "react";
import { useRef } from "react";
import { useMonthlyText } from "@/hooks/useMonthlyText";
import { useCommittedNumberText } from "@/hooks/useCommittedNumberText";
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
  monthlyInputRef?: RefObject<HTMLInputElement | null>;
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
  monthlyInputRef,
}: Props) {
  const initialInputRef = useRef<HTMLInputElement | null>(null);
  const monthlyInputId = "monthly-input";
  const yearsInputId = "years-input";
  const initialInputId = "initial-input";
  const annualReturnInputId = "annual-return-input";
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

  function commitAnnualReturnFromText(raw: string) {
    // 既存API（RateDetails）が raw を渡してくるので、hookへ委譲
    annualReturnField.commit(raw);
  }  

  // iOS設定画面型：入力幅はラベル長に影響されない（完全固定）
  const CONTROL_W = "w-[10.5rem] sm:w-[11rem]";
  const ANNUAL_RETURN_W = "w-[5.5rem]";

  const rowGridClass = 
    "grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2";
  const textInputClass = [
    CONTROL_W,
    "rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-base font-semibold tabular-nums text-slate-900",
    "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200",
  ].join(" ");
  const sectionTitleClass = "px-4 pb-2 pt-4 text-xs font-semibold tracking-[0.08em] text-slate-500";
  const annualReturnInputClass = [
    ANNUAL_RETURN_W,
    "rounded-xl border px-3 py-2 text-right text-base font-semibold tabular-nums transition",
    rateMode === "custom"
      ? "border-slate-200 bg-white text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
      : "border-slate-200 bg-slate-100 text-slate-400",
  ].join(" ");
  const radioBaseClass =
    "h-5 w-5 rounded-full border border-slate-300 bg-white ring-offset-2 transition";
  const radioCheckedClass =
    "border-slate-900 bg-slate-900 shadow-[inset_0_0_0_4px_white]";
  const radioUncheckedClass = "bg-white";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div>
        <div className={sectionTitleClass}>投資条件</div>

        {/* 毎月 */}
        <div className="px-4 py-3">
          <div className={rowGridClass}>
            <label
              htmlFor={monthlyInputId}
              className="min-w-0 text-sm font-semibold text-slate-900"
            >
              積立月額
            </label>
            <div className="flex items-center justify-end gap-2">
              <input
                id={monthlyInputId}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={monthlyText}
                ref={monthlyInputRef}
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
                className={textInputClass}
                aria-label="毎月の積立金額（円）"
              />
              <div className="shrink-0 text-sm font-semibold text-slate-700">円</div>
            </div>
            <div className="shrink-0">
              <StepperButtons
                onDec={() => {
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
        </div>

        <div className="mx-4 border-t border-slate-200" />

        <div className="px-4 py-3">
          <div className={rowGridClass}>
            <label
              htmlFor={yearsInputId}
              className="min-w-0 text-sm font-semibold text-slate-900"
            >
              積立期間
            </label>
            <div className="flex items-center justify-end gap-2">
              <input
                id={yearsInputId}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={yearsField.text}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => yearsField.setText(yearsField.normalizeText(e.target.value))}
                onBlur={() => yearsField.commit(yearsField.text)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "NumpadEnter") {
                    e.preventDefault();
                    yearsField.commit(yearsField.text);
                    e.currentTarget.blur();
                  }
                }}
                className={textInputClass}
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
        </div>

        <div className="mx-4 border-t border-slate-200" />

        <div className="px-4 py-3">
          <div className={rowGridClass}>
            <label
              htmlFor={initialInputId}
              className="min-w-0 text-sm font-semibold text-slate-900"
            >
              初期投資
            </label>
            <div className="flex items-center justify-end gap-2">
              <input
                id={initialInputId}
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
                  textInputClass,
                  "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                ].join(" ")}
                aria-label="初期投資（円）"
              />
              <div className="shrink-0 text-sm font-semibold text-slate-700">円</div>
            </div>
            <div className="shrink-0">
              <StepperButtons
                onDec={() => initialField.step(-1000, initial)}
                onInc={() => initialField.step(1000, initial)}
                decLabel="初期投資を1,000円減らす"
                incLabel="初期投資を1,000円増やす"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200" />

        <div className={sectionTitleClass}>運用条件</div>

        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50">
            <div className="px-4 py-3">
              <div
                role="radio"
                aria-checked={rateMode === "custom"}
                tabIndex={0}
                onClick={() => setRateMode("custom")}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setRateMode("custom");
                  }
                }}
                className="w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
              >
                <div className="annual-rate-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
                  <div
                    aria-hidden="true"
                    className={[
                      radioBaseClass,
                      rateMode === "custom" ? radioCheckedClass : radioUncheckedClass,
                      "mt-2",
                    ].join(" ")}
                  />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-slate-900">共通年率</div>
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                        想定
                      </span>
                    </div>
                    <div className="mt-1 pr-2 text-xs leading-5 text-slate-600">
                      すべてのファンドを同じ年率で比較
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      id={annualReturnInputId}
                      type="text"
                      inputMode="decimal"
                      value={annualReturnField.text}
                      disabled={rateMode !== "custom"}
                      onFocus={(e) => {
                        if (rateMode !== "custom") setRateMode("custom");
                        e.currentTarget.select();
                      }}
                      onChange={(e) => {
                        if (rateMode !== "custom") setRateMode("custom");
                        annualReturnField.setText(
                          annualReturnField.normalizeText(e.target.value)
                        );
                      }}
                      onBlur={() => {
                        if (rateMode !== "custom") return;
                        commitAnnualReturnFromText(annualReturnField.text);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "NumpadEnter") {
                          e.preventDefault();
                          if (rateMode !== "custom") setRateMode("custom");
                          e.currentTarget.blur();
                        }
                      }}
                      className={annualReturnInputClass}
                      aria-label="共通年率（%）"
                    />
                    <div className="shrink-0 text-sm font-semibold text-slate-700">%</div>
                    <div className="shrink-0">
                      <StepperButtons
                        disabled={rateMode !== "custom"}
                        onDec={() =>
                          annualReturnField.step(
                            -0.1,
                            Number.isFinite(customAnnualReturn) ? customAnnualReturn * 100 : 0
                          )
                        }
                        onInc={() =>
                          annualReturnField.step(
                            0.1,
                            Number.isFinite(customAnnualReturn) ? customAnnualReturn * 100 : 0
                          )
                        }
                        decLabel="共通年率を0.1%減らす"
                        incLabel="共通年率を0.1%増やす"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-4 py-3">
              <div
                role="radio"
                tabIndex={0}
                aria-checked={rateMode === "fund"}
                onClick={() => setRateMode("fund")}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    setRateMode("fund");
                  }
                }}
                className="w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                  <span
                    aria-hidden="true"
                    className={[
                      radioBaseClass,
                      rateMode === "fund" ? radioCheckedClass : radioUncheckedClass,
                      "mt-0.5",
                    ].join(" ")}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">ファンド別</div>
                    <div className="mt-1 text-xs leading-5 text-slate-600">
                      各ファンドの過去実績の年率を使用
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @media (max-width: 380px) {
            .annual-rate-row {
              grid-template-columns: auto minmax(0, 1fr);
            }
          }
        `}</style>
      </div>
    </div>
  );
}