// components/BalanceChart.tsx

"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Fund } from "@/lib/types";
import { simulateSeries } from "@/lib/calc";
import {
  ComposedChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";

type Props = {
  selectedFunds: Fund[];
  monthly: number;
  years: number;
  initial: number;
  rateMode: "fund" | "custom";
  customAnnualReturn: number; // 小数（例：0.07）
};

export default function BalanceChart({
  selectedFunds,
  monthly,
  years,
  initial,
  rateMode,
  customAnnualReturn,
}: Props) {
  const hasSelection = selectedFunds.length > 0;

  // ---- mobile 判定（結論を早く見せるため：スマホは情報を畳む）----
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    // Safari 対応
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    } else {
      // @ts-ignore
      mq.addListener(update);
      // @ts-ignore
      return () => mq.removeListener(update);
    }
  }, []);

  // 1フレーム待ってから描画（初回レイアウト未確定対策）
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ✅ div サイズを計測して、ComposedChartに数値で渡す（ResponsiveContainerを使わない）
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    // hasSelection=false のときは chartHostRef の div 自体が描画されないので
    // hasSelection も dependency に含めて「表示された瞬間」に必ず計測を開始する
    if (!ready || !hasSelection) return;

    const el = chartHostRef.current;
    if (!el) {
      // 念のため：次フレームで再トライ（ref が遅れて入るケース）
      const id = requestAnimationFrame(() => {
        const el2 = chartHostRef.current;
        if (!el2) return;
        setChartSize({ w: el2.clientWidth, h: el2.clientHeight });
      });
      return () => cancelAnimationFrame(id);
    }

    const update = () => setChartSize({ w: el.clientWidth, h: el.clientHeight });
    update(); // 初回

    // レイアウト確定が遅いケース保険：2フレーム後にもう一度
    const id1 = requestAnimationFrame(() => requestAnimationFrame(update));

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(id1);
      ro.disconnect();
    };
  }, [ready, hasSelection]);

  // ⚠️ Hooks は条件分岐より前で必ず同じ順序で呼ぶ
  const [hoveredFundId, setHoveredFundId] = useState<string | null>(null);
  // どの時点（month index）を見ているか：PCはホバーで更新 / スマホはタップで固定
  const [activeIndex, setActiveIndex] = useState<number>(years * 12); // 初期は最終月
  useEffect(() => {
    setActiveIndex(years * 12);
  }, [years]);

  // スマホは「結論まで最短」：スナップショットはデフォルト折りたたみ
  const [showSnapshotDetails, setShowSnapshotDetails] = useState(true);
  useEffect(() => {
    setShowSnapshotDetails(!isMobile);
  }, [isMobile]);

  // 各ファンドのシリーズを計算（ready/未選択でも Hook は毎回呼ぶので、空配列で返す）
  const series = useMemo(() => {
    if (!hasSelection || !ready) return [];
    return selectedFunds
      .map((f) => {
        const annualReturn = rateMode === "custom" ? customAnnualReturn : f.ref_return;

        const s = simulateSeries({
          monthly,
          years,
          initial,
          annualReturn,
          expenseRatio: f.expense_ratio,
        });

        return { fund: f, points: s.points };
      })
      .filter(Boolean) as {
      fund: Fund;
      points: { month: number; year: number; balance: number; principal: number }[];
    }[];
  }, [hasSelection, ready, selectedFunds, rateMode, customAnnualReturn, monthly, years, initial]);

  // ホバー中のファンドID（未ホバー時は先頭ファンドをデフォルト表示）
  const primaryFundId = series[0]?.fund.id;
  const activeFundId = hoveredFundId ?? primaryFundId ?? null;

  // 月次を横軸にして、1行にまとめる（rechartsは「行＝1点」形式が楽）
  // data[i] に fundごとの balance を "fundId" キーで追加
  const months = years * 12;
  const data = useMemo(() => {
    if (series.length === 0) return [];
    return Array.from({ length: months + 1 }, (_, i) => {
      const row: Record<string, any> = { month: i, year: Math.floor(i / 12) };

      for (const s of series) {
        row[s.fund.id] = s.points[i]?.balance ?? null;
      }

      // ✅ 元本ライン（共通条件なので1本でOK）
      // どのファンドでも principal は同じ（monthly/years/initial が共通）なので、
      // 最初のシリーズから拾う
      row["principal"] = series[0]?.points[i]?.principal ?? null;

      // ✅ ホバー対象に切り替え可能なよう、各ファンド分の profit/loss を用意
      const p = row["principal"];
      for (const s of series) {
        const bal = row[s.fund.id];
        const profitKey = `${s.fund.id}__profit`;
        const lossKey = `${s.fund.id}__loss`;
        row[profitKey] =
          typeof bal === "number" && typeof p === "number" ? Math.max(bal - p, 0) : null;
        row[lossKey] =
          typeof bal === "number" && typeof p === "number" ? Math.max(p - bal, 0) : null;
      }

      return row;
    });
  }, [months, series]);

  const activeFundName =
    activeFundId ? series.find((s) => s.fund.id === activeFundId)?.fund.name ?? "" : "";

  // Fund 型に color が無い前提で、ここで安定した色割り当てを作る
  const PALETTE = [
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#7c3aed",
    "#ea580c",
    "#0891b2",
    "#db2777",
    "#65a30d",
  ] as const;

  const colorByFundId = useMemo(() => {
    const map: Record<string, string> = {};
    series.forEach((s, idx) => {
      map[s.fund.id] = PALETTE[idx % PALETTE.length];
    });
    return map;
  }, [series]);

  const activeRow = data[Math.min(Math.max(activeIndex, 0), data.length - 1)];
  const activeYears = Math.floor(activeIndex / 12);
  const activeMonths = activeIndex % 12;
  const activePointLabel = `${activeYears}年${activeMonths === 0 ? "" : `${activeMonths}ヶ月`}時点`;
  const activePrincipal = activeRow?.principal;

  // 最終年（固定）で最大評価額のファンドを決めて、利益エリアを常にそのファンドで塗る
  const finalRow = data.length > 0 ? data[data.length - 1] : undefined;
  const maxFundIdAtFinal = useMemo(() => {
    let bestId: string | null = null;
    let bestVal = -Infinity;
    for (const s of series) {
      const v = finalRow?.[s.fund.id];
      if (typeof v === "number" && v > bestVal) {
        bestVal = v;
        bestId = s.fund.id;
      }
    }
    return bestId;
  }, [finalRow, series]);

  const maxFundColor = maxFundIdAtFinal ? colorByFundId[maxFundIdAtFinal] ?? "#2563eb" : "#2563eb";
  const maxFundName =
    maxFundIdAtFinal ? series.find((s) => s.fund.id === maxFundIdAtFinal)?.fund.name ?? "" : "";

  const profitFillKey = maxFundIdAtFinal ? `${maxFundIdAtFinal}__profit` : null;

  const fmtYen = (v: any) => (typeof v === "number" ? `${Math.round(v).toLocaleString()}円` : "-");

  // 上部一覧（全ファンドの評価額/損益を一気に表示）
  const snapshot = useMemo(() => {
    const p = activePrincipal;
    return series.map((s) => {
      const bal = activeRow?.[s.fund.id];
      const profit =
        typeof bal === "number" && typeof p === "number" ? bal - p : null;
      return {
        id: s.fund.id,
        name: s.fund.name,
        color: colorByFundId[s.fund.id],
        balance: bal,
        profit,
      };
    });
  }, [activePrincipal, activeRow, colorByFundId, series]);

  const maxFundSnapshot = useMemo(() => {
    if (!maxFundIdAtFinal) return null;
    return snapshot.find((s) => s.id === maxFundIdAtFinal) ?? null;
  }, [maxFundIdAtFinal, snapshot]);

  // X軸（年表示）の間引きルール：〜15y=1年、〜30y=2年、以降=5年
  const yearStep = years <= 15 ? 1 : years <= 30 ? 2 : 5;
  const xTicks = useMemo(() => {
    const arr: number[] = [];
    for (let y = 0; y <= years; y += yearStep) arr.push(y * 12);
    // 念のため最終年は必ず入れる
    const last = years * 12;
    if (arr[arr.length - 1] !== last) arr.push(last);
    return arr;
  }, [years, yearStep]);

  // ---- ここから描画（return は最後に統一） ----
  if (!hasSelection) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold">資産推移（グラフ）</div>
        <div className="mt-2 text-sm text-gray-600">ファンドを選ぶとグラフが表示されます。</div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold">資産推移（グラフ）</div>
        <div className="mt-2 text-sm text-gray-600">読み込み中…</div>
        <div className="mt-3 h-[260px] w-full rounded-xl bg-gray-50 md:h-[340px]" />
      </div>
    );
  }

  // series.length === 0 は、現仕様では hasSelection && ready のとき基本起きない想定

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-2">
        <div className="text-lg font-semibold">資産推移（グラフ）</div>
        <div className="text-sm text-gray-600">
          毎月 {monthly.toLocaleString()}円 / {years}年 / 初期 {initial.toLocaleString()}円 / 年率{" "}
          {rateMode === "fund"
            ? "参考（ファンド別）"
            : `想定（${(customAnnualReturn * 100).toFixed(1)}%）`}
        </div>
      </div>

      {/* ✅ スマホでも使える固定の詳細表示（ホバー/タップで更新） */}
      <div className="mb-3 rounded-xl border bg-slate-50 p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-medium text-slate-900">
            {activePointLabel}
            {maxFundName ? (
              <span className="ml-2 text-slate-600">
                （利益エリア：最大 {shortName(maxFundName)}）
              </span>
            ) : null}
          </div>
          <div className="text-xs text-slate-600">
            PC：ホバー / スマホ：タップ
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="text-slate-600">
            元本{" "}
            <span className="ml-1 font-medium text-slate-900">{fmtYen(activePrincipal)}</span>
          </div>
        </div>

        {/* スマホは結論まで最短：要点だけ → 必要なら展開 */}
        {isMobile ? (
          <div className="mt-3">
            {maxFundSnapshot ? (
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: maxFundSnapshot.color }}
                    aria-hidden
                  />
                  <div className="min-w-0 truncate font-medium text-slate-900">
                    {shortName(maxFundSnapshot.name)}
                    <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                      最大
                    </span>
                  </div>
                </div>
                <div className="flex items-baseline gap-4">
                  <div className="tabular-nums text-slate-900">{fmtYen(maxFundSnapshot.balance)}</div>
                  <div className="tabular-nums text-slate-700">
                    {typeof maxFundSnapshot.profit === "number"
                      ? `${maxFundSnapshot.profit >= 0 ? "+" : ""}${Math.round(maxFundSnapshot.profit).toLocaleString()}円`
                      : "-"}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowSnapshotDetails((v) => !v)}
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
              >
                {showSnapshotDetails ? "詳細を閉じる" : "詳細を表示"}
              </button>
            </div>

            {showSnapshotDetails ? (
              <div className="mt-3 grid gap-2">
                {snapshot.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.color }}
                        aria-hidden
                      />
                      <div className="min-w-0 truncate font-medium text-slate-900">
                        {shortName(s.name)}
                        {s.id === maxFundIdAtFinal ? (
                          <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                            最大
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div className="tabular-nums text-slate-900">{fmtYen(s.balance)}</div>
                      <div className="tabular-nums text-slate-700">
                        {typeof s.profit === "number"
                          ? `${s.profit >= 0 ? "+" : ""}${Math.round(s.profit).toLocaleString()}円`
                          : "-"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 grid gap-2">
            {snapshot.map((s) => (
              <div key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                    aria-hidden
                  />
                  <div className="min-w-0 truncate font-medium text-slate-900">
                    {shortName(s.name)}
                    {s.id === maxFundIdAtFinal ? (
                      <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                        最大
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-baseline gap-4">
                  <div className="tabular-nums text-slate-900">{fmtYen(s.balance)}</div>
                  <div className="tabular-nums text-slate-700">
                    {typeof s.profit === "number"
                      ? `${s.profit >= 0 ? "+" : ""}${Math.round(s.profit).toLocaleString()}円`
                      : "-"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div ref={chartHostRef} className="h-[260px] w-full min-w-0 md:h-[340px]">
        {chartSize.w > 0 && chartSize.h > 0 ? (
          <ComposedChart
            width={chartSize.w}
            height={chartSize.h}
            data={data}
            margin={{
              top: 10,
              right: isMobile ? 10 : 20,
              bottom: 0,
              left: isMobile ? 4 : 10,
            }}
            onMouseMove={(state: any) => {
              const m = state?.activeLabel;
              if (typeof m === "number") setActiveIndex(m);
            }}
            onClick={(state: any) => {
              const m = state?.activeLabel;
              if (typeof m === "number") setActiveIndex(m);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            {/* スマホの納得感：どこを見ているか縦線で明示 */}
            <ReferenceLine x={activeIndex} stroke="#94a3b8" strokeDasharray="4 4" />
            <XAxis
              dataKey="month"
              ticks={xTicks}
              tickFormatter={(m) => `${Math.round(m / 12)}年`}
              interval={0}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v / 1_0000)}万`}
              width={isMobile ? 48 : 70}
            />
            <Area
              type="monotone"
              dataKey="principal"
              name="元本"
              stackId="base"
              strokeWidth={0}
              fillOpacity={0.12}
            />

            {profitFillKey && (
              <Area
                type="monotone"
                dataKey={profitFillKey}
                name={maxFundName ? `利益（最大：${shortName(maxFundName)}）` : "利益"}
                stackId="base"
                strokeWidth={0}
                fill={maxFundColor}
                stroke={maxFundColor}
                fillOpacity={0.25}
                isAnimationActive={false}
              />
            )}

            {series.map((s) => (
              <Line
                key={s.fund.id}
                type="monotone"
                dataKey={s.fund.id}
                name={shortName(s.fund.name)}
                dot={false}
                strokeWidth={2}
                stroke={colorByFundId[s.fund.id]}
                onMouseEnter={() => setHoveredFundId(s.fund.id)}
                onMouseLeave={() => setHoveredFundId(null)}
              />
            ))}
          </ComposedChart>
        ) : (
          <div className="h-full w-full rounded-xl bg-gray-50" />
        )}
      </div>
    </div>
  );
}

function shortName(name: string) {
  // 表示が長い時の簡易短縮（必要なら後で改善）
  return name.length > 18 ? name.slice(0, 18) + "…" : name;
}