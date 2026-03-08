// components/BalanceChart/ChartTopRankLegend.tsx

"use client";

type Item = {
  rank: number;
  id: string;
  name: string;
  color: string;
};

export default function ChartTopRankLegend({
  items,
  activeFundId,
  hoveredFundId,
  onItemEnter,
  onItemLeave,
  onItemClick,
}: {
  items: Item[];
  activeFundId: string | null;
  hoveredFundId: string | null;
  onItemEnter: (fundId: string) => void;
  onItemLeave: () => void;
  onItemClick: (fundId: string) => void;
}) {
  return (
    <div className="mt-3">
      <div className="grid gap-1.5">
        {items.map((item) => {
          const isHovered = hoveredFundId === item.id;
          const isActive = activeFundId === item.id;
          const isEmphasis = isHovered || isActive;

          return (
            <button
              key={item.id}
              type="button"
              onMouseEnter={() => onItemEnter(item.id)}
              onMouseLeave={onItemLeave}
              onFocus={() => onItemEnter(item.id)}
              onBlur={onItemLeave}
              onClick={() => onItemClick(item.id)}
              className={[
                "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                "outline-none",
                isEmphasis
                  ? "bg-slate-100/90 text-slate-900 ring-1 ring-slate-200"
                  : "text-slate-500 hover:bg-slate-50/80",
              ].join(" ")}
            >
              <div
                className={[
                  "w-4 shrink-0 text-[11px] tabular-nums",
                  isEmphasis ? "font-semibold text-slate-700" : "font-medium text-slate-400",
                ].join(" ")}
              >
                {item.rank}
              </div>

              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />

              <div
                className={[
                  "min-w-0 truncate text-sm",
                  isEmphasis ? "font-medium text-slate-900" : "font-normal text-slate-600",
                ].join(" ")}
              >
                {shortLegendName(item.name)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function shortLegendName(name: string) {
  return name.length > 20 ? `${name.slice(0, 20)}…` : name;
}