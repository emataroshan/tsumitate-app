// tools/build-expense-ratio.ts

import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { EXPENSE_RATIO_OVERRIDES } from "@/data/expense-ratio.overrides";

type RawRow = Record<string, unknown>;

type AutoExpenseRatioRecord = {
  id: string;
  status: "ok" | "error";
  expenseRatio: number | null;
  message?: string;
  matchedLabel?: string;
  patternName?: string;
};

type ExpenseRatioOverride = {
  value: number;
  reason?: string;
  sourceUrl?: string;
};

type EnabledExpenseTarget = {
  id: string;
  expenseSourceType: string;
};

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

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

function loadEnabledTargets(filePath: string): EnabledExpenseTarget[] {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets["funds"];

  if (!sheet) {
    throw new Error(`'funds' シートが見つかりません: ${filePath}`);
  }

  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

  return rows
    .filter((row) => parseBooleanCell(row["expense_enabled"]))
    .map((row) => ({
      id: getCell(row, ["id", "id/filename"]),
      expenseSourceType: getCell(row, ["expense_source_type"]).toLowerCase(),
    }))
    .filter((row) => Boolean(row.id));
}

function main() {
  const root = process.cwd();
  const masterPath = path.join(root, "data", "funds_master.xlsx");
  const autoPath = path.join(root, "data", "expense-ratio.auto.json");
  const outputPath = path.join(root, "data", "expense-ratio.ts");

  const enabledTargets = loadEnabledTargets(masterPath);

  const autoRecords = JSON.parse(
    fs.readFileSync(autoPath, "utf-8"),
  ) as AutoExpenseRatioRecord[];

  const byId = new Map(
    autoRecords.map((record) => [String(record.id).trim(), record]),
  );

  const missing: string[] = [];
  const lines: string[] = [];
  let successCount = 0;
  let manualCount = 0;
  let autoCount = 0;

  for (const target of enabledTargets) {
    const id = target.id;
    const expenseSourceType = target.expenseSourceType;
    const record = byId.get(String(id).trim());
    const override = (EXPENSE_RATIO_OVERRIDES as Record<string, ExpenseRatioOverride | undefined>)[id];

    const autoExpenseRatio =
      record?.status === "ok" && isValidNumber(record.expenseRatio)
        ? record.expenseRatio
        : null;

    const finalExpenseRatio = isValidNumber(override?.value)
      ? override.value
      : autoExpenseRatio;

    console.log("checking:", {
      id,
      expenseSourceType,
      found: !!record,
      status: record?.status,
      autoExpenseRatio,
      overrideExpenseRatio: override?.value ?? null,
      finalExpenseRatio,
      overrideReason: override?.reason ?? null,
    });

    // manual 指定のファンドは override 必須
    if (expenseSourceType === "manual") {
      if (!isValidNumber(override?.value)) {
        missing.push(id);
        continue;
      }

      lines.push(`  ${JSON.stringify(id)}: ${override.value},`);
      successCount++;
      manualCount++;
      continue;
    }

    // manual 以外は override > auto > error
    if (!isValidNumber(finalExpenseRatio)) {
      missing.push(id);
      continue;
    }

    lines.push(`  ${JSON.stringify(id)}: ${finalExpenseRatio},`);
    successCount++;

    if (isValidNumber(override?.value)) {
      manualCount++; // overrideで上書きしたケース
    } else {
      autoCount++;
    }
  }

  if (missing.length > 0) {
    console.error("管理費用を確定できなかったファンドがあります:");
    for (const id of missing) {
      const target = enabledTargets.find((t) => t.id === id);
      const record = byId.get(String(id).trim());
      const override = (EXPENSE_RATIO_OVERRIDES as Record<string, ExpenseRatioOverride | undefined>)[id];

      if (target?.expenseSourceType === "manual") {
        console.error(`- ${id} | expense_source_type=manual なのに override 未設定`);
        continue;
      }

      console.error(
        `- ${id} | expense_source_type=${
          target?.expenseSourceType ?? "unknown"
        } | autoStatus=${record?.status ?? "missing"} | autoValue=${
          record?.expenseRatio ?? "null"
        } | overrideValue=${override?.value ?? "null"}`,
      );

      if (record?.message) {
        console.error(`    autoMessage: ${record.message}`);
      }
      if (record?.matchedLabel) {
        console.error(`    matchedLabel: ${record.matchedLabel}`);
      }
      if (record?.patternName) {
        console.error(`    patternName: ${record.patternName}`);
      }
    }

    console.log("lines:", lines);
    console.log("missing:", missing);

    console.log(
      `成功: ${successCount}件 / 対象: ${enabledTargets.length}件 (manual: ${manualCount}件, auto: ${autoCount}件)`,
    );

    process.exit(1);
  }

  const content = `export const EXPENSE_RATIOS: Record<string, number> = {\n${lines.join(
    "\n",
  )}\n} as const;\n`;

  fs.writeFileSync(outputPath, content, "utf-8");
  console.log(`expense-ratio.ts を出力しました: ${outputPath}`);

  console.log(
    `成功: ${successCount}件 / 対象: ${enabledTargets.length}件 (manual: ${manualCount}件, auto: ${autoCount}件)`,
  );
}

main();