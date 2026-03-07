// components/input/StepperButtons.tsx

"use client";

import { useEffect, useRef } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";

type Props = {
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
  decLabel?: string;
  incLabel?: string;
};

export default function StepperButtons({
  onDec,
  onInc,
  disabled = false,
  decLabel = "減らす",
  incLabel = "増やす",
}: Props) {
  const repeatTimer = useRef<number | null>(null);
  const delayTimer = useRef<number | null>(null);
  const activeFnRef = useRef<(() => void) | null>(null);
  const longPressTriggeredRef = useRef(false);
  const isPressed = useRef(false);

  function clearTimers() {
    if (delayTimer.current !== null) {
      window.clearTimeout(delayTimer.current);
      delayTimer.current = null;
    }

    if (repeatTimer.current !== null) {
      window.clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
  }

  function startPress(fn: () => void) {
    if (disabled) return;
    if (isPressed.current) return;

    isPressed.current = true;
    activeFnRef.current = fn;
    longPressTriggeredRef.current = false;

    delayTimer.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      fn();
      repeatTimer.current = window.setInterval(fn, 120);
    }, 300);
  }

  function stopPress() {
    if (!isPressed.current) return;
    isPressed.current = false;
    activeFnRef.current = null;
    clearTimers();
  }

  function handlePointerDown(
    e: ReactPointerEvent<HTMLButtonElement>,
    fn: () => void,
  ) {
    if (disabled) return;
    if (e.button !== 0) return;
    e.preventDefault();
    startPress(fn);
  }

  function handleClick(fn: () => void) {
    if (disabled) return;

    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    fn();
  }

  useEffect(() => {
    function handleWindowPointerUp() {
      stopPress();
    }

    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
      clearTimers();
    };
  }, []);

  function handleKey(e: ReactKeyboardEvent) {
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
        aria-label={incLabel}
        disabled={disabled}
        onClick={() => handleClick(onInc)}
        onPointerDown={(e) => handlePointerDown(e, onInc)}
        onPointerLeave={stopPress}
        onPointerCancel={stopPress}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={handleKey}
        className="h-10 w-10 touch-manipulation select-none rounded-xl bg-transparent text-slate-500 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-30"
      >
        ▲
      </button>

      <button
        type="button"
        aria-label={decLabel}
        disabled={disabled}
        onClick={() => handleClick(onDec)}
        onPointerDown={(e) => handlePointerDown(e, onDec)}
        onPointerLeave={stopPress}
        onPointerCancel={stopPress}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={handleKey}
        className="h-10 w-10 touch-manipulation select-none rounded-xl bg-transparent text-slate-500 hover:bg-slate-50 active:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-30"
      >
        ▼
      </button>
    </div>
  );
}