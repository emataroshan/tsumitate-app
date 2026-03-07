//components/ChartSnapshot.tsx

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
  onClearPin,
  activePointLabel,
  maxFundName,
  maxFundIdAtFinal,
  activePrincipal,
  fmtYen,
  snapshot,
  maxFundSnapshot,
  hoveredFundId,
  isPinned,
}: {
  isCompact: boolean;
  canHover: boolean;
  showDetails: boolean;
  onToggleDetails: () => void;
  onClearPin: () => void;
  activePointLabel: string;
  maxFundName: string;
  maxFundIdAtFinal: string | null;
  activePrincipal: any;
  fmtYen: (v: any) => string;
  snapshot: SnapshotRow[];
  maxFundSnapshot: SnapshotRow | null;
  hoveredFundId: string | null;
  isPinned: boolean;
}) {
  const summaryTarget = maxFundSnapshot;

  return (
    <div className="mb-3 rounded-xl border bg-slate-50 p-3 text-sm">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 truncate font-medium text-slate-900">
            {activePointLabel}
          </div>
          {isPinned ? (
            <div className="ml-auto shrink-0">
              <button
                type="button"
                onClick={onClearPin}
                className={[
                  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm transition-colors",
                  "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200",
                ].join(" ")}
              >
                固定を解除
              </button>
            </div>
          ) : null}
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          {canHover
            ? isPinned
              ? "固定中"
              : "ホバーで確認 / クリックで固定"
            : isPinned
              ? "固定中"
              : "なぞって確認 / タップで固定"}
        </div>
      </div>

      <div className="mt-2 rounded-lg bg-white/70 px-3 py-2 ring-1 ring-slate-200">
        <div className="text-sm leading-6 text-slate-700">
          <span className="text-slate-500">元本</span>
          <span className="ml-1 font-semibold text-slate-900">{fmtYen(activePrincipal)}</span>
          {summaryTarget ? (
            <>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-500">最大</span>
              <span className="ml-1 font-semibold text-slate-900">
                {shortName(summaryTarget.name)}
              </span>
              <span className="ml-2 font-semibold tabular-nums text-slate-900">
                {fmtYen(summaryTarget.balance)}
              </span>
              <span className="ml-2 tabular-nums text-slate-700">
                {typeof summaryTarget.profit === "number"
                  ? `${summaryTarget.profit >= 0 ? "+" : ""}${Math.round(
                      summaryTarget.profit
                    ).toLocaleString()}円`
                  : "-"}
              </span>
            </>
          ) : null}
        </div>
      </div>

      {isCompact ? (
        <div className="mt-3">
          <div>
            <button
              type="button"
              onClick={onToggleDetails}
              className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
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
        "flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg px-2 py-1",
        isEmphasis ? "bg-white ring-1 ring-slate-200" : "",
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
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              {badge}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-baseline gap-4">
        <div className="tabular-nums text-slate-900">{fmtYen(row.balance)}</div>
        <div className="tabular-nums text-slate-700">
          {typeof row.profit === "number"
            ? `${row.profit >= 0 ? "+" : ""}${Math.round(row.profit).toLocaleString()}円`
            : "-"}
        </div>
      </div>
    </div>
  );
}

function shortName(name: string) {
  return name.length > 18 ? name.slice(0, 18) + "…" : name;
}