// lib/parsers/index.ts

import type { NormalizedNavRow } from "../types";
import { parseMufgCsv } from "./mufg";
import { parseSbiCsv } from "./sbi";
import { parseSmtCsv } from "./smt";
import { parseSmdsCsv } from "./smds";
import { parseAmoneCsv } from "./amone";
import { parseResonaCsv } from "./resona";
import { parseRakutenCsv } from "./rakuten";
import { parseDaiwaCsv } from "./daiwa";
import { parseCapitalCsv } from "./capital";

export type FundCsvParser = (csvText: string) => NormalizedNavRow[];

export const PARSERS: Record<string, FundCsvParser> = {
  mufg: parseMufgCsv,
  sbi: parseSbiCsv,
  smt: parseSmtCsv,
  smds: parseSmdsCsv,
  amone: parseAmoneCsv,
  resona: parseResonaCsv,
  rakuten: parseRakutenCsv,
  daiwa: parseDaiwaCsv,
  capital: parseCapitalCsv,
};