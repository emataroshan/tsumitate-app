// app/disclaimer/page.tsx

export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">免責事項</h1>

      <div className="space-y-4 text-sm text-slate-700">
        <p>
          本サービスは、過去の実績や一定の仮定に基づき資産シミュレーションを行うツールです。
        </p>

        <p>
          表示される結果は将来の運用成果を保証するものではありません。
        </p>

        <p>
          投資判断はご自身の責任において行ってください。
        </p>

        <p>
          本サービスの利用によって生じたいかなる損害についても、開発者は責任を負いません。
        </p>
      </div>
    </main>
  );
}