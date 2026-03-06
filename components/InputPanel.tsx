// components/InputPanel.tsx

"use client";

import type { RefObject } from "react";
import { useRef } from "react";
import { useMonthlyText } from "@/hooks/useMonthlyText";
import { useCommittedNumberText } from "@/hooks/useCommittedNumberText";
import RateDetails from "@/components/input/RateDetails";
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
  const CONTROL_W = "w-[12.5rem]"; // 200px

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="divide-y divide-slate-200">
        {/* 毎月 */}
        <label className="block px-4 py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2">
            <div className="min-w-0 text-sm font-semibold text-slate-900">
              毎月の積立金額
            </div>
            <div className="flex items-center justify-end gap-2">
              <input
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
                className={[
                  CONTROL_W,
                  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-base font-semibold tabular-nums text-slate-900",
                  "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200",
                ].join(" ")}
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
        </label>

        {/* 期間 */}
        <label className="block px-4 py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2">
            <div className="min-w-0 text-sm font-semibold text-slate-900">積立期間</div>
            <div className="flex items-center justify-end gap-2">
              <input
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
                className={[
                  CONTROL_W,
                  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-base font-semibold tabular-nums text-slate-900",
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

        {/* 年率 */}
        <div className="px-4 py-3">
          <RateDetails
            rateMode={rateMode}
            setRateMode={setRateMode}
            annualReturnPercentText={annualReturnField.text}
            setAnnualReturnPercentText={(v) =>
              annualReturnField.setText(annualReturnField.normalizeText(v))
            }
            onCommitAnnualReturnPercentText={(raw) => {
              if (rateMode !== "custom") return;
              commitAnnualReturnFromText(raw);
            }}
            onDecAnnualReturn={() =>
              annualReturnField.step(
                -0.1,
                Number.isFinite(customAnnualReturn) ? customAnnualReturn * 100 : 0
              )
            }
            onIncAnnualReturn={() =>
              annualReturnField.step(
                0.1,
                Number.isFinite(customAnnualReturn) ? customAnnualReturn * 100 : 0
              )
            }
            controlWidthClass={CONTROL_W}
          />
        </div>

        {/* 初期投資 */}
        <label className="block px-4 py-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2">
            <div className="min-w-0 text-sm font-semibold text-slate-900">初期投資</div>
            <div className="flex items-center justify-end gap-2">
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
                  CONTROL_W,
                  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-base font-semibold tabular-nums text-slate-900",
                  "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200",
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
        </label>
      </div>
    </div>
  );
}