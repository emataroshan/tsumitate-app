// components/FundPicker.tsx

"use client";

import { Fund } from "@/lib/types";
import { formatPercent } from "@/lib/format";
import { useMemo, useState } from "react";

type Props = {
  funds: Fund[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  maxSelect?: number;
};

export default function FundPicker({
  funds,
  selectedIds,
  onToggle,
  maxSelect = 8,
}: Props) {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState<string>("");

  // 検索の“通称/略語”を吸収する（最低限からスタートして拡張可能）
  const ALIASES: Array<[string, string[]]> = [
    ["オルカン", ["オール・カントリー", "オールカントリー", "all country", "all-country", "allcountry"]],
    ["sp500", ["s&p", "s&p500", "sp 500", "米国株式"]],
    ["nasdaq", ["nasdaq100", "ナスダック", "ナスダック100"]],
  ];

  function normalize(s: string) {
    return s
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[！-／：-＠［-｀｛-～、-〜]/g, "");
  }

  function expandQuery(raw: string) {
    const n = normalize(raw);
    if (!n) return [""];
    const hits: string[] = [n];
    for (const [key, expands] of ALIASES) {
      if (n.includes(normalize(key))) {
        expands.forEach((e) => hits.push(normalize(e)));
      }
    }
    // 重複排除
    return Array.from(new Set(hits));
  }

  const tags = useMemo(() => {
    const s = new Set<string>();
    for (const f of funds) (f.tags ?? []).forEach((t) => s.add(t));
    return ["", ...Array.from(s).sort()];
  }, [funds]);

  const filtered = useMemo(() => {
    const qqs = expandQuery(q.trim());
    return funds.filter((f) => {
      const hay = normalize(`${f.name} ${(f.provider ?? "")}`);
      const okQ = qqs[0] === "" || qqs.some((qq) => hay.includes(qq));
      const okTag = !tag || (f.tags ?? []).includes(tag);
      return okQ && okTag;
    });
  }, [funds, q, tag]);

  const selectedCount = selectedIds.length;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">ファンド選択</div>
          <div className="text-sm text-slate-600">
            最大 {maxSelect} 本まで（今：{selectedCount} 本）
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="検索（例：オルカン / 楽天 / S&P）"
            className="w-56 rounded-xl border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            {tags.map((t) => (
              <option key={t} value={t}>
                {t === "" ? "タグ：すべて" : `タグ：${t}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="max-h-[520px] overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="text-left text-slate-700">
              <th className="px-3 py-2">選択</th>
              <th className="px-3 py-2">ファンド</th>
              <th className="px-3 py-2">管理費用(年率)</th>
              <th className="px-3 py-2">参考年率</th>
              <th className="px-3 py-2">タグ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => {
              const selected = selectedIds.includes(f.id);
              const disabled = !selected && selectedCount >= maxSelect;
              return (
                <tr key={f.id} className="border-t hover:bg-slate-50/60">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={disabled}
                      onChange={() => onToggle(f.id)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{f.name}</div>
                    {f.provider && <div className="text-xs text-slate-600">{f.provider}</div>}
                  </td>
                  <td className="px-3 py-2 text-slate-800">{formatPercent(f.expense_ratio, 4)}</td>
                  <td className="px-3 py-2 text-slate-800">{formatPercent(f.ref_return, 2)}</td>
                  <td className="px-3 py-2 text-xs text-slate-600">
                    {(f.tags ?? []).join(" / ")}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-slate-600">
                  該当するファンドがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
        Day6以降で、選択ファンドに対して「最終評価額」などの計算結果を出します。
      </div>
    </div>
  );
}
