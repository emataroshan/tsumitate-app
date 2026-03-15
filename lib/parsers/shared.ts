// lib/parsers/shared.ts

export function normalizeDate(value: string): string {
  const v = value.trim().replace(/\./g, "/").replace(/-/g, "/");
  const [y, m, d] = v.split("/").map((x) => x.trim());

  if (!y || !m || !d) {
    throw new Error(`Invalid date format: ${value}`);
  }

  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function toNumber(value: string | undefined): number {
  if (!value) return 0;

  const cleaned = value
    .replace(/,/g, "")
    .replace(/"/g, "")
    .trim();

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function splitLines(csvText: string): string[] {
  return csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function stripBom(value: string): string {
  return value.replace(/^\uFEFF/, "");
}

export function splitLooseDelimitedLine(line: string): string[] {
  const normalized = stripBom(line).trim();

  if (normalized.includes("\t")) {
    return normalized.split("\t").map((v) => v.trim());
  }

  return normalized.split(",").map((v) => v.trim());
}

/**
 * 最小限のCSV対応:
 * - カンマ区切り
 * - ダブルクォート内のカンマを維持
 * - ダブルクォート自体は取り除く
 */
export function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  result.push(current.trim());
  return result;
}

export function sortRowsByDate<T extends { date: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}