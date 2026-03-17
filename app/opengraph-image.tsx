import { ImageResponse } from "next/og";
import { FUND_CONFIG } from "@/data/fund-config";
import { FUND_ANALYTICS_BY_ID } from "@/data/fund-analytics";
import { simulate } from "@/lib/calc";
import type { Fund } from "@/lib/types";

export const runtime = "nodejs";
export const alt = "つみたて比較アプリ";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const allFunds = FUND_CONFIG as unknown as Fund[];

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function parseRate(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
}

function getReferenceAnnualReturn(fundId: string): number | null {
  const analytics = FUND_ANALYTICS_BY_ID[fundId];
  return (
    analytics?.annualizedReturn5y ??
    analytics?.annualizedReturn3y ??
    analytics?.annualizedReturn1y ??
    analytics?.annualizedReturnSinceInception ??
    null
  );
}

function formatYen(v: number) {
  return (
    new Intl.NumberFormat("ja-JP", {
      maximumFractionDigits: 0,
    }).format(v) + "円"
  );
}

export default async function Image({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const getSingle = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const monthly = parsePositiveInt(getSingle(params.monthly) ?? null, 30000);
  const years = Math.max(1, parsePositiveInt(getSingle(params.years) ?? null, 20));
  const initial = parsePositiveInt(getSingle(params.initial) ?? null, 0);

  const rawRateMode = getSingle(params.rateMode);
  const rateMode: "fund" | "custom" =
    rawRateMode === "fund" ? "fund" : "custom";

  const customAnnualReturn = parseRate(getSingle(params.rate) ?? null, 0.05);

  const fundsParam = getSingle(params.funds) ?? "";
  const selectedIds = fundsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const defaultSelectedIds = [
    "mufg_emaxis_slim_all_country",
    "mufg_emaxis_slim_sp500",
  ];

  const effectiveSelectedIds =
    selectedIds.length > 0 ? selectedIds : defaultSelectedIds;

  const selectedFunds = allFunds.filter((f) =>
    effectiveSelectedIds.includes(f.id)
  );

  const fundsToCompare =
    selectedFunds.length > 0
      ? selectedFunds
      : allFunds.filter((f) => defaultSelectedIds.includes(f.id));

  let best:
    | {
        fund: Fund;
        finalValue: number;
        profit: number;
      }
    | null = null;

  for (const f of fundsToCompare) {
    const annualReturn =
      rateMode === "custom"
        ? customAnnualReturn
        : (getReferenceAnnualReturn(f.id) ?? 0);

    const res = simulate({
      monthly,
      years,
      initial,
      annualReturn,
      expenseRatio: f.expenseRatio,
    });

    if (!best || res.finalValue > best.finalValue) {
      best = {
        fund: f,
        finalValue: res.finalValue,
        profit: res.profit,
      };
    }
  }

  const finalValueText = best ? formatYen(best.finalValue) : "-";
  const profitText = best
    ? `${best.profit >= 0 ? "+" : ""}${formatYen(best.profit)}`
    : "-";
  const fundName = best ? best.fund.name : "比較対象なし";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "#f8fafc",
          color: "#0f172a",
          padding: "40px",
          fontFamily:
            '"Segoe UI","Hiragino Sans","Yu Gothic UI","Yu Gothic",Meiryo,sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            borderRadius: "32px",
            border: "3px solid #10b981",
            background: "#ecfdf5",
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
            padding: "40px",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#047857",
                letterSpacing: "0.03em",
              }}
            >
              つみたて比較アプリ
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "#065f46",
              }}
            >
              管理費用まで考慮した積立投資シミュレーター
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center",
                marginTop: "8px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                毎月{formatYen(monthly)}
              </div>
              <div style={{ fontSize: 24, color: "#64748b" }}>・</div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                }}
              >
                {years}年積立
              </div>
              {initial > 0 ? (
                <>
                  <div style={{ fontSize: 24, color: "#64748b" }}>・</div>
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                    }}
                  >
                    初期{formatYen(initial)}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "28px",
              alignItems: "stretch",
              marginTop: "28px",
            }}
          >
            <div
              style={{
                flex: 1.2,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                borderRadius: "24px",
                background: "#ffffff",
                border: "1px solid #bbf7d0",
                padding: "28px 32px",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  color: "#065f46",
                  marginBottom: "12px",
                }}
              >
                {years}年後の資産総額
              </div>
              <div
                style={{
                  fontSize: 72,
                  lineHeight: 1.05,
                  fontWeight: 800,
                  color: "#059669",
                  letterSpacing: "-0.03em",
                }}
              >
                {finalValueText}
              </div>
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#0f172a",
                  marginTop: "18px",
                }}
              >
                利益 {profitText}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                borderRadius: "24px",
                background: "rgba(255,255,255,0.75)",
                border: "1px solid #bbf7d0",
                padding: "28px 32px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 22,
                    color: "#065f46",
                    marginBottom: "12px",
                  }}
                >
                  この条件のベストファンド
                </div>
                <div
                  style={{
                    fontSize: 34,
                    lineHeight: 1.35,
                    fontWeight: 700,
                    color: "#022c22",
                  }}
                >
                  {fundName}
                </div>
              </div>

              <div
                style={{
                  fontSize: 22,
                  color: "#475569",
                }}
              >
                URLを開くと同じ条件で試せます
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}