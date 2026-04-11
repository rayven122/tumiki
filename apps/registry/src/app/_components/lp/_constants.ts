/* LP各セクションで共有するデータ定数 */

/** サマリーカード（Monitor セクション共通） */
export const SUMMARY_CARDS = [
  { value: "342,800", label: "総リクエスト", color: "text-white" },
  { value: "1,247", label: "ブロック", color: "text-red-400" },
  { value: "99.6%", label: "成功率", color: "text-emerald-400" },
  { value: "8,420", label: "PIIマスキング", color: "text-amber-400" },
] as const;
