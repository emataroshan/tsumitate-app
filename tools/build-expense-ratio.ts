// tools/build-expense-ratio.ts

import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

type RawRow = Record<string, unknown>;

type AutoExpenseRatioRecord = {
  id: string;
  status: "ok" | "error";
  expenseRatio: number | null;
  message?: string;
  matchedLabel?: string;
  patternName?: string;
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

function parseBooleanCell(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  return ["true", "1", "yes", "y"].includes(normalized);
}

function loadEnabledIds(filePath: string): string[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets["funds"];

  if (!sheet) {
    throw new Error(`'funds' シートが見つかりません: ${filePath}`);
  }

  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

  return rows
    .filter((row) => parseBooleanCell(row["expense_enabled"]))
    .map((row) => getCell(row, ["id", "id/filename"]))
    .filter(Boolean);
}

function main() {
  const root = process.cwd();
  const masterPath = path.join(root, "data", "funds_master.xlsx");
  const autoPath = path.join(root, "data", "expense-ratio.auto.json");
  const outputPath = path.join(root, "data", "expense-ratio.ts");

  const enabledIds = loadEnabledIds(masterPath);

  const autoRecords = JSON.parse(
    fs.readFileSync(autoPath, "utf-8"),
  ) as AutoExpenseRatioRecord[];

  const byId = new Map(
    autoRecords.map((record) => [String(record.id).trim(), record]),
  );

  console.log("enabledIds:", enabledIds);
  console.log("autoRecordIds:", autoRecords.map((r) => r.id));

  const missing: string[] = [];
  const lines: string[] = [];

  for (const id of enabledIds) {
    const record = byId.get(String(id).trim());

    console.log("checking:", {
      id,
      found: !!record,
      status: record?.status,
      expenseRatio: record?.expenseRatio,
    });

    if (!record || record.status !== "ok" || record.expenseRatio == null) {
      missing.push(id);
      continue;
    }

    lines.push(`  ${JSON.stringify(id)}: ${record.expenseRatio},`);
  }

  if (missing.length > 0) {
    console.error("管理費用を確定できなかったファンドがあります:");
    for (const id of missing) {
      console.error(`- ${id}`);
    }

    console.log("lines:", lines);
    console.log("missing:", missing);

    process.exit(1);
  }

  const content = `export const EXPENSE_RATIOS: Record<string, number> = {\n${lines.join(
    "\n",
  )}\n} as const;\n`;

  fs.writeFileSync(outputPath, content, "utf-8");
  console.log(`expense-ratio.ts を出力しました: ${outputPath}`);
}

main();