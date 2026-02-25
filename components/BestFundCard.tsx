// components/BestFundCard.tsx

"use client";

import { Fund } from "@/lib/types";
import { formatJPY } from "@/lib/format";

type Props = {
  fund: Fund;
  benefit: number;
};

export default function BestFundCard({ fund, benefit }: Props) {
  return (
    <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 shadow-sm">

      <div className="text-sm text-emerald-800">
        この条件で最も有利なファンド
      </div>

      <div className="text-lg font-semibold text-emerald-900">
        {fund.name}
      </div>

      <div className="mt-3 text-sm text-emerald-800">
        NISAで払わずに済む税金
      </div>

      <div className="text-3xl font-bold text-emerald-600">
        {formatJPY(benefit)}
      </div>

      <div className="text-xs text-emerald-700">
        ※課税口座との差分の目安
      </div>
      
      <div className="text-xs text-slate-500 mt-1">
        ※非課税枠（1800万円）内での運用を前提とした試算です
      </div>

    </div>
  );
}