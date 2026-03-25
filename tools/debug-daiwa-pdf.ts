// tools/debug-daiwa-pdf.ts
//
// 使い方:
//   npx tsx tools/debug-daiwa-pdf.ts "https://www.daiwa-am.co.jp/funds/doc_open/fund_doc_open.php?code=3346&type=1&preview=on"
//
// 目的:
// - pdfjs-dist で Daiwa PDF の各ページ text items を確認する
// - どのページに「信託報酬」「0.7755」などがあるか探す
// - pdf-parse では取れなかったテキストが pdf.js で取れるか検証する

type TextItemLike = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
};

function normalizeText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/\u3000/g, " ")
    .replace(/％/g, "%")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function summarize(text: string, max = 500): string {
  const normalized = normalizeText(text);
  if (normalized.length <= max) return normalized;
  return normalized.slice(0, max) + " ...";
}

function buildLineTextFromItems(items: TextItemLike[]): string {
  // transform[5] をY座標として、近いY同士を同じ行にまとめる
  const rows = new Map<string, { x: number; str: string }[]>();

  for (const rawItem of items) {
    const str = rawItem?.str ?? "";
    if (!str.trim()) continue;

    const transform = rawItem.transform ?? [0, 0, 0, 0, 0, 0];
    const x = Number(transform[4] ?? 0);
    const y = Number(transform[5] ?? 0);

    // PDFの座標ぶれ吸収
    const rowKey = String(Math.round(y * 2) / 2);

    const row = rows.get(rowKey) ?? [];
    row.push({ x, str });
    rows.set(rowKey, row);
  }

  const sortedRows = [...rows.entries()]
    .map(([y, row]) => ({
      y: Number(y),
      row: row.sort((a, b) => a.x - b.x),
    }))
    .sort((a, b) => b.y - a.y); // PDFは上→下で y が大きいことが多い

  const lines: string[] = [];

  for (const { row } of sortedRows) {
    const line = row.map((v) => v.str).join(" ");
    if (line.trim()) lines.push(line);
  }

  return normalizeText(lines.join("\n"));
}

function keywordMatches(text: string, keywords: string[]): string[] {
  const normalized = normalizeText(text);
  return keywords.filter((k) => normalized.includes(k));
}

async function main() {
  const sourceUrl = process.argv[2];

  if (!sourceUrl) {
    console.error("URLを指定してください。");
    console.error(
      '例: npx tsx tools/debug-daiwa-pdf.ts "https://www.daiwa-am.co.jp/funds/doc_open/fund_doc_open.php?code=3346&type=1&preview=on"',
    );
    process.exit(1);
  }

  console.log("=== DAIWA PDF DEBUG START ===");
  console.log("sourceUrl:", sourceUrl);

  const res = await fetch(sourceUrl);
  if (!res.ok) {
    throw new Error(`PDF取得失敗: ${res.status} ${res.statusText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // PDF.js 公式Node例は legacy/build/pdf.mjs を使用
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const loadingTask = pdfjs.getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    verbosity: 0,
  });

  const pdf = await loadingTask.promise;
  console.log("numPages:", pdf.numPages);

  const keywords = [
    "ファンドの費用",
    "ファンドの費用・税金",
    "運用管理費用",
    "信託報酬",
    "年率0.7755",
    "0.7755",
    "税抜0.705",
    "0.705",
    "委託会社",
    "販売会社",
    "受託会社",
  ];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items = (textContent.items ?? []) as TextItemLike[];

    const rawJoined = normalizeText(
      items
        .map((item) => item.str ?? "")
        .filter(Boolean)
        .join(" "),
    );

    const lineText = buildLineTextFromItems(items);

    const rawHits = keywordMatches(rawJoined, keywords);
    const lineHits = keywordMatches(lineText, keywords);

    console.log("\n----------------------------------------");
    console.log(`page ${pageNum}`);
    console.log("items:", items.length);
    console.log("rawJoined.length:", rawJoined.length);
    console.log("lineText.length:", lineText.length);
    console.log("raw hits:", rawHits.length ? rawHits.join(", ") : "(none)");
    console.log("line hits:", lineHits.length ? lineHits.join(", ") : "(none)");

    if (rawHits.length || lineHits.length || pageNum <= 3) {
      console.log("\n[rawJoined preview]");
      console.log(summarize(rawJoined, 1200));

      console.log("\n[lineText preview]");
      console.log(summarize(lineText, 1200));
    }
  }

  await loadingTask.destroy();
  console.log("\n=== DAIWA PDF DEBUG END ===");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});