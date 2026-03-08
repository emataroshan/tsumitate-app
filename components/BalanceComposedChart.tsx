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
    series,
    colorByFundId,
    hoveredFundId,
    profitFillKey,
    maxFundName,
    maxFundColor,
    handlers,
}: {
    chartSize: { w: number; h: number };
    isCompact: boolean;
    data: any[];
    xTicks: number[];
    activeIndex: number;
    series: Series[];
    colorByFundId: Record<string, string>;
    hoveredFundId: string | null;
    profitFillKey: string | null;
    maxFundName: string;
    maxFundColor: string;
    handlers: {
        onMouseMove?: ((state: any) => void) | undefined;
        onTouchMove: (state: any) => void;
        onLineEnter: (id: string) => void;
        onLineLeave: () => void;
    };
}) {

    // ✅ 横スクロール根治（2カラム/DevTools切替でも再発させない）
    // Recharts は「指定 width をそのままDOM幅として扱う」ため、
    // 計測のブレや丸め誤差があっても “絶対に親幅を超えない” ことを保証する。
    const parentW = Math.floor(chartSize.w);
    const viewportW =
        typeof window !== "undefined" ? Math.floor(document.documentElement.clientWidth) : parentW;
    // 親幅は超えない。ただし内部余白で逃がすので、ここで削りすぎない
    const safeWidth = Math.max(0, Math.min(parentW, viewportW));

    if (!(chartSize.w > 0 && chartSize.h > 0)) {
        return <div className="h-full w-full rounded-xl bg-gray-50" />;
    }

    return (
        <ComposedChart
            width={safeWidth}
            height={chartSize.h}
            data={data}
            // 念のため wrapper も max-width を強制
            style={{ maxWidth: "100%", overflow: "hidden", touchAction: "pan-y" } as any}
            margin={{
                top: 10,
                right: isCompact ? 12 : 18,
                bottom: 8,
                left: isCompact ? 8 : 16,
            }}

            onMouseMove={(state: any) => handlers.onMouseMove?.(state)}
            onTouchMove={(state: any) => handlers.onTouchMove(state)}
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
                padding={{ left: 0, right: 10 }}
            />

            <YAxis
                tickFormatter={(v) => `${Math.round(v / 1_0000)}万`}
                width={isCompact ? 56 : 76}
                padding={{ top: 8, bottom: 0 }}
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
                onMouseEnter={() => {
                    if (isCompact) return;
                    handlers.onLineEnter(s.fund.id);
                }}
                onMouseLeave={() => {
                    if (isCompact) return;
                    handlers.onLineLeave();
                }}
                />
            ))}
        </ComposedChart>
    );
}

function shortName(name: string) {
    return name.length > 18 ? name.slice(0, 18) + "…" : name;
}