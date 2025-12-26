import * as openidClient from "openid-client";
import { allowInsecureRequests } from "openid-client";
import { createRemoteJWKSet } from "jose";
import { logDebug } from "../logger/index.js";

// === 型定義 ===
type JWKSFunction = ReturnType<typeof createRemoteJWKSet>;

// === キャッシュ変数 ===

/**
 * Keycloak ServerMetadata のキャッシュ
 *
 * パフォーマンス最適化のため、Discovery の結果をキャッシュ
 * v6 では Issuer ではなく ServerMetadata をキャッシュ
 */
let serverMetadataCache: openidClient.ServerMetadata | null = null;

/**
 * Metadata Discovery 中の Promise
 *
 * 競合状態を防止するため、Discovery 中は既存の Promise を返す
 */
let metadataDiscoveringPromise: Promise<openidClient.ServerMetadata> | null =
  null;

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
 * localhost/127.0.0.1 の場合に HTTP を許可するかどうかを判定
 *
 * openid-client v6 はデフォルトで HTTPS を強制するため、
 * ローカル開発環境では allowInsecureRequests オプションが必要
 *
 * @param issuerUrl - Keycloak Issuer URL
 * @returns localhost または 127.0.0.1 の場合は true
 */
export const isLocalhostUrl = (issuerUrl: string): boolean => {
  try {
    const url = new URL(issuerUrl);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
};

/**
 * Keycloak ServerMetadata Discovery を実行する内部関数
 *
 * v6 では discovery() 関数を使用して ServerMetadata を取得
 */
const discoverMetadata = async (): Promise<openidClient.ServerMetadata> => {
  const keycloakIssuerUrl = process.env.KEYCLOAK_ISSUER;
  if (!keycloakIssuerUrl) {
    throw new Error("KEYCLOAK_ISSUER environment variable is not set");
  }

  // localhost の場合は HTTP を許可（ローカル開発用）
  const executeOptions = isLocalhostUrl(keycloakIssuerUrl)
    ? [allowInsecureRequests]
    : undefined;

  // v6: discovery() を使用（clientId はメタデータ取得のみなのでダミー値）
  // Configuration を取得し、serverMetadata() で ServerMetadata を抽出
  const config = await openidClient.discovery(
    new URL(keycloakIssuerUrl),
    "__metadata_only__", // ダミー clientId（メタデータ取得専用）
    undefined, // clientMetadata
    undefined, // clientAuth
    executeOptions ? { execute: executeOptions } : undefined,
  );

  const metadata = config.serverMetadata();

  logDebug("Keycloak ServerMetadata discovered", {
    issuer: metadata.issuer,
    jwksUri: metadata.jwks_uri,
    tokenEndpoint: metadata.token_endpoint,
  });

  serverMetadataCache = metadata;
  return metadata;
};

/**
 * JWKS を作成する内部関数
 */
const createJWKS = async (): Promise<JWKSFunction> => {
  const metadata = await getKeycloakServerMetadata();

  if (!metadata.jwks_uri) {
    throw new Error("JWKS URI not found in Keycloak metadata");
  }

  const jwks = createRemoteJWKSet(new URL(metadata.jwks_uri));

  logDebug("JWKS created", {
    jwksUri: metadata.jwks_uri,
  });

  jwksCache = jwks;
  return jwks;
};

// === 公開関数 ===

/**
 * Keycloak ServerMetadata を取得（スレッドセーフ、キャッシュ付き）
 *
 * openid-client v6 の discovery() を使用して
 * Keycloak の OAuth/OIDC メタデータを自動取得
 *
 * 並行リクエスト時の競合状態を防止:
 * - 既にキャッシュがある場合: 即座に返却
 * - Discovery 実行中の場合: 既存の Promise を返却
 * - 初回リクエストの場合: 新規 Discovery を開始
 */
export const getKeycloakServerMetadata =
  async (): Promise<openidClient.ServerMetadata> => {
    // 既にキャッシュがある場合はそのまま返す
    if (serverMetadataCache) {
      return serverMetadataCache;
    }

    // Discovery 中の場合は既存の Promise を返す（競合状態を回避）
    if (metadataDiscoveringPromise) {
      return metadataDiscoveringPromise;
    }

    // 新しい Discovery を開始
    metadataDiscoveringPromise = discoverMetadata();

    try {
      return await metadataDiscoveringPromise;
    } finally {
      metadataDiscoveringPromise = null;
    }
  };

/**
 * Keycloak Configuration を作成（リクエストごと）
 *
 * v6 では Client インスタンスではなく Configuration を使用
 * ServerMetadata はキャッシュを使用し、clientId/clientSecret はリクエストごとに設定
 *
 * @param clientId - クライアントID
 * @param clientSecret - クライアントシークレット（オプション、Public Client の場合は undefined）
 * @returns openid-client v6 の Configuration インスタンス
 */
export const createKeycloakConfiguration = async (
  clientId: string,
  clientSecret?: string,
): Promise<openidClient.Configuration> => {
  const serverMetadata = await getKeycloakServerMetadata();

  // クライアント認証方式の設定
  // Public Client（client_secret なし）の場合は None、それ以外は ClientSecretPost
  const clientAuth = clientSecret
    ? openidClient.ClientSecretPost(clientSecret)
    : openidClient.None();

  // v6: Configuration コンストラクタで Configuration を作成
  const config = new openidClient.Configuration(
    serverMetadata,
    clientId,
    clientSecret,
    clientAuth,
  );

  // localhost の場合は HTTP を許可（ローカル開発用）
  const keycloakIssuerUrl = process.env.KEYCLOAK_ISSUER ?? "";
  if (isLocalhostUrl(keycloakIssuerUrl)) {
    allowInsecureRequests(config);
  }

  return config;
};

/**
 * Keycloak Issuer 互換オブジェクトを取得（後方互換性用）
 *
 * wellKnown.ts、keycloakOAuth.ts などの既存コードとの互換性を維持するためのラッパー
 *
 * @deprecated 新規コードでは getKeycloakServerMetadata() を直接使用してください
 */
export const getKeycloakIssuer = async (): Promise<{
  issuer: string;
  metadata: openidClient.ServerMetadata;
}> => {
  const metadata = await getKeycloakServerMetadata();
  return {
    issuer: metadata.issuer,
    metadata,
  };
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
  serverMetadataCache = null;
  metadataDiscoveringPromise = null;
  jwksCache = null;
  jwksCreatingPromise = null;
};

/**
 * キャッシュの状態を取得（テスト用）
 */
export const getKeycloakCacheStatus = (): {
  hasMetadataCache: boolean;
  hasJwksCache: boolean;
  isDiscovering: boolean;
  isCreatingJwks: boolean;
} => ({
  hasMetadataCache: serverMetadataCache !== null,
  hasJwksCache: jwksCache !== null,
  isDiscovering: metadataDiscoveringPromise !== null,
  isCreatingJwks: jwksCreatingPromise !== null,
});
