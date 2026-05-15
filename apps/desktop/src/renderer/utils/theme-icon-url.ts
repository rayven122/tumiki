/** ライトモード用の `-light` バリアントが存在するアイコンのベース名。新規アイコン追加時はここに追記する */
export const LIGHT_VARIANT_ICONS = new Set(["notion", "attio"]);

/** ダークモード用の `-dark` バリアントが存在するアイコンのベース名。新規アイコン追加時はここに追記する */
export const DARK_VARIANT_ICONS = new Set([
  "outline",
  "sequential-thinking",
  "github_black",
  "moneyforward",
]);

type GetThemeIconUrl = {
  (iconUrl: string, theme: "light" | "dark"): string;
  (
    iconUrl: string | null | undefined,
    theme: "light" | "dark",
  ): string | null | undefined;
};

/**
 * テーマに応じたアイコンURLを返す（ライト/ダーク各バリアントを優先）。
 * バリアントが存在しない場合は元のURLをそのまま返す。
 */
export const getThemeIconUrl: GetThemeIconUrl = (
  iconUrl: string | null | undefined,
  theme: "light" | "dark",
): string | null | undefined => {
  if (!iconUrl) return iconUrl;
  const match = iconUrl.match(/\/([^/?#]+)\.[a-zA-Z0-9]+(?:[?#].*)?$/);
  const baseName = match?.[1];
  if (!baseName) return iconUrl;
  if (theme === "light" && LIGHT_VARIANT_ICONS.has(baseName)) {
    return iconUrl.replace(/(\.[a-zA-Z0-9]+)(?=[?#]|$)/, "-light$1");
  }
  if (theme === "dark" && DARK_VARIANT_ICONS.has(baseName)) {
    return iconUrl.replace(/(\.[a-zA-Z0-9]+)(?=[?#]|$)/, "-dark$1");
  }
  return iconUrl;
};
