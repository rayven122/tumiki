// NODE_ENV は Next.js / webpack が build 時に確実に "production" / "development" に
// 静的展開してくれるため、process.env.NODE_ENV ベースの固定値が一番安定する。
// staging など別 URL を使う場合は別 image を build する想定 (ソースで切り替え)。
const MCP_PROXY_SERVER_URL =
  process.env.NODE_ENV === "production"
    ? "https://server.tumiki.cloud"
    : "http://localhost:8080";

/**
 * プロキシサーバーのベースURLを取得
 */
export const getProxyServerUrl = () => {
  return MCP_PROXY_SERVER_URL;
};

export const makeSseProxyServerUrl = (slug: string) => {
  return `${MCP_PROXY_SERVER_URL}/sse/${slug}`;
};

export const makeHttpProxyServerUrl = (slug: string) => {
  return `${MCP_PROXY_SERVER_URL}/mcp/${slug}`;
};

/**
 * アプリケーションのベースURLを取得
 * NEXTAUTH_URL > VERCEL_URL > localhost:3000 の優先順位
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

  return "http://localhost:3000";
};

/**
 * OAuth認証のリダイレクトURIを生成
 */
export const getOAuthRedirectUri = (): string => {
  return `${getAppBaseUrl()}/api/oauth/callback`;
};

/**
 * 招待URLを生成
 */
export const generateInviteUrl = (token: string): string => {
  return `${getAppBaseUrl()}/invite/${token}`;
};
