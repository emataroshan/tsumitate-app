// components/input/ResponsiveSheet.tsx

"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onApply?: () => void;
  onCancel?: () => void;
  canApply?: boolean;
  title: string;
  children: React.ReactNode;
  /**
   * Sheetを開いた瞬間にフォーカスしたい要素。
   * 入力中の再レンダーではフォーカスを奪わない（重要）。
   */
  initialFocusRef?: React.RefObject<HTMLElement | null> | null;
};

/**
 * Apple品質：モバイルはBottomSheet / PCは右Drawer
 * - レイアウトを押し下げない（結論ファーストを守る）
 * - 背景タップ/ESCで閉じる
 * - bodyスクロールロック
 *
 * NOTE: 既存プロジェクトにUI基盤（Dialog/Drawer）が無いので最小実装。
 */
export default function ResponsiveSheet({ 
  open, 
  onClose, 
  onApply,
  onCancel,
  canApply = true,
  title, 
  children, 
  initialFocusRef = null,
}: Props) {

  const panelRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);
  const titleId = useRef(`sheet-title-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!open) {
      // 次に開いたときだけ初期フォーカスを走らせる
      wasOpenRef.current = false;
      return;
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);

    // ✅ 初期フォーカスは「開いた瞬間」だけ（入力中の再レンダーで奪わない）
    if (!wasOpenRef.current) {
      wasOpenRef.current = true;
      requestAnimationFrame(() => {
        // 1) 指定があればそれを最優先（例：初期投資input）
        const preferred = initialFocusRef?.current ?? null;
        if (preferred) {
          preferred.focus();
          return;
        }
        // 2) なければパネル内の先頭フォーカス可能要素
        const root = panelRef.current;
        if (!root) return;
        const el = root.querySelector<HTMLElement>(
          'input, button, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
        );
        el?.focus();
      });
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, initialFocusRef]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId.current}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onMouseDown={onClose}
        onTouchStart={onClose}
        className="absolute inset-0 bg-black/30"
      ></div>

      {/* Panel: mobile=bottom sheet / sm+=right drawer */}
      <div
        ref={panelRef}
        className={[
          "absolute inset-x-0 bottom-0",
          "max-h-[85vh] overflow-auto",
          "rounded-t-2xl border bg-white shadow-xl",
          "p-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
          // Desktop drawer
          "sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto",
          "sm:h-full sm:max-h-none sm:w-[420px]",
          "sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onCancel ?? onClose}
            className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
          >
            キャンセル
          </button>

          <div className="text-base font-semibold text-slate-900">
            {title}
          </div>

          <button
            type="button"
            onClick={canApply ? (onApply ?? onClose) : undefined}
            disabled={!canApply}
            className={[
              "rounded-lg px-3 py-1.5 text-sm font-semibold",
              canApply
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-400 cursor-not-allowed",
            ].join(" ")}
          >
            適用
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
