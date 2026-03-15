// tools/test-parse.ts

import fs from "node:fs";
import iconv from "iconv-lite";

import { parseMufgCsv } from "../lib/parsers/mufg";
import { parseSbiCsv } from "../lib/parsers/sbi";
import { buildFund } from "../lib/fund-builder";

function readCp932(path: string): string {
  const buf = fs.readFileSync(path);
  return iconv.decode(buf, "cp932");
}

function printRowsSummary(label: string, rows: { date: string }[]) {
  console.log(`\n=== ${label} ===`);
  console.log(`rows: ${rows.length}`);
  console.log("first row:", rows[0]);
  console.log("last row:", rows[rows.length - 1]);
}

// MUFG
const mufgText = readCp932("data/nav_csv/mufg/mufg_emaxis_slim_all_country.csv");
const mufgRows = parseMufgCsv(mufgText);

console.log("MUFG first row:", mufgRows[0]);
console.log("MUFG last row:", mufgRows[mufgRows.length - 1]);

printRowsSummary("MUFG parsed rows", mufgRows);

const mufgBuiltFund = buildFund(
   {
     id: "mufg_emaxis_slim_all_country",
     name: "eMAXIS Slim 全世界株式(ｵｰﾙ･ｶﾝﾄﾘｰ)",
     providerId: "mufg",
     tags: ["人気", "全世界", "株式"],
     expenseRatio: 0.0005775,
   },
   mufgRows
 );

console.log("Built MUFG fund:", JSON.stringify(mufgBuiltFund, null, 2));

// SBI
const sbiText = readCp932("data/nav_csv/sbi/sbi_total_world.csv");
const sbiRows = parseSbiCsv(sbiText);

console.log("SBI first row:", sbiRows[0]);
console.log("SBI last row:", sbiRows[sbiRows.length - 1]);
console.log(sbiText.slice(0, 300));

printRowsSummary("SBI parsed rows", sbiRows);
console.log("SBI raw head:", sbiText.slice(0, 300));

const sbiFund = buildFund(
  {
    id: "sbi_total_world",
    name: "SBI･全世界株式ｲﾝﾃﾞｯｸｽ･ﾌｧﾝﾄﾞ",
    providerId: "sbi",
    tags: ["全世界", "株式"],
    expenseRatio: 0.001102,
  },
  sbiRows
);

console.log("Built SBI fund:", JSON.stringify(sbiFund, null, 2));