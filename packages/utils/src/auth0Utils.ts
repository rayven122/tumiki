/**
 * Auth0 sub から実際の userId を抽出する
 * @param sub Auth0 の sub (例: "github|141129258", "google-oauth2|102635221332040133994")
 * @returns userId 部分のみ (例: "141129258", "102635221332040133994")
 */
export const extractUserIdFromSub = (sub: string): string => {
  const parts = sub.split("|");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid Auth0 sub format: ${sub}`);
  }
  return parts[1];
};

/**
 * provider と userId から Auth0 の sub を構築する
 * @param provider プロバイダー名 (例: "github", "google-oauth2")
 * @param userId ユーザーID (例: "141129258", "102635221332040133994")
 * @returns Auth0 sub (例: "github|141129258")
 */
export const buildAuth0Sub = (provider: string, userId: string): string => {
  return `${provider}|${userId}`;
};

/**
 * Auth0 sub からプロバイダー名を抽出する
 * @param sub Auth0 の sub
 * @returns プロバイダー名 (例: "github", "google-oauth2")
 */
export const extractProviderFromSub = (sub: string): string => {
  const parts = sub.split("|");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid Auth0 sub format: ${sub}`);
  }
  return parts[0];
};

/**
 * 文字列が Auth0 sub 形式かどうかを判定する
 * @param value 検証する文字列
 * @returns Auth0 sub 形式の場合は true
 */
export const isAuth0Sub = (value: string): boolean => {
  const parts = value.split("|");
  return (
    parts.length === 2 &&
    !!parts[0] &&
    parts[0].length > 0 &&
    !!parts[1] &&
    parts[1].length > 0
  );
};
