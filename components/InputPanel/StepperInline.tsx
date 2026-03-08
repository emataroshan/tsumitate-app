//components/InputPanel/StepperInline.tsx

"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

type Props = {
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
  decLabel?: string;
  incLabel?: string;
  children?: ReactNode;
  compact?: boolean;
};

export default function StepperInline({
  onDec,
  onInc,
  disabled = false,
  decLabel = "減らす",
  incLabel = "増やす",
  children,
  compact = false,
}: Props) {
  const repeatTimer = useRef<number | null>(null);
  const delayTimer = useRef<number | null>(null);
  const activeAction = useRef<"dec" | "inc" | null>(null);
  const longPressTriggered = useRef(false);

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

  function run(action: "dec" | "inc") {
    if (action === "dec") onDec();
    if (action === "inc") onInc();
  }

  function startPress(action: "dec" | "inc") {
    if (disabled) return;
    if (activeAction.current !== null) return;

    activeAction.current = action;
    longPressTriggered.current = false;

    delayTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      run(action);
      repeatTimer.current = window.setInterval(() => run(action), 120);
    }, 300);
  }

  function stopPress() {
    activeAction.current = null;
    clearTimers();
  }

  function handleClick(action: "dec" | "inc") {
    if (disabled) return;

    if (longPressTriggered.current) {
      longPressTriggered.current = false;
      return;
    }

    run(action);
  }

  function handleKey(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onDec();
    }

    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onInc();
    }
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

  const buttonClass = [
    "flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition",
    "hover:bg-slate-100 active:bg-slate-200",
    "focus:outline-none focus:ring-2 focus:ring-slate-200",
    "disabled:cursor-not-allowed disabled:opacity-30",
    compact ? "h-7 w-7 text-base font-semibold" : "h-8 w-8 text-lg font-semibold",
  ].join(" ");

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="値の増減">
      <button
        type="button"
        aria-label={decLabel}
        disabled={disabled}
        onClick={() => handleClick("dec")}
        onPointerDown={() => startPress("dec")}
        onPointerCancel={stopPress}
        onKeyDown={handleKey}
        className={buttonClass}
      >
        −
      </button>

      {children ? <div className="min-w-0">{children}</div> : null}

      <button
        type="button"
        aria-label={incLabel}
        disabled={disabled}
        onClick={() => handleClick("inc")}
        onPointerDown={() => startPress("inc")}
        onPointerCancel={stopPress}
        onKeyDown={handleKey}
        className={buttonClass}
      >
        +
      </button>
    </div>
  );
}