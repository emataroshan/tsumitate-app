// components/BalanceChart.tsx

"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Fund } from "@/lib/types";
import { useBalanceChartData } from "@/hooks/useBalanceChartData";
import { useBalanceChartViewModel } from "@/hooks/useBalanceChartViewModel";
import { useElementSize } from "@/hooks/useElementSize";
import { useChartInteraction } from "@/hooks/useChartInteraction";
import { usePointerCapabilities } from "@/hooks/usePointerCapabilities";
import ChartSnapshot from "@/components/ChartSnapshot";
import BalanceComposedChart from "@/components/BalanceComposedChart";
import ChartOverlaySnapshot from "@/components/ChartOverlaySnapshot";

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

  // ✅ div サイズを計測して、ComposedChartに数値で渡す（ResponsiveContainerを使わない）
  const chartHostRef = useRef<HTMLDivElement | null>(null);
  const { size: chartSize, isCompact, ready } = useElementSize({
    ref: chartHostRef,
    enabled: hasSelection,
    compactBreakpoint: 640,
  });

  const [overlayLeft, setOverlayLeft] = useState(96);
  const { canHover } = usePointerCapabilities();

  // チャート描画の compact 判定と、Snapshot の表示方式は分ける
  const showOverlaySnapshot = canHover && chartSize.w >= 560;
  const showExternalSnapshot = !showOverlaySnapshot;

  const months = years * 12;
  const interaction = useChartInteraction({
    months,
    canHover,
    initialIndex: months, // 初期は最終月
  });

  // ✅ years が変わったら「最終月」へ戻す（結論最短）
  useEffect(() => {
    interaction.setActiveIndex(months);
  }, [months, interaction.setActiveIndex]);

  useLayoutEffect(() => {
    if (!ready || !chartHostRef.current || !showOverlaySnapshot) return;

    const host = chartHostRef.current;

    const measure = () => {
      const axis = host.querySelector(".recharts-yAxis");
      if (!axis) return;

      const hostRect = host.getBoundingClientRect();
      const axisRect = (axis as Element).getBoundingClientRect();

      // chartHost 左端から見た「Y軸の右端位置」+ 少しだけ呼吸
      const nextLeft = Math.max(0, Math.round(axisRect.right - hostRect.left + 8));
      setOverlayLeft(nextLeft);
    };

    measure();

    const ro = new ResizeObserver(() => {
      measure();
    });

    ro.observe(host);

    const axis = host.querySelector(".recharts-yAxis");
    if (axis) ro.observe(axis);

    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ready, showOverlaySnapshot, chartSize.w, chartSize.h]);

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
    activeIndex: interaction.activeIndex,
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
    <div className="max-w-full overflow-x-hidden rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-2">
        <div className="text-lg font-semibold">資産推移（グラフ）</div>
        <div className="text-sm text-gray-600">
          毎月 {monthly.toLocaleString()}円 / {years}年 / 初期 {initial.toLocaleString()}円 / 年率{" "}
          {rateMode === "fund"
            ? "参考（ファンド別）"
            : `想定（${(customAnnualReturn * 100).toFixed(1)}%）`}
        </div>
      </div>

      {showExternalSnapshot ? (
        <ChartSnapshot
          isCompact={isCompact}
          canHover={canHover}
          showDetails={showSnapshotDetails}
          onToggleDetails={() => setShowSnapshotDetails((v) => !v)}
          activePointLabel={activePointLabel}
          maxFundName={maxFundName}
          maxFundIdAtFinal={maxFundIdAtFinal}
          activePrincipal={activePrincipal}
          fmtYen={fmtYen}
          snapshot={snapshot}
          maxFundSnapshot={maxFundSnapshot}
          hoveredFundId={interaction.hoveredFundId}
        />
      ) : null}

      <div
        ref={chartHostRef}
        className="relative h-[260px] w-full max-w-full min-w-0 overflow-hidden overflow-x-hidden rounded-xl bg-white ring-1 ring-slate-200 md:h-[340px] touch-pan-y overscroll-x-contain select-none"
        style={{ WebkitTapHighlightColor: "transparent" } as any}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-3 bg-white"
        />

        {showOverlaySnapshot ? (
          <div 
            className="pointer-events-none absolute top-3 z-20" 
            style={{ left: overlayLeft }}
          >
            <ChartOverlaySnapshot
              isCompact={isCompact}
              canHover={canHover}
              activePointLabel={activePointLabel}
              activePrincipal={activePrincipal}
              fmtYen={fmtYen}
              summaryTarget={maxFundSnapshot}
              hoveredFundId={interaction.hoveredFundId}
            />
          </div>
        ) : null}

        {ready ? (
          <BalanceComposedChart
            chartSize={chartSize}
            isCompact={isCompact}
            data={data}
            xTicks={xTicks}
            activeIndex={interaction.activeIndex}
            series={series}
            colorByFundId={colorByFundId}
            hoveredFundId={interaction.hoveredFundId}
            profitFillKey={profitFillKey}
            maxFundName={maxFundName}
            maxFundColor={maxFundColor}
            handlers={interaction.handlers}
          />
        ) : (
          <div className="h-full w-full rounded-xl bg-gray-50" />
        )}
      </div>
    </div>
  );
}