/**
 * サブドメインを除去してルートドメインを取得する関数
 * @param hostname - ホスト名
 * @returns ルートドメインまたは元のホスト名
 */
const getRootDomain = (hostname: string): string => {
  // IPv4アドレスの場合はそのまま返す
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return hostname;
  }

  // localhostの場合はそのまま返す
  if (hostname === "localhost") {
    return hostname;
  }

  const parts = hostname.split(".");

  // ドメインが2つ以下の部分しかない場合（例: example.com）はそのまま返す
  if (parts.length <= 2) {
    return hostname;
  }

  // wwwサブドメインの場合はそのまま返す
  if (parts[0] === "www") {
    return hostname;
  }

  // それ以外のサブドメインは除去してルートドメインを返す
  // 例: api.example.com -> example.com, subdomain.example.co.jp -> example.co.jp
  return parts.slice(-2).join(".");
};

/**
 * URLからドメイン名を抽出する関数（クライアントサイド専用）
 * @param url - 抽出対象のURL
 * @returns ドメイン名またはnull（無効なURLの場合）
 */
export const extractDomainFromUrl = (url: string): string | null => {
  if (typeof window === "undefined") {
    // サーバーサイドでは処理しない
    return null;
  }

  try {
    // URLが相対パスの場合やプロトコルがない場合を考慮
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const urlObject = new URL(normalizedUrl);
    const hostname = urlObject.hostname;

    // サブドメインを除去してルートドメインを取得
    return getRootDomain(hostname);
  } catch {
    return null;
  }
};

/**
 * ドメイン名から複数のファビコンURLを生成する関数
 * フォールバック戦略に基づいて優先度順にURLを返す
 * @param domain - ドメイン名
 * @param size - ファビコンのサイズ（デフォルト: 32）
 * @returns ファビコンURLの配列（優先度順）
 */
export const getFaviconUrls = (domain: string, size = 32): string[] => {
  if (!domain) return [];

  return [
    // 1. Google Favicon Service (最も信頼性が高い)
    `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`,
    // 2. サイト直接のfavicon.ico
    `https://${domain}/favicon.ico`,
    // 3. DuckDuckGo Favicon Service (バックアップ)
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
};

/**
 * URLからファビコンURLのリストを取得する関数
 * @param url - MCPサーバーのURL
 * @param size - ファビコンのサイズ（デフォルト: 32）
 * @returns ファビコンURLの配列
 */
export const getFaviconUrlsFromUrl = (url: string, size = 32): string[] => {
  const domain = extractDomainFromUrl(url);
  return domain ? getFaviconUrls(domain, size) : [];
};
