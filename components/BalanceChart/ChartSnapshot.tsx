//components/BalanceChart/ChartSnapshot.tsx

"use client";

type SnapshotRow = {
  id: string;
  name: string;
  color: string;
  balance: number | null;
  profit: number | null;
};

export default function ChartSnapshot({
  isCompact,
  canHover,
  showDetails,
  onToggleDetails,
  activePointLabel,
  maxFundName,
  maxFundIdAtFinal,
  activePrincipal,
  fmtYen,
  snapshot,
  maxFundSnapshot,
  hoveredFundId,
}: {
  isCompact: boolean;
  canHover: boolean;
  showDetails: boolean;
  onToggleDetails: () => void;
  activePointLabel: string;
  maxFundName: string;
  maxFundIdAtFinal: string | null;
  activePrincipal: any;
  fmtYen: (v: any) => string;
  snapshot: SnapshotRow[];
  maxFundSnapshot: SnapshotRow | null;
  hoveredFundId: string | null;
}) {
  const summaryTarget = maxFundSnapshot;

  return (
    <div className="mb-3 text-sm">

      {/* 時点ラベル */}
      <div className="mb-1 text-xs font-medium text-slate-500">
        {activePointLabel}
      </div>

      {/* summary */}
      <div className="rounded-2xl bg-slate-50/60 px-3 py-3 ring-1 ring-slate-200/60">

        {summaryTarget ? (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: summaryTarget.color }}
                  aria-hidden
                />
                <div className="min-w-0 truncate text-sm font-semibold text-slate-900">
                  {shortName(summaryTarget.name)}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="tabular-nums text-lg font-semibold text-slate-900">
                {fmtYen(summaryTarget.balance)}
              </div>
              <div className="mt-1 tabular-nums text-xs text-slate-600">
                {typeof summaryTarget.profit === "number"
                  ? `${summaryTarget.profit >= 0 ? "+" : ""}${fmtYen(summaryTarget.profit)}`
                  : "-"}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span
            className="rounded px-1.5 py-[1px] font-medium text-sky-700"
            style={{ backgroundColor: "rgba(14,165,233,0.12)" }}
          >
            元本
          </span>

          <span className="tabular-nums font-medium text-slate-700">
            {fmtYen(activePrincipal)}
          </span>
        </div>
      </div>

      {isCompact ? (
        <div className="mt-3">
          <div>
            <button
              type="button"
              onClick={onToggleDetails}
              className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
            >
              {showDetails ? "詳細を閉じる" : "詳細を表示"}
            </button>
          </div>

          {showDetails ? (
            <div className="mt-3 grid gap-2">
              {snapshot.map((s) => (
                <Row
                  key={s.id}
                  row={s}
                  fmtYen={fmtYen}
                  badge={s.id === maxFundIdAtFinal ? "最大" : null}
                  isEmphasis={hoveredFundId ? hoveredFundId === s.id : false}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <details className="mt-3 group">
          <summary className="cursor-pointer list-none text-xs font-semibold text-slate-700 marker:content-none">
            詳細を表示
            <span className="ml-1 inline-block transition group-open:rotate-180">⌄</span>
          </summary>
          <div className="mt-3 grid gap-2">
            {snapshot.map((s) => (
              <Row
                key={s.id}
                row={s}
                fmtYen={fmtYen}
                badge={s.id === maxFundIdAtFinal ? "最大" : null}
                isEmphasis={hoveredFundId ? hoveredFundId === s.id : false}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Row({
  row,
  fmtYen,
  badge,
  isEmphasis,
}: {
  row: SnapshotRow;
  fmtYen: (v: any) => string;
  badge: string | null;
  isEmphasis: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl px-2.5 py-2",
        isEmphasis ? "bg-white ring-1 ring-slate-200" : "bg-slate-50/70",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: row.color }}
          aria-hidden
        />
        <div className="min-w-0 truncate font-medium text-slate-900">
          {shortName(row.name)}
          {badge ? (
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-baseline gap-4">
        <div className="tabular-nums text-slate-900">{fmtYen(row.balance)}</div>
        <div className="tabular-nums text-slate-700">
          {typeof row.profit === "number"
            ? `${row.profit >= 0 ? "+" : ""}${fmtYen(row.profit)}`
            : "-"}
        </div>
      </div>
    </div>
  );
}

function shortName(name: string) {
  return name.length > 18 ? name.slice(0, 18) + "…" : name;
}