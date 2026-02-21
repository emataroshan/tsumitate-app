## /tools/excel_to_funds_gui.py

import re
from pathlib import Path
import pandas as pd
import tkinter as tk
from tkinter import filedialog, messagebox

OUTPUT_TS = "data/funds.ts"
DEFAULT_SHEET = "funds"

COL_ID = "id"
COL_NAME = "name"
COL_PROVIDER = "provider"
COL_TAGS = "タグ"
COL_EXPENSE = "管理費用"
COL_RETURN = "リターン（年率）"


# -----------------------
# 変換関数
# -----------------------

def parse_percent_to_decimal(x):
    """
    受け取り例：
    - Excel%セル: 0.005775（表示 0.5775%） -> 0.005775（そのまま）
    - 文字列: "0.5775%" -> 0.005775
    - 文字列: "20.77%"  -> 0.2077
    - 数値: 20.77 -> 0.2077（%値とみなして /100）
    """
    if x is None or (isinstance(x, float) and pd.isna(x)):
        return None

    # 数値の場合
    if isinstance(x, (int, float)):
        v = float(x)
        # Excelの%セルは 0.2077 のように 0〜1 で入ってくることが多い
        if 0 <= v <= 1:
            return v
        # それ以外は「%の数値」とみなす（20.77 など）
        return v / 100.0

    # 文字列の場合
    s = str(x).strip().replace(",", "")
    if s == "":
        return None

    if s.endswith("%"):
        s = s[:-1].strip()
        return float(s) / 100.0

    # "%"が無い数値文字列は、まず数値化して判定
    v = float(s)
    if 0 <= v <= 1:
        return v
    return v / 100.0


def split_tags(x):

    if x is None:
        return []

    parts = re.split(r"[,\s/／|｜、・]+", str(x))
    return [p for p in parts if p]


def ts_string(s):
    return s.replace("\\", "\\\\").replace('"', '\\"')

def make_id_from_name(name: str) -> str:
    """
    nameからURL安全なidを生成する（簡易slug）
    - 日本語は残しつつ、記号/空白をハイフンに寄せる
    - 空になった場合の保険も入れる
    """
    s = str(name).strip().lower()
    # 記号・空白っぽいものをハイフンに
    s = re.sub(r"[ 　\t\r\n/／・、,｜|]+", "-", s)
    # 連続ハイフン圧縮
    s = re.sub(r"-{2,}", "-", s).strip("-")
    # それでも空なら保険
    return s if s else "fund"

# -----------------------
# メイン処理
# -----------------------

def generate_funds_ts(excel_path):

    df = pd.read_excel(excel_path, sheet_name=DEFAULT_SHEET)

    # ===== デバッグ用ログ追加 =====
    print("====================================")
    print("Excel file:", excel_path)
    print("Sheet:", DEFAULT_SHEET)
    print("Rows loaded from Excel:", len(df))
    print("Columns:", list(df.columns))
    print("====================================")

    funds = []
    skipped = 0
    generated = 0
    used_ids = set()

    for i, row in df.iterrows():

        raw_id = row.get(COL_ID)
        raw_name = row.get(COL_NAME)

        # nameが空の行はデータ行として成立しないのでスキップ
        if raw_name is None or (isinstance(raw_name, float) and pd.isna(raw_name)) or str(raw_name).strip() == "":
            skipped += 1
            print(f"[SKIP] df_index={i} reason=empty_name id={raw_id}")
            continue

        # idが空ならnameから生成して救済
        if raw_id is None or (isinstance(raw_id, float) and pd.isna(raw_id)) or str(raw_id).strip() == "":
            base = make_id_from_name(raw_name)
            fid = base
            n = 2
            while fid in used_ids:
                fid = f"{base}-{n}"
                n += 1
            generated += 1
            print(f"[INFO] df_index={i} id_missing -> generated id='{fid}' name='{raw_name}'")
        else:
            fid = str(raw_id).strip()

        used_ids.add(fid)

        fund = {

            "id": fid,
            "name": str(raw_name).strip(),
            "provider": (None if row.get(COL_PROVIDER) is None or (isinstance(row.get(COL_PROVIDER), float) and pd.isna(row.get(COL_PROVIDER))) else str(row.get(COL_PROVIDER)).strip()),
            "tags": split_tags(row[COL_TAGS]),
            "expense_ratio": parse_percent_to_decimal(row[COL_EXPENSE]),
            "ref_return": parse_percent_to_decimal(row[COL_RETURN]),

        }

        funds.append(fund)

    print("====================================")
    print("Funds created:", len(funds))
    print("Rows skipped (empty name):", skipped)
    print("Ids generated (missing id):", generated)
    print("====================================")

    lines = []

    lines.append('import { Fund } from "@/lib/types";')
    lines.append("")
    lines.append("export const funds: Fund[] = [")

    for f in funds:

        lines.append("  {")

        lines.append(f'    id: "{ts_string(f["id"])}",')
        lines.append(f'    name: "{ts_string(f["name"])}",')
        lines.append(f'    provider: "{ts_string(f["provider"])}",')

        tags = ", ".join([f'"{t}"' for t in f["tags"]])
        lines.append(f"    tags: [{tags}],")

        lines.append(f"    expense_ratio: {f['expense_ratio']},")
        lines.append(f"    ref_return: {f['ref_return']},")
        lines.append("  },")

    lines.append("];")

    Path(OUTPUT_TS).write_text("\n".join(lines), encoding="utf-8")



# -----------------------
# GUI
# -----------------------

def select_file():

    path = filedialog.askopenfilename(

        title="Excelファイルを選択",
        filetypes=[("Excel files", "*.xlsx *.xls *.xlsm")]

    )

    if not path:
        return

    try:

        generate_funds_ts(path)

        messagebox.showinfo("成功", "funds.ts を生成しました！")

    except Exception as e:

        messagebox.showerror("エラー", str(e))


root = tk.Tk()

root.title("funds.ts 生成ツール")

root.geometry("300x120")

btn = tk.Button(root, text="Excelを選択", command=select_file)

btn.pack(expand=True)

root.mainloop()