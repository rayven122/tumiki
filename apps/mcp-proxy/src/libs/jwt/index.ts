/**
 * JWT ユーティリティ
 *
 * Keycloak JWT の処理を行うヘルパー関数を提供
 */

/**
 * JWTから発行者（issuer）を抽出（検証なし）
 *
 * 認証ミドルウェアで認証方式を判定するために使用
 * Keycloak JWT（iss に "keycloak" を含む）を検出
 *
 * 注意: このメソッドは署名検証を行いません
 *
 * @param token - JWT文字列
 * @returns 発行者（iss）、抽出失敗時はnull
 */
export const getIssuerFromToken = (token: string): string | null => {
  try {
    // JWTはBase64URL.Base64URL.Base64URLの3部構成
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // ペイロード部分（2番目）をデコード
    const payload: unknown = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    );

    // 型ガード: payload が { iss: string } の形式かチェック
    if (
      typeof payload === "object" &&
      payload !== null &&
      "iss" in payload &&
      typeof payload.iss === "string"
    ) {
      return payload.iss;
    }

    return null;
  } catch {
    return null;
  }
};
