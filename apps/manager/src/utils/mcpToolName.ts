/**
 * MCPツール名の解析ユーティリティ
 *
 * ツール名形式:
 * - 通常: "{slug}__{normalizedName}__{toolName}"
 * - メタツール（Dynamic Search）: "{slug}__{metaToolName}"
 */

/**
 * ツール名解析結果
 */
export type ParsedToolName = {
  serverSlug: string;
  displayToolName: string;
};

/**
 * ツール名からMCPサーバーslugと表示用ツール名を抽出
 *
 * 形式: "{slug}__{normalizedName}__{toolName}" または "{slug}__{metaToolName}"
 *
 * 例:
 * - "linear-mcp__linear__list_teams" -> { serverSlug: "linear-mcp", displayToolName: "list_teams" }
 * - "linear-mcp__search_tools" -> { serverSlug: "linear-mcp", displayToolName: "search_tools" }
 */
export const parseToolName = (fullToolName: string): ParsedToolName => {
  const parts = fullToolName.split("__");

  // パースできない場合はそのまま表示
  if (parts.length < 2) {
    return { serverSlug: "", displayToolName: fullToolName };
  }

  const serverSlug = parts[0] ?? "";

  // 3つ以上: {slug}__{normalizedName}__{toolName} -> toolName以降を結合
  // 2つ: {slug}__{metaToolName} -> metaToolNameのみ
  const displayToolName =
    parts.length >= 3 ? parts.slice(2).join("__") : (parts[1] ?? "");

  return { serverSlug, displayToolName };
};
