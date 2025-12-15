import { Issuer } from "openid-client";
import { createRemoteJWKSet } from "jose";
import { logDebug } from "../logger/index.js";

// === 型定義 ===
type JWKSFunction = ReturnType<typeof createRemoteJWKSet>;

// === キャッシュ変数 ===

/**
 * Keycloak Issuer のキャッシュ
 *
 * パフォーマンス最適化のため、Issuer discovery の結果をキャッシュ
 */
let keycloakIssuerCache: Issuer | null = null;

/**
 * Issuer Discovery 中の Promise
 *
 * 競合状態を防止するため、Discovery 中は既存の Promise を返す
 */
let issuerDiscoveringPromise: Promise<Issuer> | null = null;

/**
 * JWKS のキャッシュ
 *
 * パフォーマンス最適化のため、RemoteJWKSet をキャッシュ
 */
let jwksCache: JWKSFunction | null = null;

/**
 * JWKS 作成中の Promise
 *
 * 競合状態を防止するため、作成中は既存の Promise を返す
 */
let jwksCreatingPromise: Promise<JWKSFunction> | null = null;

// === 内部関数 ===

/**
 * Keycloak Issuer Discovery を実行する内部関数
 */
const discoverIssuer = async (): Promise<Issuer> => {
  const keycloakIssuerUrl = process.env.KEYCLOAK_ISSUER;
  if (!keycloakIssuerUrl) {
    throw new Error("KEYCLOAK_ISSUER environment variable is not set");
  }

  // Issuer Discovery（自動メタデータ取得）
  const issuer = await Issuer.discover(keycloakIssuerUrl);

  logDebug("Keycloak Issuer discovered", {
    issuer: issuer.issuer,
    jwksUri: issuer.metadata.jwks_uri,
    tokenEndpoint: issuer.metadata.token_endpoint,
  });

  keycloakIssuerCache = issuer;
  return issuer;
};

/**
 * JWKS を作成する内部関数
 */
const createJWKS = async (): Promise<JWKSFunction> => {
  const issuer = await getKeycloakIssuer();

  if (!issuer.metadata.jwks_uri) {
    throw new Error("JWKS URI not found in Keycloak metadata");
  }

  const jwks = createRemoteJWKSet(new URL(issuer.metadata.jwks_uri));

  logDebug("JWKS created", {
    jwksUri: issuer.metadata.jwks_uri,
  });

  jwksCache = jwks;
  return jwks;
};

// === 公開関数 ===

/**
 * Keycloak Issuer を取得（スレッドセーフ、キャッシュ付き）
 *
 * openid-client の Issuer.discover() を使用して
 * Keycloak の OAuth/OIDC メタデータを自動取得
 *
 * 並行リクエスト時の競合状態を防止:
 * - 既にキャッシュがある場合: 即座に返却
 * - Discovery 実行中の場合: 既存の Promise を返却
 * - 初回リクエストの場合: 新規 Discovery を開始
 */
export const getKeycloakIssuer = async (): Promise<Issuer> => {
  // 既にキャッシュがある場合はそのまま返す
  if (keycloakIssuerCache) {
    return keycloakIssuerCache;
  }

  // Discovery 中の場合は既存の Promise を返す（競合状態を回避）
  if (issuerDiscoveringPromise) {
    return issuerDiscoveringPromise;
  }

  // 新しい Discovery を開始
  issuerDiscoveringPromise = discoverIssuer();

  try {
    return await issuerDiscoveringPromise;
  } finally {
    issuerDiscoveringPromise = null;
  }
};

/**
 * JWKS（JSON Web Key Set）を取得（スレッドセーフ、キャッシュ付き）
 *
 * パフォーマンス最適化のため、RemoteJWKSet をキャッシュ
 *
 * 並行リクエスト時の競合状態を防止
 */
export const getJWKS = async (): Promise<JWKSFunction> => {
  // 既にキャッシュがある場合はそのまま返す
  if (jwksCache) {
    return jwksCache;
  }

  // 作成中の場合は既存の Promise を返す（競合状態を回避）
  if (jwksCreatingPromise) {
    return jwksCreatingPromise;
  }

  // 新しい作成を開始
  jwksCreatingPromise = createJWKS();

  try {
    return await jwksCreatingPromise;
  } finally {
    jwksCreatingPromise = null;
  }
};

/**
 * キャッシュをクリア（テスト用・設定変更時）
 */
export const clearKeycloakCache = (): void => {
  keycloakIssuerCache = null;
  issuerDiscoveringPromise = null;
  jwksCache = null;
  jwksCreatingPromise = null;
};

/**
 * キャッシュの状態を取得（テスト用）
 */
export const getKeycloakCacheStatus = (): {
  hasIssuerCache: boolean;
  hasJwksCache: boolean;
  isDiscovering: boolean;
  isCreatingJwks: boolean;
} => ({
  hasIssuerCache: keycloakIssuerCache !== null,
  hasJwksCache: jwksCache !== null,
  isDiscovering: issuerDiscoveringPromise !== null,
  isCreatingJwks: jwksCreatingPromise !== null,
});
