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
 * - hoveredFundId: PCホバー強調
 *
 * ✅ スマホ：なぞって確認（スクラブ）
 * ✅ PC：ホバーで確認
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

  const setActiveIndexClamped = useCallback((n: number) => setActiveIndex(clamp(n)), [clamp]);

  // PC：ホバー追従
  const onMouseMove = useMemo(() => {
    if (!canHover) return undefined;
    return (state: AnyState) => {
      const idx = pickIndex(state);
      if (typeof idx === "number") setActiveIndexRaf(idx);
    };
  }, [canHover, setActiveIndexRaf]);

  const onTouchMove = useCallback(
    (state: AnyState) => {
      if (canHover) return;
      const idx = pickIndex(state);
      if (typeof idx !== "number") return;
      const next = clamp(idx);
      setActiveIndexRaf(next);
    },
    [canHover, clamp, setActiveIndexRaf],
  );

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
    hoveredFundId,
    setHoveredFundId,
    handlers: {
      onMouseMove,
      onTouchMove,
      onLineEnter,
      onLineLeave,
    },
  };
}
