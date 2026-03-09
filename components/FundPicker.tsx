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
  /** デフォルト選択の意図をユーザーに明示する（中立性/信頼のため） */
  defaultSelectionNote?: string;
  /** 全解除ボタン（状態は CompareApp が唯一の管理者なので、ここでは呼ぶだけ） */
  onClearAll?: () => void;
  /** 例に戻す（デフォルト選択に戻す） */
  onResetExample?: () => void;
};

export default function FundPicker({
  funds,
  selectedIds,
  onToggle,
  maxSelect = 8,
  defaultSelectionNote,
  onClearAll,
  onResetExample,
}: Props) {
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState(false);

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

  const filtered = useMemo(() => {
    const qqs = expandQuery(q.trim());
    return funds.filter((f) => {
      const hay = normalize(`${f.name} ${(f.provider ?? "")}`);
      const okQ = qqs[0] === "" || qqs.some((qq) => hay.includes(qq));
      return okQ;
    });
  }, [funds, q]);

  const selectedFiltered = useMemo(
    () => filtered.filter((f) => selectedIds.includes(f.id)),
    [filtered, selectedIds]
  );

  const unselectedFiltered = useMemo(
    () => filtered.filter((f) => !selectedIds.includes(f.id)),
    [filtered, selectedIds]
  );

  const selectedCount = selectedIds.length;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm overflow-hidden">
      <div className="mb-3 grid gap-3 min-w-0">
        <div className="min-w-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold whitespace-nowrap">ファンド選択</div>
            <div className="text-sm text-slate-600">
              最大 {maxSelect} 本まで（今：{selectedCount} 本）
            </div>
            {defaultSelectionNote && (
              <div className="mt-1 text-xs text-slate-500">
                {defaultSelectionNote}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
            aria-expanded={!collapsed}
          >
            {collapsed ? "選び直す" : "選択ファンドのみ表示"}
          </button>
        </div>

        <div className="grid gap-2 min-w-0">

          {!collapsed && (
            <div className="grid gap-2 min-w-0 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
              {(onClearAll || onResetExample) && (
                <div className="flex flex-wrap gap-2">
                  {onClearAll && (
                    <button
                      type="button"
                      onClick={onClearAll}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      全解除
                    </button>
                  )}
                  {onResetExample && (
                    <button
                      type="button"
                      onClick={onResetExample}
                      className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      例に戻す
                    </button>
                  )}
                </div>
              )}

              <div className="min-w-0">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="検索（例：オルカン / 楽天 / S&P）"
                  className="w-full min-w-0 rounded-xl border px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          )}
        </div> 
      </div>

      {/* Mobile: Card list (tap-friendly) */}
      <div className="sm:hidden">
        <div className="max-h-[520px] overflow-auto rounded-xl border">
          <div className="divide-y">
            {selectedFiltered.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-xs font-semibold tracking-[0.04em] text-slate-600">
                  選択中（{selectedFiltered.length}）
                </div>
                <ul className="divide-y">
                  {selectedFiltered.map((f) => {
                    const selected = true;
                    const disabled = false;
                    return (
                      <li key={f.id} className="bg-emerald-50/30 p-3">
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
                            onClick={() => onToggle(f.id)}
                            className="min-w-0 flex-1 text-left"
                            aria-pressed={selected}
                          >
                            <div className="min-w-0">
                              <div className="min-w-0 font-medium text-slate-900">
                                <span className="block truncate">{f.name}</span>
                              </div>

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
                            </div>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {!collapsed && (
              <div>
              <div className="sticky top-0 z-10 bg-slate-50 px-3 py-2 text-xs font-semibold tracking-[0.04em] text-slate-600">
                {selectedFiltered.length > 0 ? "その他の候補" : "検索結果"}
              </div>
              <ul className="divide-y">
                {unselectedFiltered.map((f) => {
                  const selected = false;
                  const disabled = selectedCount >= maxSelect;
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
                            </div>

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

                {selectedFiltered.length === 0 && unselectedFiltered.length === 0 && (
                  <li className="px-3 py-10 text-center text-sm text-slate-600">
                    該当するファンドがありません
                  </li>
                )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop/Tablet: Table */}
      <div className="hidden max-h-[520px] overflow-auto rounded-xl border sm:block lg:max-h-[calc(100vh-220px)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50">
            <tr className="text-left text-slate-700">
              <th className="px-3 py-2">選択</th>
              <th className="px-3 py-2">ファンド</th>
              <th className="px-3 py-2">管理費用(年率)</th>
              <th className="px-3 py-2">参考年率</th>
            </tr>
          </thead>
          <tbody>
            {selectedFiltered.length > 0 && (
              <tr className="border-t bg-slate-50/80">
                <td colSpan={4} className="px-3 py-2 text-xs font-semibold tracking-[0.04em] text-slate-600">
                  選択中（{selectedFiltered.length}）
                </td>
              </tr>
            )}
            {selectedFiltered.map((f) => {
              const selected = true;
              const disabled = false;
              return (
                <tr key={f.id} className="border-t bg-emerald-50/30 hover:bg-emerald-50/50">
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
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-800">{formatPercent(f.expense_ratio, 5)}</td>
                  <td className="px-3 py-2 text-slate-800">{formatPercent(f.ref_return, 2)}</td>
                </tr>
              );
            })}

            {!collapsed && selectedFiltered.length > 0 && unselectedFiltered.length > 0 && (
              <tr className="border-t bg-slate-50/80">
                <td colSpan={4} className="px-3 py-2 text-xs font-semibold tracking-[0.04em] text-slate-600">
                  その他の候補
                </td>
              </tr>
            )}

            {!collapsed && unselectedFiltered.map((f) => {
              const selected = false;
              const disabled = selectedCount >= maxSelect;
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
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-800">{formatPercent(f.expense_ratio, 5)}</td>
                  <td className="px-3 py-2 text-slate-800">{formatPercent(f.ref_return, 2)}</td>
                </tr>
              );
            })}
            {selectedFiltered.length === 0 && (!collapsed && unselectedFiltered.length === 0) && (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-slate-600">
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
