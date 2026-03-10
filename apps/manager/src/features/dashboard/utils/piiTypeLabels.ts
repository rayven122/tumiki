/**
 * PII InfoTypeの日本語ラベルマッピング
 */
const PII_TYPE_LABELS: Record<string, string> = {
  EMAIL_ADDRESS: "メール",
  PHONE_NUMBER: "電話番号",
  PERSON_NAME: "氏名",
  STREET_ADDRESS: "住所",
  CREDIT_CARD_NUMBER: "クレカ",
  JAPAN_PASSPORT: "パスポート",
  JAPAN_DRIVERS_LICENSE_NUMBER: "免許証",
  JAPAN_MY_NUMBER: "マイナンバー",
  JAPAN_BANK_ACCOUNT: "口座番号",
  IP_ADDRESS: "IPアドレス",
  DATE_OF_BIRTH: "生年月日",
};

/**
 * PII InfoTypeを日本語ラベルに変換
 *
 * 未知のInfoTypeはそのまま返す
 */
export const getPiiTypeLabel = (type: string): string =>
  PII_TYPE_LABELS[type] ?? type;
