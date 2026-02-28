// hooks/useElementSize.ts

"use client";

import { useEffect, useLayoutEffect, useState } from "react";

type Size = { w: number; h: number };

/**
 * DOM要素の実サイズを計測し、チャート描画に必要な
 * - size（w/h）
 * - isCompact（breakpoint未満）
 * - ready（サイズ取得済み）
 * を返す。
 *
 * ✅ 初期は matchMedia でスマホ判定（折り畳みチラつき防止）
 * ✅ 実測できたら実測優先（より正確）
 */
export function useElementSize<T extends HTMLElement>({
  ref,
  enabled,
  compactBreakpoint = 640,
}: {
  ref: React.RefObject<T | null>;
  enabled: boolean;
  compactBreakpoint?: number;
}) {
  // 初期：サイズが取れる前でもスマホはスマホ扱い（UXの安定優先）
  const [isNarrowMedia, setIsNarrowMedia] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const mq = window.matchMedia(`(max-width: ${compactBreakpoint - 1}px)`);
    const update = () => setIsNarrowMedia(mq.matches);
    update();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    } else {
      // Safari fallback
      // @ts-ignore
      mq.addListener(update);
      // @ts-ignore
      return () => mq.removeListener(update);
    }
  }, [compactBreakpoint, enabled]);

  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    if (!enabled) return;

    const el = ref.current;
    if (!el) {
      // ref が遅れて入るケース保険：次フレームで再トライ
      const id = requestAnimationFrame(() => {
        const el2 = ref.current;
        if (!el2) return;
        setSize({ w: el2.clientWidth, h: el2.clientHeight });
      });
      return () => cancelAnimationFrame(id);
    }

    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();

    // レイアウト確定が遅いケース保険：2フレーム後にもう一度
    const id1 = requestAnimationFrame(() => requestAnimationFrame(update));

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(id1);
      ro.disconnect();
    };
  }, [enabled, ref]);

  const isCompact = size.w > 0 ? size.w < compactBreakpoint : isNarrowMedia;
  const ready = size.w > 0 && size.h > 0;

  return { size, isCompact, ready };
}
