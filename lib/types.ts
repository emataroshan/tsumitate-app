// lib/types.ts

export type Fund = {
  id: string;
  name: string;
  provider?: string;
  tags?: string[];
  expense_ratio: number; // 例: 0.0005775 (=0.05775%)
  ref_return: number; // 例: 0.10 (=10%/年) 各ファンドの参考年率（初期値）
};