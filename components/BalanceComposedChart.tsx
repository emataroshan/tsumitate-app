//components/BalanceComposedChart.tsx

"use client";

import { Fund } from "@/lib/types";
import {
    Area,
    CartesianGrid,
    ComposedChart,
    Line,
    ReferenceLine,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

type Series = {
    fund: Fund;
    points: { month: number; year: number; balance: number; principal: number }[];
};

export default function BalanceComposedChart({
    chartSize,
    isCompact,
    data,
    xTicks,
    activeIndex,
    setActiveIndex,
    isPinned,
    setIsPinned,
    series,
    colorByFundId,
    setHoveredFundId,
    hoveredFundId,
    profitFillKey,
    maxFundName,
    maxFundColor,
}: {
    chartSize: { w: number; h: number };
    isCompact: boolean;
    data: any[];
    xTicks: number[];
    activeIndex: number;
    setActiveIndex: (n: number) => void;
    isPinned: boolean;
    setIsPinned: (v: boolean | ((prev: boolean) => boolean)) => void;
    series: Series[];
    colorByFundId: Record<string, string>;
    setHoveredFundId: (id: string | null) => void;
    hoveredFundId: string | null;
    profitFillKey: string | null;
    maxFundName: string;
    maxFundColor: string;
}) {
    if (!(chartSize.w > 0 && chartSize.h > 0)) {
        return <div className="h-full w-full rounded-xl bg-gray-50" />;
    }

  // ✅ スマホ（狭い）はホバー概念なし。PCは「固定していない間だけ」ホバー追従。
  const handleMouseMove = isCompact || isPinned
    ? undefined
    : (state: any) => {
        const idx =
          typeof state?.activeTooltipIndex === "number"
            ? state.activeTooltipIndex
            : typeof state?.activeLabel === "number"
              ? state.activeLabel
              : null;
        if (typeof idx === "number") setActiveIndex(idx);
      };

    return (
        <ComposedChart
            width={chartSize.w}
            height={chartSize.h}
            data={data}
            margin={{
                top: 10,
                right: isCompact ? 10 : 20,
                bottom: 0,
                left: isCompact ? 4 : 10,
            }}
            onMouseMove={handleMouseMove}
            onClick={(state: any) => {
                const idx =
                typeof state?.activeTooltipIndex === "number"
                    ? state.activeTooltipIndex
                    : typeof state?.activeLabel === "number"
                    ? state.activeLabel
                    : null;
                if (typeof idx === "number") {
                setActiveIndex(idx);
                // ✅ PC：クリックで固定/解除。スマホは「タップで固定」なので固定ONに寄せる。
                if (isCompact) {
                    setIsPinned(true);
                } else {
                    setIsPinned((v) => !v);
                }
                }
            }}
        >
            {/* ✅ activeTooltipIndex を安定して取るために Tooltip を配置（表示はしない） */}
            <Tooltip content={() => null} cursor={false} />

            {/* 縦線カーソル（ReferenceLine）と縦グリッドが似て見えるので、縦グリッドは消して横だけ残す */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            {/* ✅ スマホの納得感：どこを見ているか縦線で明示 */}
            <ReferenceLine
                x={activeIndex}
                stroke="#0f172a"
                strokeWidth={2}
                strokeDasharray="6 6"
                strokeOpacity={0.35}
                ifOverflow="extendDomain"
            />

            <XAxis
                dataKey="month"
                ticks={xTicks}
                tickFormatter={(m) => `${Math.round(m / 12)}年`}
                interval={0}
            />

            <YAxis
                tickFormatter={(v) => `${Math.round(v / 1_0000)}万`}
                width={isCompact ? 48 : 70}
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
                strokeWidth={hoveredFundId ? (hoveredFundId === s.fund.id ? 3 : 2) : 2}
                stroke={colorByFundId[s.fund.id]}
                strokeOpacity={hoveredFundId ? (hoveredFundId === s.fund.id ? 1 : 0.25) : 1}
                onMouseEnter={() => setHoveredFundId(s.fund.id)}
                onMouseLeave={() => setHoveredFundId(null)}
                />
            ))}
        </ComposedChart>
    );
}

function shortName(name: string) {
    return name.length > 18 ? name.slice(0, 18) + "…" : name;
}