/**
 * 画像アップロード用共通定数
 *
 * @description
 * APIエンドポイント（route.ts）とクライアントフック（useImageUpload.ts）で
 * 同じバリデーションルールを使用するための共通定数
 *
 * @note SVGは意図的にサポート外としています。
 * SVGはXSS、スクリプトインジェクション、外部リソース読み込みなど
 * 多くのセキュリティリスクがあるため、MCPサーバーアイコン用途では
 * PNG/WebPで十分と判断しました。
 */

// サポートする画像形式（SVGは除外）
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

// 最大ファイルサイズ: 5MB
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_FILE_SIZE_MB = 5;

// エラーメッセージ定義（統一）
export const UPLOAD_ERROR_MESSAGES = {
  INVALID_TYPE:
    "この形式はサポートされていません。JPEG、PNG、WebP、GIF形式の画像をお使いください。",
  FILE_TOO_LARGE: `ファイルサイズは${MAX_FILE_SIZE_MB}MB以下にしてください`,
  INVALID_SIGNATURE:
    "ファイル形式が不正です。正しい画像ファイルをアップロードしてください",
  UPLOAD_FAILED: "アップロードに失敗しました",
  NETWORK_ERROR: "ネットワークエラーが発生しました",
  MISSING_PARAMS: "orgSlugとmcpServerIdは必須です",
  NO_FILE: "ファイルがアップロードされていません",
  UNAUTHORIZED: "認証が必要です",
} as const;

// ファイルシグネチャ（マジックバイト）定義
// MIMEタイプのみの検証では拡張子偽装に対して脆弱なため、
// 実際のファイル内容（マジックバイト）を確認
export const FILE_SIGNATURES: Record<AllowedImageType, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF header（WEBP確認は別途）
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
};

// WebPファイルのバイト位置定数
export const WEBP_BYTE_POSITIONS = {
  // RIFF header: bytes 0-3
  RIFF_START: 0,
  RIFF_END: 4,
  // WEBP marker: bytes 8-11
  WEBP_MARKER_START: 8,
  WEBP_MARKER_END: 12,
} as const;

// WebPマジックバイト
export const WEBP_MAGIC_BYTES = {
  RIFF: [0x52, 0x49, 0x46, 0x46], // "RIFF"
  WEBP: [0x57, 0x45, 0x42, 0x50], // "WEBP"
} as const;

// MIMEタイプから拡張子へのマッピング
export const MIME_TO_EXTENSION: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
