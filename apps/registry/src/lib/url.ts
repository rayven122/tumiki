/**
 * アプリケーションのベースURLを取得
 * NEXTAUTH_URL > VERCEL_URL > localhost:3100 の優先順位
 */
export const getAppBaseUrl = (): string => {
  // ブラウザ環境の場合は window.location.origin を使用
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // サーバーサイド: 環境変数ベース
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3100";
};
