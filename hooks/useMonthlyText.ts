// hooks/useMonthlyText.ts

"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * iOS/Android の number input の癖を避けるため、
 * monthly は text として扱い、blur で確定して数値へ正規化する。
 */
export function useMonthlyText({
  value,
  onCommit,
}: {
  value: number;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState<string>(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const normalize = useCallback((raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    if (digits === "") return "";
    return digits.replace(/^0+(?=\d)/, "");
  }, []);

  const commit = useCallback(
    (raw: string) => {
      const n = raw === "" ? 0 : Number(raw);
      const safe = Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
      onCommit(safe);
      setText(String(safe));
    },
    [onCommit],
  );

  return { text, setText, normalize, commit };
}
