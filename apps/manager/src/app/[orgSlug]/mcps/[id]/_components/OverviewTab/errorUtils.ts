/**
 * エラーメッセージを安全にサニタイズする
 * セキュリティ上の理由で、本番環境では一般的なメッセージを返す
 */
export const sanitizeErrorMessage = (
  error: { message: string },
  fallbackMessage = "操作に失敗しました",
): string => {
  const errorMessage = error.message;

  // 認証・認可エラー
  if (
    errorMessage.toLowerCase().includes("unauthorized") ||
    errorMessage.toLowerCase().includes("forbidden") ||
    errorMessage.toLowerCase().includes("authentication")
  ) {
    return "アクセス権限がありません";
  }

  // バリデーションエラー
  if (
    errorMessage.toLowerCase().includes("validation") ||
    errorMessage.toLowerCase().includes("invalid")
  ) {
    return "入力内容が正しくありません";
  }

  // ネットワークエラー
  if (
    errorMessage.toLowerCase().includes("network") ||
    errorMessage.toLowerCase().includes("timeout") ||
    errorMessage.toLowerCase().includes("connection")
  ) {
    return "ネットワークエラーが発生しました";
  }

  // その他の既知のエラー（日本語メッセージはそのまま表示）
  if (/^[ぁ-んァ-ヶー一-龠々〆〤]+/.test(errorMessage)) {
    return errorMessage;
  }

  // 本番環境では一般的なメッセージを返す
  if (process.env.NODE_ENV === "production") {
    return fallbackMessage;
  }

  // 開発環境では詳細なエラーメッセージを返す
  return errorMessage;
};
