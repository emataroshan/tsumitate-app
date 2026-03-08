// components/InputPanel/Tooltip.tsx

"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TipId = string;

/**
 * 1つの吹き出しで統一：スマホは click、PCは hover/focus でも表示。
 * グローバルに影響を出さないため、コンポーネント内で閉じ制御。
 */
export default function Tooltip({
  id,
  text,
  ariaLabel = "説明を表示",
}: {
  id: TipId;
  text: string;
  ariaLabel?: string;
}) {
  const [openId, setOpenId] = useState<TipId | null>(null);
  const open = openId === id;
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; maxWidth: number } | null>(null);

  // hover可能デバイスだけ hover で開く（iOS等は click のみ）
  const canHover = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches ?? false;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (openId === null) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node | null;
      if (!(target instanceof Node)) return;
      const root = document.querySelector(`[data-tip-root="${openId}"]`);
      if (!root) {
        setOpenId(null);
        return;
      }
      if (!root.contains(target)) setOpenId(null);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenId(null);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openId]);

  // Tooltip位置をviewport内にクランプ（親のoverflowに影響されない）
  useLayoutEffect(() => {
    if (!open) return;

    function update() {
      const btn = btnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const vw = window.innerWidth;
      const margin = 12;
      const maxW = Math.min(360, vw - margin * 2);

      // まず中央寄せを狙い、左右はviewport内に収める
      // 幅は後で実測して詰めるので、ここでは「だいたい中央」に置く
      const idealLeft = r.left + r.width / 2 - maxW / 2;
      const left = Math.max(margin, Math.min(vw - margin - maxW, idealLeft));
      const top = r.bottom + 8; // ボタンの下に出す

      setPos({ top, left, maxWidth: maxW });
    }

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // 閉じたら位置情報もクリア（再オープン時のズレ防止）
  useEffect(() => {
    if (!open) setPos(null);
  }, [open]);

  // 描画後に実測して、左右をより正確にクランプ（右余白がスカスカ問題を解消）
  useLayoutEffect(() => {
    if (!open) return;
    if (!pos) return;
    const el = tipRef.current;
    if (!el) return;

    const vw = window.innerWidth;
    const margin = 12;
    const w = el.getBoundingClientRect().width;
    const clampedLeft = Math.max(margin, Math.min(vw - margin - w, pos.left));
    if (clampedLeft !== pos.left) {
      setPos({ ...pos, left: clampedLeft });
    }
    // pos.left のみ再計算したいので依存は最小
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pos?.left, pos?.top]);

  return (
    <span data-tip-root={id} className="relative inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpenId(open ? null : id);
        }}
        ref={btnRef}
        onMouseEnter={
          canHover
            ? () => {
                setOpenId(id);
              }
            : undefined
        }
        onMouseLeave={
          canHover
            ? () => {
                setOpenId(null);
              }
            : undefined
        }
        onFocus={() => setOpenId(id)}
        onBlur={() => setOpenId(null)}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs text-slate-400 active:border-slate-500 active:text-slate-600"
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        i
      </button>

      {mounted && open && pos
        ? createPortal(
            <div
              ref={tipRef}
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                maxWidth: pos.maxWidth,
                width: "max-content",
              }}
              className={[
                "z-50",
                "rounded-lg border bg-white p-2",
                "text-xs text-slate-600 shadow-md",
                // \n を改行として扱う（Apple品質）
                "whitespace-pre-line break-words",
              ].join(" ")}
              role="tooltip"
            >
              {text}
            </div>,
            document.body
          )
        : null}
    </span>
  );
}
