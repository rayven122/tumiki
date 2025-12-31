/**
 * PIIマスキングモードのラベルマップ
 */
export const PII_MASKING_MODE_LABELS = {
  DISABLED: "無効",
  REQUEST: "リクエスト",
  RESPONSE: "レスポンス",
  BOTH: "両方",
} as const;

export type PiiMaskingMode = keyof typeof PII_MASKING_MODE_LABELS;
