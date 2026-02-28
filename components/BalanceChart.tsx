// components/BalanceChart.tsx

"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Fund } from "@/lib/types";
import { useBalanceChartData } from "@/hooks/useBalanceChartData";
import { useBalanceChartViewModel } from "@/hooks/useBalanceChartViewModel";
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

  // ✅ isCompact 初期判定：chartSize が取れる前でもスマホはスマホ扱いにする（折り畳みチラつき防止）
  const [isNarrowMedia, setIsNarrowMedia] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
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
  }, []);

  // ✅ div サイズを計測して、ComposedChartに数値で渡す（ResponsiveContainerを使わない）
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const [chartSize, setChartSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useLayoutEffect(() => {
    // hasSelection=false のときは chartHostRef の div 自体が描画されないので
    // hasSelection も dependency に含めて「表示された瞬間」に必ず計測を開始する
    if (!hasSelection) return;

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
  }, [hasSelection]);

  // ✅ 実表示幅ベース + 初期は matchMedia（折り畳みが初回から正しく効く）
  const isCompact = chartSize.w > 0 ? chartSize.w < 640 : isNarrowMedia;

  // ✅ ready は「1フレーム待ち」ではなく「サイズが取れたら」にする（カード切替のチラつき減）
  const ready = chartSize.w > 0 && chartSize.h > 0;

  // ⚠️ Hooks は条件分岐より前で必ず同じ順序で呼ぶ
  const [hoveredFundId, setHoveredFundId] = useState<string | null>(null);
  // どの時点（month index）を見ているか：PCはホバーで更新 / スマホはタップで固定
  const [activeIndex, setActiveIndex] = useState<number>(years * 12); // 初期は最終月
  useEffect(() => {
    setActiveIndex(years * 12);
  }, [years]);

  // ✅ PC：クリックで時点を固定（ピン留め）/ もう一度クリックで解除
  const [isPinned, setIsPinned] = useState(false);
  // 条件やレイアウトが変わったら固定は解除（意図せず残ると不親切）
  useEffect(() => {
    setIsPinned(false);
  }, [years, monthly, initial, rateMode, customAnnualReturn, isCompact, selectedFunds]);

  // スマホ(狭い)は「結論まで最短」：スナップショットはデフォルト折りたたみ
  const [showSnapshotDetails, setShowSnapshotDetails] = useState<boolean>(() => !isCompact);
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

  const {
    activePointLabel,
    activePrincipal,
    fmtYen,
    snapshot,
    maxFundSnapshot,
  } = useBalanceChartViewModel({
    series,
    data,
    colorByFundId,
    activeIndex,
    maxFundIdAtFinal,
  });

  // ---- ここから描画（return は最後に統一） ----
  if (!hasSelection) {
    return (
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold">資産推移（グラフ）</div>
        <div className="mt-2 text-sm text-gray-600">ファンドを選ぶとグラフが表示されます。</div>
      </div>
    );
  }

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
        hoveredFundId={hoveredFundId}
        isPinned={isPinned}
      />

      <div
        ref={chartHostRef}
        className="h-[260px] w-full min-w-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 md:h-[340px]"
        style={{ WebkitTapHighlightColor: "transparent" } as any}
      >
        {ready ? (
          <BalanceComposedChart
            chartSize={chartSize}
            isCompact={isCompact}
            data={data}
            xTicks={xTicks}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            isPinned={isPinned}
            setIsPinned={setIsPinned}
            series={series}
            colorByFundId={colorByFundId}
            setHoveredFundId={setHoveredFundId}
            hoveredFundId={hoveredFundId}
            profitFillKey={profitFillKey}
            maxFundName={maxFundName}
            maxFundColor={maxFundColor}
          />
        ) : (
          <div className="h-full w-full rounded-xl bg-gray-50" />
        )}
      </div>
    </div>
  );
}