// hooks/usePointerCapabilities.ts

"use client";

import { useEffect, useState } from "react";

/**
 * 入力デバイスの能力（hoverできるか）を判定。
 * - PC（マウス/トラックパッド）: canHover=true
 * - スマホ/タブレット（主にタッチ）: canHover=false
 */
export function usePointerCapabilities() {
  const [canHover, setCanHover] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanHover(mq.matches);
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
  }, []);

  return { canHover };
}
