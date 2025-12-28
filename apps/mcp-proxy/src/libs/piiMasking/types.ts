/**
 * PIIマスキング関連の型定義
 */

/**
 * PIIマスキングの設定
 */
export type PiiMaskingConfig = {
  /** GCPプロジェクトID */
  projectId: string;
  /** PIIマスキング機能が利用可能かどうか */
  isAvailable: boolean;
};

/**
 * 検出されたPII情報
 */
export type DetectedPii = {
  /** InfoType名（例: EMAIL_ADDRESS, PHONE_NUMBER） */
  infoType: string;
  /** 検出件数 */
  count: number;
};

/**
 * テキストマスキング結果
 */
export type MaskingResult = {
  /** マスキング後のテキスト */
  maskedText: string;
  /** 検出されたPIIの総数 */
  detectedCount: number;
  /** 検出されたPIIのリスト */
  detectedPiiList: DetectedPii[];
  /** 処理時間（ミリ秒） */
  processingTimeMs: number;
};

/**
 * JSONマスキング結果
 */
export type JsonMaskingResult<T = unknown> = {
  /** マスキング後のデータ */
  maskedData: T;
  /** 検出されたPIIの総数 */
  detectedCount: number;
  /** 検出されたPIIのリスト */
  detectedPiiList: DetectedPii[];
  /** 処理時間（ミリ秒） */
  processingTimeMs: number;
};

/**
 * GCP DLPで検出するInfoType
 * @see https://cloud.google.com/sensitive-data-protection/docs/infotypes-reference
 */
export const DEFAULT_INFO_TYPES = [
  // 基本的なPII
  "EMAIL_ADDRESS",
  "PHONE_NUMBER",
  "CREDIT_CARD_NUMBER",
  "IP_ADDRESS",
  "IBAN_CODE",

  // 認証関連
  "AUTH_TOKEN",
  "GCP_API_KEY",
  "AWS_CREDENTIALS",
  "AZURE_AUTH_TOKEN",
  "ENCRYPTION_KEY",
  "JSON_WEB_TOKEN",
  "HTTP_COOKIE",
  "OAUTH_CLIENT_SECRET",
  "PASSWORD",
  "XSRF_TOKEN",

  // 個人情報
  "PERSON_NAME",
  "STREET_ADDRESS",
  "DATE_OF_BIRTH",

  // 日本固有のPII
  "JAPAN_INDIVIDUAL_NUMBER", // マイナンバー
  "JAPAN_PASSPORT",
  "JAPAN_DRIVERS_LICENSE_NUMBER",
] as const;

export type InfoType = (typeof DEFAULT_INFO_TYPES)[number];
