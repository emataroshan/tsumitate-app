// hooks/useChartInteraction.ts

"use client";

import { useCallback, useMemo, useRef, useState } from "react";

type AnyState = any;

function pickIndex(state: AnyState): number | null {
  const idx =
    typeof state?.activeTooltipIndex === "number"
      ? state.activeTooltipIndex
      : typeof state?.activeLabel === "number"
        ? state.activeLabel
        : null;
  return typeof idx === "number" ? idx : null;
}

/**
 * チャートの操作（PC/スマホの挙動差）を1箇所に集約。
 * - activeIndex: 現在見ている時点
 * - isPinned: 固定中か
 * - hoveredFundId: PCホバー強調
 *
 * ✅ スマホ：なぞって確認（スクラブ）/ タップで固定
 * ✅ PC：ホバーで確認 / クリックで固定（解除はUI側ボタン推奨）
 */
export function useChartInteraction({
  months,
  canHover,
  initialIndex,
}: {
  months: number;
  canHover: boolean;
  initialIndex: number;
}) {
  const clamp = useCallback((n: number) => Math.min(Math.max(n, 0), months), [months]);

  const [activeIndex, setActiveIndex] = useState<number>(clamp(initialIndex));
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [hoveredFundId, setHoveredFundId] = useState<string | null>(null);

  // ✅ スクラブ時の setState 連打を rAF で間引き（操作の気持ちよさ＆警告抑制）
  const rafRef = useRef<number | null>(null);
  const pendingIndexRef = useRef<number | null>(null);
  const setActiveIndexRaf = useCallback(
    (n: number) => {
      pendingIndexRef.current = clamp(n);
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingIndexRef.current == null) return;
        setActiveIndex(pendingIndexRef.current);
      });
    },
    [clamp],
  );

  // --- Mobile scrub detection ---
  const touchRef = useRef<{ startIdx: number | null; moved: boolean }>({
    startIdx: null,
    moved: false,
  });

  const clearPin = useCallback(() => setIsPinned(false), []);
  const setActiveIndexClamped = useCallback((n: number) => setActiveIndex(clamp(n)), [clamp]);

  // PC：固定していない間だけホバー追従
  const onMouseMove = useMemo(() => {
    if (!canHover || isPinned) return undefined;
    return (state: AnyState) => {
      const idx = pickIndex(state);
      if (typeof idx === "number") setActiveIndexRaf(idx);
    };
  }, [canHover, isPinned, setActiveIndexRaf]);

  // PC：クリック = その地点で固定（ON）
  // Mobile：onClick は環境によって発火するので “固定ON” に寄せる（touchEndが主役）
  const onClick = useCallback(
    (state: AnyState) => {
      const idx = pickIndex(state);
      if (typeof idx !== "number") return;
      setActiveIndex(clamp(idx));
      setIsPinned(true);
    },
    [clamp],
  );

  // Mobile：スクラブ（なぞって確認）
  const onTouchStart = useCallback(
    (state: AnyState) => {
      if (canHover) return;
      const idx = pickIndex(state);
      touchRef.current.startIdx = typeof idx === "number" ? clamp(idx) : null;
      touchRef.current.moved = false;
      if (typeof idx === "number") setActiveIndex(clamp(idx));
    },
    [canHover, clamp],
  );

  const onTouchMove = useCallback(
    (state: AnyState) => {
      if (canHover) return;
      const idx = pickIndex(state);
      if (typeof idx !== "number") return;
      const next = clamp(idx);
      setActiveIndexRaf(next);
      if (touchRef.current.startIdx !== null && next !== touchRef.current.startIdx) {
        touchRef.current.moved = true;
      }
    },
    [canHover, clamp, setActiveIndexRaf],
  );

  const onTouchEnd = useCallback(() => {
    if (canHover) return;
    // ✅ 動いた（スクラブ）なら固定しない＝誤固定を防ぐ
    // ✅ 動いてない（タップ）なら固定ON
    if (touchRef.current.moved) {
      setIsPinned(false);
    } else {
      setIsPinned(true);
    }
    touchRef.current.startIdx = null;
    touchRef.current.moved = false;
  }, [canHover]);

  // PCホバー強調：スマホでは不要
  const onLineEnter = useCallback(
    (id: string) => {
      if (!canHover) return;
      setHoveredFundId(id);
    },
    [canHover],
  );
  const onLineLeave = useCallback(() => {
    if (!canHover) return;
    setHoveredFundId(null);
  }, [canHover]);

  return {
    activeIndex,
    setActiveIndex: setActiveIndexClamped,
    isPinned,
    setIsPinned,
    hoveredFundId,
    setHoveredFundId,
    clearPin,
    handlers: {
      onMouseMove,
      onClick,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onLineEnter,
      onLineLeave,
    },
  };
}
