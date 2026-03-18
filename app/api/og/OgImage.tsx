// app/api/og/OgImage.tsx

import type { Fund } from "@/lib/types";

function formatYen(v: number) {
  return (
    new Intl.NumberFormat("ja-JP", {
      maximumFractionDigits: 0,
    }).format(v) + "円"
  );
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
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {`毎月${formatYen(monthly)}`}
            </div>
            <div style={{ fontSize: 24, color: "#64748b" }}>・</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {`${years}年積立`}
            </div>
            {initial > 0 ? (
              <>
                <div style={{ fontSize: 24, color: "#64748b" }}>・</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>
                  {`初期${formatYen(initial)}`}
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
              {`${years}年後の資産総額`}
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
              {`利益 ${profitText}`}
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
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 22,
                  color: "#065f46",
                  marginBottom: "12px",
                }}
              >
                🏆 この条件のベストファンド
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
              同じ条件で今すぐシミュレーション
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}