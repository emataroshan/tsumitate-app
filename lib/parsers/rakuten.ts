// lib/parsers/rakuten.ts

import type { NormalizedNavRow } from "../types";
import { parseMufgCsv } from "./mufg";

export function parseRakutenCsv(csvText: string): NormalizedNavRow[] {
  return parseMufgCsv(csvText);
}