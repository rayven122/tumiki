import type { Context, Next } from "hono";
import type { HonoEnv } from "../../types/index.js";
import { logError, logInfo, logDebug } from "../../libs/logger/index.js";
import { AUTH_CONFIG } from "../../constants/config.js";
import { createUnauthorizedError } from "../../libs/error/index.js";
import { apiKeyAuthMiddleware } from "./apiKey.js";
import { devKeycloakAuth } from "./jwt.js";
import { keycloakOAuthMiddleware } from "./keycloakOAuth.js";
import { getIssuerFromToken } from "../../libs/jwt/index.js";

/**
 * 認証方式を判定
 *
 * Bearer Token の場合は、issuer を確認して OAuth / Keycloak JWT を区別
 *
 * @returns "jwt" | "apikey" | "oauth" | null
 */
const detectAuthType = (
  c: Context<HonoEnv>,
): "jwt" | "apikey" | "oauth" | null => {
  const authorization = c.req.header(AUTH_CONFIG.HEADERS.AUTHORIZATION);
  const xApiKey = c.req.header(AUTH_CONFIG.HEADERS.API_KEY);

  // Bearer Token の場合
  if (authorization?.startsWith("Bearer ")) {
    const token = authorization.substring(7);

    // API Key形式（tumiki_ で始まる）
    if (token.startsWith("tumiki_")) {
      return "apikey";
    }

    // JWT形式（eyJ で始まる base64 エンコードされたJSON）
    if (token.startsWith("eyJ")) {
      // Issuer を確認して OAuth / Keycloak JWT を区別
      const issuer = getIssuerFromToken(token);

      if (issuer?.includes("keycloak")) {
        // Keycloak JWT の場合、スコープで OAuth / 通常JWT を区別
        // OAuth の場合は "mcp:access" スコープが含まれる
        // 注意: この段階ではスコープを確認できないため、
        // 両方のケースで "jwt" として扱い、ミドルウェア内で分岐
        return "jwt"; // Keycloak JWT (OAuth or 通常認証)
      }

      // issuer が不明な場合はデフォルトで Keycloak として扱う
      return "jwt";
    }
  }

  // X-API-Key ヘッダー
  if (xApiKey) {
    return "apikey";
  }

  return null;
};

/**
 * JWT認証を実行
 *
 * Keycloak JWT の場合、カスタムクレームの有無で OAuth / 通常JWT を判定:
 * - OAuth: tumiki.org_id が存在し、tumiki_user_id が存在しない（Client Credentials Grant）
 * - 通常JWT: tumiki.tumiki_user_id が存在（Authorization Code Flow）
 *
 * 注意: mcp_instance_id はJWTに含めず、URLパスから取得・検証する
 * 権限チェックは MCP ハンドラー側で URL instance_id を使用して実行
 *
 * @param c - Honoコンテキスト
 * @returns エラーレスポンス or undefined（成功時）
 */
const authenticateWithJWT = async (
  c: Context<HonoEnv>,
): Promise<Response | void> => {
  logInfo("Starting JWT authentication process");
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await devKeycloakAuth(c, () => Promise.resolve());

    // devKeycloakAuth が Response を返した場合（認証失敗）
    if (result) {
      return result;
    }

    // JWT ペイロードが設定されていることを確認
    const jwtPayload = c.get("jwtPayload");

    if (!jwtPayload) {
      return c.json(createUnauthorizedError("Invalid JWT token"), 401);
    }

    logInfo("JWT payload extracted", { payload: jwtPayload });

    // OAuth認証の判定:
    // - org_id が存在
    // - tumiki_user_id が存在しない（OAuth Client Credentials Grant）
    // ユーザーJWTには tumiki_user_id が含まれるため、これで区別可能
    const isOAuthToken =
      jwtPayload.tumiki?.org_id && !jwtPayload.tumiki?.tumiki_user_id;

    if (isOAuthToken) {
      // OAuth認証として処理（Keycloak OAuth Middleware にリダイレクト）
      logInfo("Detected OAuth JWT, delegating to Keycloak OAuth middleware");
      return keycloakOAuthMiddleware(c);
    }

    // 通常のJWT認証として処理
    // mcp_instance_id はURLパスから取得するため、ここではチェックしない
    // 権限チェックは MCP ハンドラー側で URL instance_id を使用して実行

    // tumikiクレームの存在チェック（Keycloak Protocol Mapperで設定が必要）
    if (!jwtPayload.tumiki) {
      logError(
        "JWT missing tumiki claims",
        new Error("Missing tumiki namespace"),
        {
          hasPayload: !!jwtPayload,
          payloadKeys: Object.keys(jwtPayload as Record<string, unknown>),
        },
      );
      return c.json(
        createUnauthorizedError(
          "JWT token is missing required tumiki claims. Please configure Keycloak Protocol Mappers.",
        ),
        401,
      );
    }

    logDebug("JWT authentication successful", {
      userId: jwtPayload.tumiki.tumiki_user_id,
      orgId: jwtPayload.tumiki.org_id,
    });

    // 認証方式を記録
    c.set("authMethod", "jwt");

    // JWT認証では jwtPayload のみを使用（authInfo は不要）
    return undefined; // 成功
  } catch (error) {
    logError("JWT authentication failed", error as Error);
    return c.json(createUnauthorizedError("Invalid or expired JWT token"), 401);
  }
};

/**
 * 統合認証ミドルウェア
 *
 * Authorization ヘッダーの形式を判定して、適切な認証方法を選択:
 * - `Bearer eyJ...` (issuer: "keycloak") → JWT 認証（Keycloak）
 *   - OAuth: カスタムクレーム (tumiki.org_id) が存在し tumiki_user_id が存在しない
 *   - 通常JWT: カスタムクレーム (tumiki.tumiki_user_id) が存在
 * - `Bearer tumiki_...` → API Key 認証
 * - `X-API-Key` ヘッダー → API Key 認証
 * - なし → 401 エラー
 *
 * 注意: mcp_instance_id はJWTに含めず、URLパスから取得
 * 権限チェックは MCP ハンドラー側で実行
 */
export const integratedAuthMiddleware = async (
  c: Context<HonoEnv>,
  next: Next,
): Promise<Response | void> => {
  const authType = detectAuthType(c);

  if (!authType) {
    // 認証情報なし
    return c.json(
      createUnauthorizedError("Authentication required", {
        hint: "Provide JWT token (Bearer eyJ...), or API key (Bearer tumiki_... or X-API-Key header)",
      }),
      401,
    );
  }

  // JWT認証（Keycloak）
  // 内部でOAuth / 通常JWTを自動判定
  if (authType === "jwt") {
    logInfo("Using JWT authentication (Keycloak)");
    const result = await authenticateWithJWT(c);
    if (result) {
      return result; // エラーレスポンス
    }
    await next();
    return;
  }

  // API Key認証
  logInfo("Using API Key authentication");
  return apiKeyAuthMiddleware(c, next);
};
