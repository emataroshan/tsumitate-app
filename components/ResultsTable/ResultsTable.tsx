// components/ResultsTable/ResultsTable.tsx

"use client";

import { Fund } from "@/lib/types";
import { formatPercent } from "@/lib/format";
import { simulate, compareNisaVsTaxable } from "@/lib/calc";
import { useMemo } from "react";
import ResultsMobileCards from "@/components/ResultsTable/ResultsMobileCards";
import ResultsDesktopTable from "@/components/ResultsTable/ResultsDesktopTable";
import { getFundReferenceReturn } from "@/lib/fund";

type Row = {
  fund: Fund;
  annualReturn: number;
  expenseRatio: number;

  // NISA（非課税）
  finalValue: number;
  principal: number;
  profit: number;
  multiple: number;

  // 課税口座比較（v1.1 神機能）
  taxableFinalValue: number;
  nisaBenefit: number;
};

type Props = {
  selectedFunds: Fund[];
  monthly: number;
  years: number;
  initial: number;
  rateMode: "fund" | "custom";
  customAnnualReturn: number; // 小数（例：0.07）

  // v1.1: 課税比較用（デフォルトは日本の代表税率 20.315%）
  taxRate?: number; // 小数（例：0.20315）
};

export default function ResultsTable({
  selectedFunds,
  monthly,
  years,
  initial,
  rateMode,
  customAnnualReturn,
  taxRate = 0.20315,
}: Props) {
  const rows: Row[] = useMemo(() => {
    return selectedFunds.map((f) => {
      const annualReturn =
        rateMode === "custom" ? customAnnualReturn : getFundReferenceReturn(f);

      // 既存：NISA想定の結果
      const result = simulate({
        monthly,
        years,
        initial,
        annualReturn,
        expenseRatio: f.expenseRatio,
      });

      // v1.1：課税口座（売却時課税の近似）と比較
      const comp = compareNisaVsTaxable(
        {
          monthly,
          years,
          initial,
          annualReturn,
          expenseRatio: f.expenseRatio,
        },
        taxRate,
      );

      return {
        fund: f,
        annualReturn,
        expenseRatio: f.expenseRatio,

        finalValue: result.finalValue,
        principal: result.principal,
        profit: result.profit,
        multiple: result.multiple,

        taxableFinalValue: comp.taxableFinalValue,
        nisaBenefit: comp.nisaBenefit,
      };
    });
  }, [customAnnualReturn, initial, monthly, rateMode, selectedFunds, taxRate, years]);

  // ✅ 比較の結論を最速化：総資産額で降順ソート
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => b.finalValue - a.finalValue);
  }, [rows]);

  const bestFinalValue = sorted.length > 0 ? sorted[0].finalValue : null;
  const totalLabel = `${years}年後の総資産額`;

  return (
    <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-lg font-semibold">比較結果</div>
        <div className="text-sm text-slate-600">条件を変えるとリアルタイムに更新</div>
        <div className="mt-1 text-xs text-slate-500">
          ※「NISAの節税額」は、同じ運用結果を課税口座で売却した場合（利益に税率{formatPercent(taxRate, 2)}）に
          発生する税金を回避できる目安です。
        </div>
      </div>

      {/* ✅ Mobile：テーブルは捨てて「結論が速い」ランキングカード */}
      <div className="grid gap-2 md:hidden">
        <ResultsMobileCards
          sorted={sorted}
          bestFinalValue={bestFinalValue}
          years={years}
        />
      </div>

      {/* ✅ PC：テーブル（列を絞って読みやすく） */}
      <div className="hidden md:block">
        <ResultsDesktopTable
          sorted={sorted}
          bestFinalValue={bestFinalValue}
          years={years}
        />
      </div>
    </div>
  );
}