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
  isPinned,
}: {
  isCompact: boolean;
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
  isPinned: boolean;
}) {
  return (
    <div className="mb-3 rounded-xl border bg-slate-50 p-3 text-sm">
      {/* ✅ ここはチラつきが最も不快なので「2段固定」で安定させる */}
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 truncate font-medium text-slate-900">
            {activePointLabel}
            {maxFundName ? (
              <span className="ml-2 text-slate-600">
                （利益エリア：最大 {shortName(maxFundName)}）
              </span>
            ) : null}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-600">
          {isCompact
            ? "タップで時点を固定"
            : isPinned
              ? "固定中（クリックで解除）"
              : "ホバーで確認 / クリックで固定"}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="text-slate-600">
          元本 <span className="ml-1 font-medium text-slate-900">{fmtYen(activePrincipal)}</span>
        </div>
      </div>

      {/* ✅ 結論まで最短：狭い画面は要点→必要なら詳細 */}
      {isCompact ? (
        <div className="mt-3">
          {maxFundSnapshot ? (
            <Row
              row={maxFundSnapshot}
              fmtYen={fmtYen}
              badge="最大"
              isEmphasis={hoveredFundId ? hoveredFundId === maxFundSnapshot.id : false}
            />
          ) : null}

          <div className="mt-2">
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