  // components/InputPanel/InputPanel.tsx

  "use client";

  import type { RefObject } from "react";
  import { useRef } from "react";
  import { useMonthlyText } from "@/hooks/useMonthlyText";
  import { useCommittedNumberText } from "@/hooks/useCommittedNumberText";
  import StepperInline from "@/components/InputPanel/StepperInline";

  type Props = {
    monthly: number;
    setMonthly: (v: number) => void;
    years: number;
    setYears: (v: number) => void;
    initial: number;
    setInitial: (v: number) => void;
    rateMode: "fund" | "custom";
    setRateMode: (v: "fund" | "custom") => void;
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
    const shouldSelectOnFocusRef = useRef(false);

    const monthlyInputId = "monthly-input";
    const yearsInputId = "years-input";
    const initialInputId = "initial-input";
    const annualReturnInputId = "annual-return-input";

    const {
      text: monthlyText,
      setText: setMonthlyText,
      normalize,
      commit: commitMonthly,
    } = useMonthlyText({
      value: monthly,
      onCommit: setMonthly,
    });

    const initialField = useCommittedNumberText({
      value: initial,
      onCommit: setInitial,
      kind: "int",
      min: 0,
      emptyValue: 0,
    });

    const yearsField = useCommittedNumberText({
      value: years,
      onCommit: setYears,
      kind: "int",
      min: 1,
      max: 60,
      emptyValue: 20,
    });

    const annualReturnField = useCommittedNumberText({
      value: Number.isFinite(customAnnualReturn) ? customAnnualReturn * 100 : NaN,
      onCommit: (percent) => {
        if (rateMode !== "custom") setRateMode("custom");

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

    function commitAnnualReturnFromText(raw: string) {
      annualReturnField.commit(raw);
    }

    function markUserFocusIntent() {
      shouldSelectOnFocusRef.current = true;
    }

    function handleSelectOnUserFocus(
      e: React.FocusEvent<HTMLInputElement>
    ) {
      if (!shouldSelectOnFocusRef.current) return;
      shouldSelectOnFocusRef.current = false;
      e.currentTarget.select();
    }

    const CONTROL_W = "w-[8rem] sm:w-[9rem]";
    const ANNUAL_RETURN_W = "w-[6rem]";

    const rowGridClass =
      "grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2";

    const textInputClass = [
      "h-10",
      "min-w-0",
      CONTROL_W,
      "rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-base font-semibold tabular-nums text-slate-900",
      "focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200",
    ].join(" ");

    const annualReturnInputClass = [
      "h-10",
      "min-w-0",
      ANNUAL_RETURN_W,
      "rounded-xl border px-3 py-2 text-right text-base font-semibold tabular-nums transition",
      rateMode === "custom"
        ? "border-slate-200 bg-white text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        : "border-slate-200 bg-slate-100 text-slate-400",
    ].join(" ");

    const sectionTitleClass =
      "px-4 pb-2 pt-4 text-xs font-semibold tracking-[0.08em] text-slate-500";

    const radioBaseClass =
      "h-5 w-5 rounded-full border ring-offset-2 transition";

    const radioCheckedClass =
      "border-slate-900 bg-slate-900 shadow-[inset_0_0_0_4px_white]";

    const radioUncheckedClass = "border-slate-300 bg-white";

    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div>
          <div className={sectionTitleClass}>投資条件</div>

          {/* 積立月額 */}
          <div className="px-4 py-3">
            <div className={rowGridClass}>
              <label
                htmlFor={monthlyInputId}
                className="min-w-0 text-sm font-semibold text-slate-900"
              >
                積立月額
              </label>

              <div className="flex min-w-0 items-center justify-end gap-2">
                <StepperInline
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
                >
                  <input
                    id={monthlyInputId}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={monthlyText}
                    ref={monthlyInputRef}
                    onPointerDown={markUserFocusIntent}
                    onFocus={handleSelectOnUserFocus}
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
                </StepperInline>
              </div>

              <div className="shrink-0 text-sm font-semibold text-slate-700">円</div>
            </div>
          </div>

          <div className="mx-4 border-t border-slate-200" />

          {/* 積立期間 */}
          <div className="px-4 py-3">
            <div className={rowGridClass}>
              <label
                htmlFor={yearsInputId}
                className="min-w-0 text-sm font-semibold text-slate-900"
              >
                積立期間
              </label>

              <div className="flex min-w-0 items-center justify-end gap-2">
                <StepperInline
                  onDec={() => yearsField.step(-1, years)}
                  onInc={() => yearsField.step(1, years)}
                  decLabel="積立期間を1年減らす"
                  incLabel="積立期間を1年増やす"
                >
                  <input
                    id={yearsInputId}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={yearsField.text}
                    onPointerDown={markUserFocusIntent}
                    onFocus={handleSelectOnUserFocus}
                    onChange={(e) =>
                      yearsField.setText(yearsField.normalizeText(e.target.value))
                    }
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
                </StepperInline>
              </div>

              <div className="shrink-0 text-sm font-semibold text-slate-700">年</div>
            </div>
          </div>

          <div className="mx-4 border-t border-slate-200" />

          {/* 初期投資 */}
          <div className="px-4 py-3">
            <div className={rowGridClass}>
              <label
                htmlFor={initialInputId}
                className="min-w-0 text-sm font-semibold text-slate-900"
              >
                初期投資
              </label>

              <div className="flex min-w-0 items-center justify-end gap-2">
                <StepperInline
                  onDec={() => initialField.step(-1000, initial)}
                  onInc={() => initialField.step(1000, initial)}
                  decLabel="初期投資を1,000円減らす"
                  incLabel="初期投資を1,000円増やす"
                >
                  <input
                    id={initialInputId}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    value={initialField.text}
                    ref={initialInputRef}
                    onPointerDown={markUserFocusIntent}
                    onFocus={handleSelectOnUserFocus}
                    onChange={(e) =>
                      initialField.setText(initialField.normalizeText(e.target.value))
                    }
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
                </StepperInline>
              </div>

              <div className="shrink-0 text-sm font-semibold text-slate-700">円</div>
            </div>
          </div>

          <div className="border-t border-slate-200" />

          <div className={sectionTitleClass}>年率設定</div>

          <div className="px-4 pb-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/30">
              {/* 共通年率 */}
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
                  <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2">
                    <div
                      aria-hidden="true"
                      className={[
                        radioBaseClass,
                        rateMode === "custom" ? radioCheckedClass : radioUncheckedClass,
                        "mt-2.5",
                      ].join(" ")}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center pr-2">
                        <div
                          className={[
                            "text-sm font-semibold",
                            rateMode === "custom" ? "text-slate-900" : "text-slate-400",
                          ].join(" ")}
                        >
                          共通
                        </div>

                        <div
                          className="ml-auto flex shrink-0 items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <StepperInline
                            disabled={rateMode !== "custom"}
                            compact
                            onDec={() =>
                              annualReturnField.step(
                                -0.1,
                                Number.isFinite(customAnnualReturn)
                                  ? customAnnualReturn * 100
                                  : 0
                              )
                            }
                            onInc={() =>
                              annualReturnField.step(
                                0.1,
                                Number.isFinite(customAnnualReturn)
                                  ? customAnnualReturn * 100
                                  : 0
                              )
                            }
                            decLabel="共通年率を0.1%減らす"
                            incLabel="共通年率を0.1%増やす"
                          >
                            <input
                              id={annualReturnInputId}
                              type="text"
                              inputMode="decimal"
                              value={annualReturnField.text}
                              disabled={rateMode !== "custom"}
                              onPointerDown={markUserFocusIntent}
                              onFocus={(e) => {
                                if (rateMode !== "custom") setRateMode("custom");
                                handleSelectOnUserFocus(e);
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
                          </StepperInline>

                          <div className="shrink-0 text-sm font-semibold text-slate-700">
                            %
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 pr-2 text-xs leading-5 text-slate-600">
                        すべてのファンドを同じ年率で比較します
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ファンド別 */}
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
                      <div
                        className={[
                          "text-sm font-semibold",
                          rateMode === "fund" ? "text-slate-900" : "text-slate-400",
                        ].join(" ")}
                      >
                        ファンド別リターン
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-600">
                        各ファンドの過去5年のリターン年率を参考に比較します
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }