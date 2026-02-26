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
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-lg font-semibold">ファンド選択</div>
          <div className="text-sm text-slate-600">
            最大 {maxSelect} 本まで（今：{selectedCount} 本）
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="検索（例：オルカン / 楽天 / S&P）"
            className="w-full rounded-xl border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-56"
          />
          <select
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full rounded-xl border px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 sm:w-auto"
          >
            {tags.map((t) => (
              <option key={t} value={t}>
                {t === "" ? "タグ：すべて" : `タグ：${t}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile: Card list (tap-friendly) */}
      <div className="sm:hidden">
        <div className="max-h-[520px] overflow-auto rounded-xl border">
          <ul className="divide-y">
            {filtered.map((f) => {
              const selected = selectedIds.includes(f.id);
              const disabled = !selected && selectedCount >= maxSelect;
              return (
                <li key={f.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <label className="mt-1 inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={disabled}
                        onChange={() => onToggle(f.id)}
                        className="h-5 w-5"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => !disabled && onToggle(f.id)}
                      className="min-w-0 flex-1 text-left"
                      aria-pressed={selected}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="min-w-0 font-medium text-slate-900">
                            <span className="block truncate">{f.name}</span>
                          </div>
                          {selected && (
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                              選択中
                            </span>
                          )}
                        </div>
                        {f.provider && <div className="mt-0.5 text-xs text-slate-600">{f.provider}</div>}

                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-slate-50 px-2 py-1">
                            <div className="text-slate-500">管理費用</div>
                            <div className="font-semibold tabular-nums text-slate-900">
                              {formatPercent(f.expense_ratio, 5)}
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-50 px-2 py-1">
                            <div className="text-slate-500">参考年率</div>
                            <div className="font-semibold tabular-nums text-slate-900">
                              {formatPercent(f.ref_return, 2)}
                            </div>
                          </div>
                        </div>

                        {(f.tags ?? []).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(f.tags ?? []).slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
                              >
                                {t}
                              </span>
                            ))}
                            {(f.tags ?? []).length > 3 && (
                              <span className="text-[11px] text-slate-500">+{(f.tags ?? []).length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  </div>

                  {disabled && (
                    <div className="mt-2 text-[11px] text-rose-600">
                      これ以上選択できません（最大 {maxSelect} 本）
                    </div>
                  )}
                </li>
              );
            })}

            {filtered.length === 0 && (
              <li className="px-3 py-10 text-center text-sm text-slate-600">
                該当するファンドがありません
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Desktop/Tablet: Table */}
      <div className="hidden max-h-[520px] overflow-auto rounded-xl border sm:block">
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
                    <div className="font-medium text-slate-900">
                      {f.name}

                      {selected && (
                        <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                          選択中
                        </span>
                      )}
                    </div>
                    {f.provider && <div className="text-xs text-slate-600">{f.provider}</div>}
                  </td>
                  <td className="px-3 py-2 text-slate-800">{formatPercent(f.expense_ratio, 5)}</td>
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
    </div>
  );
}
