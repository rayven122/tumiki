import { auth } from "express-oauth2-jwt-bearer";

/**
 * Auth0設定の一元管理
 */
export const auth0Config = {
  /**
   * Auth0ドメイン設定
   */
  domains: {
    /** メインAuth0ドメイン（ユーザー認証用） */
    main: process.env.AUTH0_DOMAIN || "",
    /** M2M認証用Auth0ドメイン */
    m2m: process.env.AUTH0_M2M_DOMAIN || "",
    /** 実際のAuth0テナントドメイン（カスタムドメインではない） */
    tenant: "rayven.jp.auth0.com",
  },

  /**
   * API設定
   */
  api: {
    /** APIオーディエンス */
    audience: "https://auth.tumiki.cloud/api",
    /** 発行者ベースURL */
    issuerBaseURL: "https://rayven.jp.auth0.com/",
  },

  /**
   * トークン設定
   */
  token: {
    /** トークン署名アルゴリズム */
    signingAlg: "RS256" as const,
  },

  /**
   * エンドポイントURL（テナントドメインを使用）
   */
  get endpoints() {
    const tenant = this.domains.tenant;
    return {
      /** 認可エンドポイント */
      authorize: `https://${tenant}/authorize`,
      /** トークンエンドポイント */
      token: `https://${tenant}/oauth/token`,
      /** ユーザー情報エンドポイント */
      userinfo: `https://${tenant}/userinfo`,
      /** JWKSエンドポイント */
      jwks: `https://${tenant}/.well-known/jwks.json`,
      /** デバイス認証エンドポイント */
      deviceAuthorization: `https://${tenant}/oauth/device/code`,
      /** MFAチャレンジエンドポイント */
      mfaChallenge: `https://${tenant}/mfa/challenge`,
      /** リボケーションエンドポイント */
      revocation: `https://${tenant}/oauth/revoke`,
      /** ログアウトエンドポイント */
      logout: `https://${tenant}/v2/logout`,
    };
  },

  /**
   * 設定の検証
   */
  validate(): void {
    if (!this.domains.main) {
      throw new Error("AUTH0_DOMAIN environment variable is required");
    }
    if (!this.domains.m2m) {
      throw new Error("AUTH0_M2M_DOMAIN environment variable is required");
    }
  },

  /**
   * 設定が有効かどうか
   */
  isConfigured(): boolean {
    return Boolean(this.domains.main && this.domains.m2m);
  },
} as const;

/**
 * JWT検証ミドルウェアの共通設定
 */
export const createJwtCheck = () => {
  return auth({
    audience: auth0Config.api.audience,
    issuerBaseURL: auth0Config.api.issuerBaseURL,
    tokenSigningAlg: auth0Config.token.signingAlg,
  });
};

/**
 * OAuth認証時のペイロード型定義
 */
export interface OAuthPayload {
  sub?: string;
  scope?: string;
  permissions?: string[];
}

/**
 * JWTペイロード型（express-oauth2-jwt-bearerから）
 */
export interface JWTAuth {
  payload?: OAuthPayload;
  header?: Record<string, unknown>;
  token?: string;
}
