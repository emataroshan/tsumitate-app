// tools/fetch-expense-ratios.ts

import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { fetchExpenseRatio } from "@/lib/expense/providers";
import type {
  AutoExpenseRatioRecord,
  ExpenseFetchMethod,
} from "@/lib/expense/types";

type RawRow = Record<string, unknown>;

type FundMasterRow = {
  id: string;
  name: string;
  expense_source_url: string;
  expense_source_type: string;
  expense_fetch_method: ExpenseFetchMethod;
  expense_enabled: boolean;
};

function getCell(row: RawRow, candidates: string[]): string {
  for (const key of candidates) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value)
    .replace(/\u3000/g, " ")
    .replace(/\s+/g, "")
    .toLowerCase();

  return ["true", "1", "yes", "y"].includes(normalized);
}

function loadFundMasterRows(filePath: string): FundMasterRow[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets["funds"];

  if (!sheet) {
    throw new Error(`'funds' シートが見つかりません: ${filePath}`);
  }

  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

  return rows.map((row) => ({
    id: getCell(row, ["id", "id/filename"]),
    name: getCell(row, ["name"]),
    expense_source_url: getCell(row, ["expense_source_url"]),
    expense_source_type: getCell(row, ["expense_source_type"]),
    expense_fetch_method: getCell(
      row,
      ["expense_fetch_method"],
    ) as ExpenseFetchMethod,
    expense_enabled: parseBoolean(getCell(row, ["expense_enabled"])),
  }));
}

async function main() {
  const root = process.cwd();
  const masterPath = path.join(root, "data", "funds_master.xlsx");
  const outputPath = path.join(root, "data", "expense-ratio.auto.json");

  const rows = loadFundMasterRows(masterPath).filter(
    (row) => row.expense_enabled,
  );

  const records: AutoExpenseRatioRecord[] = [];

  for (const row of rows) {
    if (!row.expense_source_url) {
      records.push({
        id: row.id,
        status: "error",
        expenseRatio: null,
        sourceUrl: "",
        fetchedAt: new Date().toISOString(),
        fetchMethod: row.expense_fetch_method,
        message: "expense_source_url が未設定です。",
      });
      continue;
    }

    const result = await fetchExpenseRatio(
      row.expense_fetch_method,
      row.expense_source_url,
    );

    if (result.ok) {
      records.push({
        id: row.id,
        status: "ok",
        expenseRatio: result.expenseRatio,
        sourceUrl: result.sourceUrl,
        fetchedAt: result.fetchedAt,
        fetchMethod: row.expense_fetch_method,
        message: result.note,
        patternName: result.match?.patternName,
        matchedLabel: result.match?.matchedLabel,
        matchedText: result.match?.matchedText,
      });
    } else {
      records.push({
        id: row.id,
        status: "error",
        expenseRatio: null,
        sourceUrl: result.sourceUrl,
        fetchedAt: result.fetchedAt,
        fetchMethod: row.expense_fetch_method,
        message: result.error,
      });
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(records, null, 2), "utf-8");

  const failed = records.filter((r) => r.status === "error");
  console.log(`expense-ratio.auto.json を出力しました: ${outputPath}`);
  console.log(`成功: ${records.length - failed.length}件 / 失敗: ${failed.length}件`);

  if (failed.length > 0) {
    console.error("\n未取得ファンド一覧:");
    for (const f of failed) {
      console.error(`- ${f.id}: ${f.message ?? "不明なエラー"}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});