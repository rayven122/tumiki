/**
 * OAuthリダイレクトURI（loopback HTTP固定値）
 *
 * RFC 8252 (OAuth 2.0 for Native Apps) §7.3 準拠。
 * カスタムスキーム非対応サービス（HubSpot/Asana/MoneyForward等）にも対応するため、
 * 全OAuthサービス共通でループバックHTTPコールバックを使用する。
 *
 * 固定ポートを採用する理由:
 * - DCR非対応サービス（GitHub/HubSpot/Slack/Box）でユーザーが事前にOAuthアプリへ
 *   登録するURIが確定する（毎回ポートが変わる動的方式ではUXが破綻する）
 * - DCRキャッシュをそのまま再利用できる（redirect_uri不一致での再登録が不要）
 * - ポート完全一致を要求するAS実装でもブラウザ→ループバックのリダイレクトが安定する
 *
 * ポート選定:
 * - 49152-65535（IANA dynamic/private port range）から選択
 * - 33418 は主要サービスと衝突しない値
 * - ローカルで他プロセスが先に占有している場合は明示エラーで通知
 */

export const MCP_OAUTH_LOOPBACK_HOST = "127.0.0.1";
export const MCP_OAUTH_LOOPBACK_PORT = 33418;
export const MCP_OAUTH_CALLBACK_PATH = "/callback";

/** SaaS側のOAuthアプリ設定で登録する Callback URL（Redirect URI） */
export const MCP_OAUTH_REDIRECT_URI = `http://${MCP_OAUTH_LOOPBACK_HOST}:${MCP_OAUTH_LOOPBACK_PORT}${MCP_OAUTH_CALLBACK_PATH}`;
