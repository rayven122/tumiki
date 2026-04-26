/**
 * MCP関連の共通定数
 * main / renderer 両方で使用する
 */

/** 仮想MCPサーバーが束ねられる最大接続数 */
export const VIRTUAL_SERVER_MAX_CONNECTIONS = 10;

/**
 * slug が空文字になった場合のフォールバックプレフィックス
 * サーバー名/カタログ名が日本語のみの場合、toSlug() が空文字を返すため
 * `${SLUG_FALLBACK_PREFIX}-{4文字乱数}` 形式で Anthropic API の tool name 制約
 * (^[a-zA-Z0-9_-]{1,64}$) を満たす一意な slug を生成する
 */
export const SLUG_FALLBACK_PREFIX = "connector";

/**
 * 自動生成slugのUI表示用プレースホルダー
 * 実際の乱数値はmain側で確定するため、UIでは固定文字列で代用する
 */
export const FALLBACK_SLUG_PLACEHOLDER = `${SLUG_FALLBACK_PREFIX}-xxxx`;
