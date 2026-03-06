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
  const incPressDelay = useRef<number | null>(null);
  const decPressDelay = useRef<number | null>(null);
  const suppressIncClick = useRef(false); // 長押し開始後の click を抑止
  const suppressDecClick = useRef(false); // 長押し開始後の click を抑止

  const startRepeat = useCallback(
    (fn: () => void, ref: React.MutableRefObject<number | null>) => {
      if (disabled) return;
      ref.current = window.setInterval(fn, 120);
    },
    [disabled]
  );

  const stopRepeat = useCallback((ref: React.MutableRefObject<number | null>) => {
    if (ref.current !== null) {
      clearInterval(ref.current);
      ref.current = null;
    }
  }, []);

  const clearPressDelay = useCallback((ref: React.MutableRefObject<number | null>) => {
    if (ref.current !== null) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  }, []);

  const startLongPress = useCallback((
    fn: () => void,
    timerRef: React.MutableRefObject<number | null>,
    delayRef: React.MutableRefObject<number | null>,
    suppressClickRef: React.MutableRefObject<boolean>,
  ) => {
    if (disabled) return;

    suppressClickRef.current = false;
    clearPressDelay(delayRef);
    delayRef.current = window.setTimeout(() => {
      suppressClickRef.current = true;
      fn(); // 長押し成立時に初回実行
      startRepeat(fn, timerRef);
    }, 300);
  }, [clearPressDelay, disabled, startRepeat]);

  useEffect(() => {
    return () => {
      stopRepeat(incTimer);
      stopRepeat(decTimer);
      clearPressDelay(incPressDelay);
      clearPressDelay(decPressDelay);
    };
  }, [clearPressDelay, stopRepeat]);

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
          if (suppressIncClick.current) {
            suppressIncClick.current = false;
            return;
          }
          onInc();
        }}
        onPointerDown={() => {
          startLongPress(onInc, incTimer, incPressDelay, suppressIncClick);
        }}
        onPointerUp={() => {
          clearPressDelay(incPressDelay);
          stopRepeat(incTimer);
        }}
        onPointerLeave={() => {
          clearPressDelay(incPressDelay);
          stopRepeat(incTimer);
          // leave/cancelは click が来ないケースが多いのでここで解除
          suppressIncClick.current = false;
        }}
        onPointerCancel={() => {
          clearPressDelay(incPressDelay);
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
          startLongPress(onDec, decTimer, decPressDelay, suppressDecClick);
        }}
        onPointerUp={() => {
          clearPressDelay(decPressDelay);
          stopRepeat(decTimer);
        }}
        onPointerLeave={() => {
          clearPressDelay(decPressDelay);
          stopRepeat(decTimer);
          suppressDecClick.current = false;
        }}
        onPointerCancel={() => {
          clearPressDelay(decPressDelay);
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
