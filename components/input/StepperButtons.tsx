// components/input/StepperButtons.tsx

"use client";

import { useCallback, useEffect, useRef } from "react";

type Props = {
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
  decLabel?: string;
  incLabel?: string;
};

/**
 * Apple品質 Stepper
 *
 * 責務：
 * 数値の増減操作UIのみ提供（状態は持たない）
 *
 * 提供機能：
 * - click
 * - keyboard
 * - long press repeat（iOS標準）
*/
export default function StepperButtons({
  onDec,
  onInc,
  disabled = false,
  decLabel = "減らす",
  incLabel = "増やす",
}: Props) {
  const incTimer = useRef<number | null>(null);
  const decTimer = useRef<number | null>(null);
  // pointer操作時は、後続の click を抑止（1タップ2回発火を防ぐ）
  const suppressIncClick = useRef(false);
  const suppressDecClick = useRef(false);

  const startRepeat = useCallback((fn: () => void, ref: React.MutableRefObject<number | null>) => {
    if (disabled) return;

    fn(); // 初回即実行

    ref.current = window.setInterval(fn, 120); // Apple近似速度
  }, [disabled]);

  const stopRepeat = useCallback((ref: React.MutableRefObject<number | null>) => {
    if (ref.current !== null) {
      clearInterval(ref.current);
      ref.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopRepeat(incTimer);
      stopRepeat(decTimer);
    };
  }, [stopRepeat]);

  function handleKey(e: React.KeyboardEvent) {
    if (disabled) return;

    if (e.key === "ArrowUp") {
      e.preventDefault();
      onInc();
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      onDec();
    }
  }

  return (
    <div
      className="flex flex-col items-center gap-1"
      role="group"
      aria-label="値の増減"
    >
      <button
        type="button"
        onClick={() => {
          // pointerタップ後に発火する click を抑止（2回増えるのを防ぐ）
          if (suppressIncClick.current) {
            suppressIncClick.current = false;
            return;
          }
          onInc();
        }}
        onPointerDown={() => {
          suppressIncClick.current = true;
          startRepeat(onInc, incTimer);
        }}
        onPointerUp={() => stopRepeat(incTimer)}
        onPointerLeave={() => {
          stopRepeat(incTimer);
          // leave/cancelは click が来ないケースが多いのでここで解除
          suppressIncClick.current = false;
        }}
        onPointerCancel={() => {
          stopRepeat(incTimer);
          suppressIncClick.current = false;
        }}
        onKeyDown={handleKey}
        disabled={disabled}
        className={[
          "h-10 w-10 rounded-xl",
          "bg-transparent text-slate-500",
          "hover:bg-slate-50 active:bg-slate-100",
          "focus:outline-none focus:ring-2 focus:ring-slate-200",
          "transition-colors",
          "disabled:opacity-30",
        ].join(" ")}
        aria-label={incLabel}
      >
        ▲
      </button>
      <button
        type="button"
        onClick={() => {
          if (suppressDecClick.current) {
            suppressDecClick.current = false;
            return;
          }
          onDec();
        }}
        onPointerDown={() => {
          suppressDecClick.current = true;
          startRepeat(onDec, decTimer);
        }}
        onPointerUp={() => stopRepeat(decTimer)}
        onPointerLeave={() => {
          stopRepeat(decTimer);
          suppressDecClick.current = false;
        }}
        onPointerCancel={() => {
          stopRepeat(decTimer);
          suppressDecClick.current = false;
        }}
        onKeyDown={handleKey}
        disabled={disabled}
        className={[
          "h-10 w-10 rounded-xl",
          "bg-transparent text-slate-500",
          "hover:bg-slate-50 active:bg-slate-100",
          "focus:outline-none focus:ring-2 focus:ring-slate-200",
          "transition-colors",
          "disabled:opacity-30",
        ].join(" ")}
        aria-label={decLabel}
      >
        ▼
      </button>
    </div>
  );
}
