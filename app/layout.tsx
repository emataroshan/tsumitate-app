//app/layout.tsx

import type { Metadata } from "next";
import type { Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "積立ファンド比較",
  description: "手数料込みで将来資産を比較するツール（v1）",
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
      <body className="bg-gray-50 text-gray-900">
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
