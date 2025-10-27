/**
 * @fileoverview セキュリティユーティリティ関数
 * APIキーの検証とヘッダーのサニタイズ機能を提供
 */

/**
 * APIキーの形式が妥当かチェック
 * @param value - チェック対象の値
 * @returns APIキーとして有効な形式の場合true
 */
export const isValidApiKey = (value: string): boolean => {
  // APIキーは最低限の長さと英数字・記号のみを許可
  const minLength = 16;
  const validPattern = /^[A-Za-z0-9_\-\.]+$/;

  if (!value || value.length < minLength) {
    return false;
  }

  if (!validPattern.test(value)) {
    return false;
  }

  return true;
};

/**
 * HTTPヘッダーから機密情報（APIキー、トークン等）をマスク
 * @param headers - サニタイズ対象のヘッダー
 * @returns サニタイズ済みヘッダー（ログ出力用）
 */
export const sanitizeHeaders = (
  headers: Record<string, string>,
): Record<string, string> => {
  const sensitiveHeaderPatterns = [
    /api[-_]?key/i,
    /authorization/i,
    /token/i,
    /secret/i,
    /password/i,
    /credential/i,
  ];

  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const isSensitive = sensitiveHeaderPatterns.some((pattern) =>
      pattern.test(key),
    );

    if (isSensitive) {
      // 機密情報はマスク（先頭4文字のみ表示）
      sanitized[key] = value.length > 4 ? `${value.substring(0, 4)}***` : "***";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * ヘッダー名がAPIキー関連かどうかをチェック
 * @param headerName - チェック対象のヘッダー名
 * @returns APIキー関連ヘッダーの場合true
 */
export const isApiKeyHeader = (headerName: string): boolean => {
  return /api[-_]?key/i.test(headerName);
};
