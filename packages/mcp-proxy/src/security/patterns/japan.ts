import type { PIIPattern } from "openredaction";

// 日本特化の PII 検出パターン
// 詳細・拡充（マイナンバーのチェックディジット検証、運転免許証等）は DEV-1585 で対応予定
export const japanPatterns: PIIPattern[] = [
  {
    type: "JP_PHONE",
    regex: /0\d{1,4}-\d{1,4}-\d{4}/g,
    priority: 10,
    placeholder: "[JP_PHONE_{n}]",
    severity: "medium",
    description: "日本の電話番号（ハイフン区切り、固定/携帯）",
  },
  {
    type: "JP_POSTAL_CODE",
    regex: /〒?\d{3}-\d{4}/g,
    priority: 10,
    placeholder: "[JP_POSTAL_CODE_{n}]",
    severity: "low",
    description: "日本の郵便番号（〒記号有無を許容）",
  },
];
