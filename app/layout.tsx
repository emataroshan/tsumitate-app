//app/layout.tsx

import type { Metadata } from "next";
import type { Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tsumitate-app.vercel.app"),
  title: "つみたて比較アプリ",
  description: "管理費用まで考慮した積立投資シミュレーター。条件を共有URLでそのまま再現できます。",
  openGraph: {
    title: "つみたて比較アプリ",
    description:
      "管理費用まで考慮した積立投資シミュレーター。条件を共有URLでそのまま再現できます。",
    url: "https://tsumitate-app.vercel.app",
    siteName: "つみたて比較アプリ",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "つみたて比較アプリ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "つみたて比較アプリ",
    description:
      "管理費用まで考慮した積立投資シミュレーター。条件を共有URLでそのまま再現できます。",
    images: ["/opengraph-image"],
  },
};

// ✅ スマホの viewport を正しく扱う（matchMedia / CSS breakpoint 判定の前提）
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 overflow-x-hidden overscroll-x-none touch-pan-y">
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            {children}
          </main>

          <footer className="border-t bg-white px-4 py-6 text-center text-xs text-slate-500">
            <div>
              本ツールは過去の実績等をもとにしたシミュレーションであり、将来の成果を保証するものではありません。
            </div>
            <div className="mt-2">
              <Link href="/disclaimer" className="underline hover:text-slate-700">
                免責事項
              </Link>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
