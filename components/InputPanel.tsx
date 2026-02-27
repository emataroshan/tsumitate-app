// components/InputPanel.tsx

"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

  // iOS/Android の number input は「先頭だけ消しても 0 が残る」等の挙動が出やすいので、
  // monthly は文字列として扱い、確定（blur）時に数値へ正規化する。
  const [monthlyText, setMonthlyText] = useState<string>(String(monthly));

  useEffect(() => {
    // 外部から monthly が変わった場合（リセット等）に同期
    setMonthlyText(String(monthly));
  }, [monthly]);

  function normalizeIntText(raw: string) {
    // 数字以外を除去
    const digits = raw.replace(/[^\d]/g, "");
    if (digits === "") return "";
    // 先頭ゼロを除去（ただし "0" は許容）
    const trimmed = digits.replace(/^0+(?=\d)/, "");
    return trimmed;
  }

  function commitMonthly(raw: string) {
    const n = raw === "" ? 0 : Number(raw);
    const safe = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
    setMonthly(safe);
    setMonthlyText(String(safe));
  }

  // tooltip open state (mobile tap対応)
  const [openTip, setOpenTip] = useState<null | "custom" | "fund">(null);
  const tipRootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openTip === null) return;

    function onPointerDown(e: PointerEvent) {
      const root = tipRootRef.current;
      if (!root) return;
      const target = e.target as Node | null;
      if (target && !root.contains(target)) setOpenTip(null);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenTip(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openTip]);

  function Tooltip({
    id,
    text,
  }: {
    id: "custom" | "fund";
    text: string;
  }) {
    const open = openTip === id;
    return (
      <span className="relative inline-flex group">
        <button
          type="button"
          onClick={() => setOpenTip(open ? null : id)}
          className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-400 active:border-slate-500 active:text-slate-600"
          aria-label="説明を表示"
          aria-expanded={open}
        >
          i
        </button>

        {/* 1つの吹き出しで統一：スマホはclick、PCはhover/focusでも表示 */}
        <span
          className={[
            "absolute left-1/2 top-7 z-20 w-72 -translate-x-1/2 rounded-lg border bg-white p-2 text-xs text-slate-600 shadow-md transition-opacity",
            open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
            "sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
          ].join(" ")}
        >
          {text}
        </span>
      </span>
    );
  }

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-lg font-semibold">積立条件</div>
        <div className="text-sm text-slate-600">共通の条件で比較できます</div>
      </div>

      <div className="grid gap-3" ref={tipRootRef}>
        <label className="grid gap-1">
          <span className="text-sm text-slate-700">毎月積立額（円）</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            value={monthlyText}
            onFocus={(e) => {
              // ワンタップで全選択 → 入れ直しが楽（スマホで特に効く）
              e.currentTarget.select();
            }}
            onChange={(e) => {
              setMonthlyText(normalizeIntText(e.target.value));
            }}
            onBlur={() => commitMonthly(monthlyText)}
            className="rounded-xl border px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-slate-700">積立期間（年）</span>
          <input
            type="number"
            min={1}
            max={60}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="rounded-xl border px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-slate-700">初期投資（円）</span>
          <input
            type="number"
            min={0}
            step={10000}
            value={initial}
            onChange={(e) => setInitial(Number(e.target.value))}
            className="rounded-xl border px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
        </label>

        <div className="grid gap-2 rounded-xl border bg-slate-50 p-3">
          <div className="text-sm font-medium text-slate-800">年率</div>
          
          <div className="grid gap-1">
            <label className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name="rateMode"
                value="custom"
                checked={rateMode === "custom"}
                onChange={() => setRateMode("custom")}
              />
              <span className="flex items-center gap-2">
                想定年率（共通）で計算

                <Tooltip id="custom" text="すべてのファンドを同じ条件で比較するための年率です" />
              </span>
            </label>

            <div className="flex items-center gap-2 pl-6">
              <input
                type="number"
                min={-100}
                max={100}
                step={0.1}
                value={Number.isFinite(customAnnualReturn) ? (customAnnualReturn * 100).toFixed(1) : ""}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setCustomAnnualReturn(Number.isFinite(v) ? v / 100 : NaN);
                }}
                disabled={rateMode !== "custom"}
                className={`w-28 rounded-xl border px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 ${
                  rateMode !== "custom" ? "opacity-50" : ""
                }`}
                aria-label="想定年率（%）"
              />
              <span className={`text-sm ${rateMode !== "custom" ? "text-slate-500" : "text-slate-700"}`}>%</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="radio"
              name="rateMode"
              value="fund"
              checked={rateMode === "fund"}
              onChange={() => setRateMode("fund")}
            />
            <span className="flex items-center gap-2">
              参考年率（ファンドごと）で計算

              <Tooltip
                id="fund"
                text="各ファンドの過去の実績（主に5年、未満の場合は3年・1年など）をもとにした参考値です。"
              />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}