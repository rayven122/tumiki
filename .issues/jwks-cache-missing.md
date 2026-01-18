---
apps:
  - mcp-proxy
severity: low
difficulty: medium
---

# JWKSキャッシュの欠如

## 概要

JWT検証時にKeycloakのJWKS（JSON Web Key Set）をキャッシュしているが、キャッシュの有効期限管理やリフレッシュ機構が不十分。

## 重大度

低

## 影響範囲

- `apps/mcp-proxy/src/libs/auth/keycloak.ts`
- `apps/mcp-proxy/src/libs/auth/jwt-verifier.ts`

## 詳細

### 現状

`keycloak.ts:9-39` で、JWKSのキャッシュ変数が定義されている:

```typescript
/**
 * Keycloak ServerMetadata のキャッシュ
 *
 * パフォーマンス最適化のため、Discovery の結果をキャッシュ
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
```

`jwt-verifier.ts` では `createRemoteJWKSet` を使用:

```typescript
export const verifyKeycloakJWT = async (
  accessToken: string,
): Promise<JWTPayload> => {
  const metadata = await getKeycloakServerMetadata();
  const jwks = await getJWKS();

  const { payload } = await jwtVerify(accessToken, jwks, {
    issuer: metadata.issuer,
    clockTolerance: 60,
  });

  return payload as JWTPayload;
};
```

### 問題点

1. **キャッシュの無期限保持**
   - 一度キャッシュされたJWKSは明示的にクリアされない限り永続
   - Keycloakの鍵ローテーション時に古い鍵を使い続ける可能性

2. **jose の createRemoteJWKSet の動作**
   - `jose` の `createRemoteJWKSet` は内部でキャッシュを持つ
   - しかし、キャッシュの有効期限は HTTP Cache-Control ヘッダーに依存
   - Keycloakの設定によっては長時間キャッシュされる可能性

3. **鍵ローテーション対応の不十分さ**
   - 検証失敗時にJWKSを再取得する機構がない
   - 新しい鍵で署名されたトークンが拒否される可能性

4. **Cloud Run環境での考慮**
   - コンテナが再起動されるとキャッシュがクリアされる
   - これは問題を軽減するが、予測不可能な動作の原因にもなる

### 影響

- **可用性**: 鍵ローテーション後に一時的に認証が失敗する可能性
- **セキュリティ**: 古い（compromised）鍵が使い続けられる可能性
- **パフォーマンス**: キャッシュミス時のレイテンシ増加

## 推奨される対策

1. **TTL付きキャッシュの実装**

```typescript
type CachedJWKS = {
  jwks: JWKSFunction;
  cachedAt: number;
};

let jwksCache: CachedJWKS | null = null;
const JWKS_CACHE_TTL_MS = 3600000; // 1時間

export const getJWKS = async (): Promise<JWKSFunction> => {
  const now = Date.now();

  // キャッシュが有効な場合はそのまま返す
  if (jwksCache && now - jwksCache.cachedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.jwks;
  }

  // 新しいJWKSを作成
  const metadata = await getKeycloakServerMetadata();
  if (!metadata.jwks_uri) {
    throw new Error("JWKS URI not found in Keycloak metadata");
  }

  const jwks = createRemoteJWKSet(new URL(metadata.jwks_uri));

  jwksCache = {
    jwks,
    cachedAt: now,
  };

  logDebug("JWKS refreshed", {
    jwksUri: metadata.jwks_uri,
    cachedAt: new Date(now).toISOString(),
  });

  return jwks;
};
```

2. **検証失敗時のJWKS再取得**

```typescript
export const verifyKeycloakJWT = async (
  accessToken: string,
  allowRetry = true,
): Promise<JWTPayload> => {
  const metadata = await getKeycloakServerMetadata();
  const jwks = await getJWKS();

  try {
    const { payload } = await jwtVerify(accessToken, jwks, {
      issuer: metadata.issuer,
      clockTolerance: 60,
    });
    return payload as JWTPayload;
  } catch (error) {
    // 署名検証失敗時にJWKSをリフレッシュしてリトライ
    if (allowRetry && error instanceof errors.JWSSignatureVerificationFailed) {
      logInfo("JWT verification failed, refreshing JWKS and retrying");
      clearJwksCache();
      return verifyKeycloakJWT(accessToken, false);
    }
    throw error;
  }
};

export const clearJwksCache = (): void => {
  jwksCache = null;
  jwksCreatingPromise = null;
};
```

3. **定期的なJWKSリフレッシュ**

```typescript
// バックグラウンドでJWKSを定期的にリフレッシュ
let refreshInterval: NodeJS.Timeout | null = null;

export const startJwksRefreshLoop = (): void => {
  if (refreshInterval) return;

  refreshInterval = setInterval(async () => {
    try {
      logDebug("Background JWKS refresh started");
      clearJwksCache();
      await getJWKS();
      logDebug("Background JWKS refresh completed");
    } catch (error) {
      logError("Background JWKS refresh failed", error);
    }
  }, JWKS_CACHE_TTL_MS / 2); // TTLの半分の間隔でリフレッシュ
};

export const stopJwksRefreshLoop = (): void => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};
```

4. **jose の cacheMaxAge オプション**

```typescript
// jose v5+ では cacheMaxAge オプションが利用可能
const jwks = createRemoteJWKSet(new URL(metadata.jwks_uri), {
  cacheMaxAge: 3600000, // 1時間
  cooldownDuration: 30000, // リフレッシュ間の最小間隔
});
```

5. **メトリクス収集**

```typescript
const jwksMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  refreshCount: 0,
  lastRefreshAt: 0,
};

// 定期的にメトリクスをログ出力
setInterval(() => {
  logInfo("JWKS cache metrics", jwksMetrics);
}, 300000); // 5分ごと
```

## 関連ファイル

- `apps/mcp-proxy/src/libs/auth/keycloak.ts`
- `apps/mcp-proxy/src/libs/auth/jwt-verifier.ts`
- `apps/mcp-proxy/src/middleware/auth/jwt.ts`
