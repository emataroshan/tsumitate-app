// app/api/og/OgImage.tsx

import type { Fund } from "@/lib/types";

function formatYen(v: number) {
  return (
    new Intl.NumberFormat("ja-JP", {
      maximumFractionDigits: 0,
    }).format(v) + "円"
  );
}

function formatMonthlyLabel(value: number) {
  if (value >= 10000) {
    const man = Math.floor(value / 10000);
    const sen = (value % 10000) / 1000;
    if (sen === 0) return `${man}万円`;
    return `${man}万${sen}千円`;
  }
  return `${new Intl.NumberFormat("ja-JP").format(value)}円`;
}

export default function OgImage({
  monthly,
  years,
  initial,
  finalValueText,
  profitText,
  fundName,
}: {
  monthly: number;
  years: number;
  initial: number;
  finalValueText: string;
  profitText: string;
  fundName: string;
}) {
  const monthlyLabel = formatMonthlyLabel(monthly); 
  
  return (
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
          border: "2px solid #a7f3d0",
          background: "#ecfdf5",
          boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
          padding: "26px 40px",
          flexDirection: "column",
          justifyContent: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "16px",
              minWidth: 0,
            }}
          >
            
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "999px",
                  background: "#059669",
                  color: "#ffffff",
                  padding: "10px 18px",
                  fontSize: 20,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  boxShadow: "0 4px 12px rgba(5,150,105,0.22)",
                  whiteSpace: "nowrap",
                }}
              >
                🏆 BEST
              </div>

              <div
                style={{
                  fontSize: 26,
                  lineHeight: 1.3,
                  fontWeight: 700,
                  color: "#022c22",
                  display: "flex",
                  minWidth: 0,
                  flexWrap: "wrap",
                }}
              >
                {fundName}
              </div>
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#065f46",
              }}
            >
              {`${years}年後（毎月${monthlyLabel}）`}
            </div>

            <div
              style={{
                fontSize: 90,
                lineHeight: 1.02,
                fontWeight: 900,
                color: "#047857",
                letterSpacing: "-0.04em",
                marginTop: "6px",
              }}
            >
              {finalValueText}
            </div>

            <div
              style={{
                marginTop: "26px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                貯金より
              </div>
              <div
                style={{
                  fontSize: 54,
                  lineHeight: 1.08,
                  fontWeight: 800,
                  color: "#059669",
                  letterSpacing: "-0.03em",
                }}
              >
                {`${profitText}増`}
              </div>
            </div>

            <div
              style={{
                marginTop: "22px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderTop: "1px solid #bbf7d0",
                paddingTop: "18px",
                width: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexWrap: "wrap",
                  fontSize: 26,
                  color: "#334155",
                }}
              >
                <span>
                  <span style={{ color: "#64748b" }}>手数料まで考慮した</span>
                  <span style={{ fontWeight: 700, color: "#047857" }}>シミュレーション</span>
                </span>
              </div>

              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "#059669",
                  padding: "10px 16px",
                  borderRadius: "999px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(5,150,105,0.25)",
                  whiteSpace: "nowrap",
                }}
              >
                今すぐ試す →
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}