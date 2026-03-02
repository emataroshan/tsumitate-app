// components/input/StepperButtons.tsx

"use client";

type Props = {
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
  decLabel?: string;
  incLabel?: string;
};

/**
 * Apple品質：入力横の - / + を統一提供（モバイルでも確実に動く）
 */
export default function StepperButtons({
  onDec,
  onInc,
  disabled = false,
  decLabel = "減らす",
  incLabel = "増やす",
}: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onInc}
        disabled={disabled}
        className={[
          // 見た目は背景なし / 当たり判定は確保（Apple）
          "h-10 w-10 rounded-xl",
          "bg-transparent text-slate-600",
          "hover:bg-slate-50 active:bg-slate-100",
          "focus:outline-none focus:ring-2 focus:ring-slate-200",
          "disabled:opacity-40",
        ].join(" ")}
        aria-label={incLabel}
      >
        ▲
      </button>
      <button
        type="button"
        onClick={onDec}
        disabled={disabled}
        className={[
          "h-10 w-10 rounded-xl",
          "bg-transparent text-slate-600",
          "hover:bg-slate-50 active:bg-slate-100",
          "focus:outline-none focus:ring-2 focus:ring-slate-200",
          "disabled:opacity-40",
        ].join(" ")}
        aria-label={decLabel}
      >
        ▼
      </button>
    </div>
  );
}
