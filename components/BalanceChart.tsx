// components/BalanceChart.tsx

"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Fund } from "@/lib/types";
import { useBalanceChartData } from "@/hooks/useBalanceChartData";
import ChartSnapshot from "@/components/ChartSnapshot";
import BalanceComposedChart from "@/components/BalanceComposedChart";

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

  // ✅ 実表示幅ベースで「スマホ/狭い」を判定（本番/ローカル差が出ない）
  const isCompact = chartSize.w > 0 ? chartSize.w < 640 : false;

  // ⚠️ Hooks は条件分岐より前で必ず同じ順序で呼ぶ
  const [hoveredFundId, setHoveredFundId] = useState<string | null>(null);
  // どの時点（month index）を見ているか：PCはホバーで更新 / スマホはタップで固定
  const [activeIndex, setActiveIndex] = useState<number>(years * 12); // 初期は最終月
  useEffect(() => {
    setActiveIndex(years * 12);
  }, [years]);

  // スマホ(狭い)は「結論まで最短」：スナップショットはデフォルト折りたたみ
  const [showSnapshotDetails, setShowSnapshotDetails] = useState<boolean>(true);
  useEffect(() => {
    setShowSnapshotDetails(!isCompact);
  }, [isCompact]);

  const {
    series,
    data,
    colorByFundId,
    maxFundIdAtFinal,
    maxFundName,
    maxFundColor,
    profitFillKey,
    xTicks,
  } = useBalanceChartData({
    ready,
    hasSelection,
    selectedFunds,
    monthly,
    years,
    initial,
    rateMode,
    customAnnualReturn,
    isCompact,
  });

  const activeRow = data[Math.min(Math.max(activeIndex, 0), data.length - 1)];
  const activeYears = Math.floor(activeIndex / 12);
  const activeMonths = activeIndex % 12;
  const activePointLabel = `${activeYears}年${activeMonths === 0 ? "" : `${activeMonths}ヶ月`}時点`;
  const activePrincipal = activeRow?.principal;

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

      <ChartSnapshot
        isCompact={isCompact}
        showDetails={showSnapshotDetails}
        onToggleDetails={() => setShowSnapshotDetails((v) => !v)}
        activePointLabel={activePointLabel}
        maxFundName={maxFundName}
        maxFundIdAtFinal={maxFundIdAtFinal}
        activePrincipal={activePrincipal}
        fmtYen={fmtYen}
        snapshot={snapshot}
        maxFundSnapshot={maxFundSnapshot}
      />

      <div ref={chartHostRef} className="h-[260px] w-full min-w-0 md:h-[340px]">
        <BalanceComposedChart
          chartSize={chartSize}
          isCompact={isCompact}
          data={data}
          xTicks={xTicks}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
          series={series}
          colorByFundId={colorByFundId}
          setHoveredFundId={setHoveredFundId}
          profitFillKey={profitFillKey}
          maxFundName={maxFundName}
          maxFundColor={maxFundColor}
        />
      </div>
    </div>
  );
}