// components/ChartOverlaySnapshot.tsx

"use client";

type SnapshotRow = {
  id: string;
  name: string;
  color: string;
  balance: number | null;
  profit: number | null;
};

export default function ChartOverlaySnapshot({
  isCompact,
  canHover,
  activePointLabel,
  activePrincipal,
  fmtYen,
  summaryTarget,
  hoveredFundId,
}: {
  isCompact: boolean;
  canHover: boolean;
  activePointLabel: string;
  activePrincipal: number;
  fmtYen: (v: number | null) => string;
  summaryTarget: SnapshotRow | null;
  hoveredFundId: string | null;
}) {
  return (
    <div
      className={[
        "w-[272px] max-w-[min(272px,calc(100vw-4rem))]",
        "rounded-2xl border border-white/60 bg-white/72",
        "px-3.5 py-3 backdrop-blur-md",
        "shadow-[0_8px_30px_rgba(15,23,42,0.08)]",
        "ring-1 ring-slate-900/5",
        "transition-opacity duration-200",
        hoveredFundId ? "opacity-100" : "opacity-95",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          
          <div className="mt-1 truncate text-xs font-medium text-slate-500">
            {activePointLabel}
          </div>
        </div>
      </div>

      {summaryTarget ? (
        <div className="mt-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: summaryTarget.color }}
              aria-hidden
            />
            <div className="min-w-0 truncate text-sm font-medium text-slate-700">
              {shortName(summaryTarget.name)}
            </div>
          </div>

          <div
            className="mt-2 flex items-end justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="whitespace-nowrap tabular-nums text-xl font-semibold leading-none text-slate-900">
                {fmtYen(summaryTarget.balance)}
              </div>
            </div>

            <div className="text-right">
              <div className="mt-1 whitespace-nowrap tabular-nums text-sm font-medium text-slate-700">
                {typeof summaryTarget.profit === "number"
                  ? `${summaryTarget.profit >= 0 ? "+" : ""}${Math.round(
                      summaryTarget.profit
                    ).toLocaleString()}円`
                  : "-"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-500">表示できるデータがありません。</div>
      )}

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-500">
        <span
          className="rounded px-1.5 py-[1px] font-medium text-sky-700"
          style={{ backgroundColor: "rgba(14,165,233,0.12)" }}
        >
          元本
        </span>
        <span className="whitespace-nowrap tabular-nums font-medium text-slate-700">
          {fmtYen(activePrincipal)}
        </span>
      </div>
    </div>
  );
}

function shortName(name: string) {
  return name.length > 18 ? name.slice(0, 18) + "…" : name;
}