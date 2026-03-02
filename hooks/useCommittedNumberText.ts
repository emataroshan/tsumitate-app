// hooks/useCommittedNumberText.ts

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Options = {
  /** 外部の確定値（数値） */
  value: number;
  /** 確定時に呼ばれる */
  onCommit: (v: number) => void;

  /** 表示の種類 */
  kind: "int" | "decimal";

  /** min/max（clamp） */
  min?: number;
  max?: number;

  /** 小数の桁数（decimalのみ） */
  decimals?: number;

  /**
   * 空入力時の確定値
   * - int系：0
   * - 年率%：NaN も可（空=未設定扱い）
   */
  emptyValue?: number;

  /**
   * value -> text の表示フォーマット
   * 未指定時は kind に応じて自動。
   */
  format?: (v: number) => string;

  /**
   * 入力中の正規化
   * 未指定時は kind に応じて自動。
   */
  normalize?: (raw: string) => string;
};

function clampNumber(n: number, min?: number, max?: number) {
  let v = n;
  if (Number.isFinite(min as number)) v = Math.max(min as number, v);
  if (Number.isFinite(max as number)) v = Math.min(max as number, v);
  return v;
}

function defaultNormalizeInt(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits === "") return "";
  return digits.replace(/^0+(?=\d)/, "");
}

function defaultNormalizeDecimal(raw: string) {
  // 許可：先頭の - と 1つ目の . と数字
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  let s = trimmed.replace(/[^\d\.\-]/g, "");
  // "-" は先頭のみ
  s = s.replace(/(?!^)-/g, "");
  // "." は1つだけ
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, "");
  }
  // "-." -> "-"（入力途中の暴走防止）
  if (s === "-.") return "-";
  return s;
}

export function useCommittedNumberText(opts: Options) {
  const {
    value,
    onCommit,
    kind,
    min,
    max,
    decimals = 1,
    emptyValue = 0,
    format,
    normalize,
  } = opts;

  const formatValue = useMemo(() => {
    if (format) return format;
    if (kind === "int") return (v: number) => String(Math.trunc(v));
    return (v: number) => {
      // decimal の display は固定小数。NaN は表示を触らない（空入力の維持）
      if (!Number.isFinite(v)) return "";
      return Number(v).toFixed(decimals);
    };
  }, [format, kind, decimals]);

  const normalizeText = useMemo(() => {
    if (normalize) return normalize;
    return kind === "int" ? defaultNormalizeInt : defaultNormalizeDecimal;
  }, [normalize, kind]);

  const [text, setText] = useState<string>(() => {
    if (!Number.isFinite(value)) return "";
    return formatValue(value);
  });

  // 外部valueが変わったら同期（ただし NaN のときは空のまま維持）
  useEffect(() => {
    if (!Number.isFinite(value)) {
      // 既存方針：NaN を強制的に表示上書きしない
      return;
    }
    const next = formatValue(value);
    setText(next);
  }, [value, formatValue]);

  const parse = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (t === "") return emptyValue;
      const n = Number(t);
      if (!Number.isFinite(n)) return emptyValue;
      if (kind === "int") return Math.trunc(n);
      // decimal は丸めは commit 側で行う
      return n;
    },
    [emptyValue, kind],
  );

  const commit = useCallback(
    (raw: string) => {
      const t = raw.trim();
      if (t === "") {
        onCommit(emptyValue);
        // emptyValue が NaN の場合は「空」を維持したい（年率）
        if (!Number.isFinite(emptyValue)) {
          setText("");
          return;
        }
        setText(formatValue(emptyValue));
        return;
      }

      const n0 = parse(t);
      if (!Number.isFinite(n0)) {
        onCommit(emptyValue);
        if (!Number.isFinite(emptyValue)) {
          setText("");
          return;
        }
        setText(formatValue(emptyValue));
        return;
      }

      let n = n0;
      // decimal の桁丸め（表示と確定を一致させる）
      if (kind === "decimal") {
        const p = Math.pow(10, decimals);
        n = Math.round(n * p) / p;
      }
      n = clampNumber(n, min, max);

      onCommit(n);
      setText(formatValue(n));
    },
    [onCommit, emptyValue, formatValue, parse, kind, decimals, min, max],
  );

  const step = useCallback(
    (delta: number, fallbackValue: number) => {
      // ✅ “見えている値”を最優先にステップする
      const base = (() => {
        const t = text.trim();
        if (t === "") return fallbackValue;
        const n = Number(t);
        if (!Number.isFinite(n)) return fallbackValue;
        return kind === "int" ? Math.trunc(n) : n;
      })();

      let next = base + delta;
      if (kind === "decimal") {
        const p = Math.pow(10, decimals);
        next = Math.round(next * p) / p;
      } else {
        next = Math.trunc(next);
      }
      next = clampNumber(next, min, max);

      onCommit(next);
      setText(formatValue(next));
    },
    [text, onCommit, formatValue, kind, decimals, min, max],
  );

  const onKeyDownCommit = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === "NumpadEnter") {
        e.preventDefault();
        commit(text);
        e.currentTarget.blur();
      }
    },
    [commit, text],
  );

  return {
    text,
    setText,
    normalizeText,
    commit,
    step,
    onKeyDownCommit,
  };
}
