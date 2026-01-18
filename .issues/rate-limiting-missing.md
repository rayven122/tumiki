---
apps:
  - mcp-proxy
severity: high
difficulty: medium
---

# レート制限の欠如

## 概要

mcp-proxyにはレート制限（Rate Limiting）が実装されておらず、ブルートフォース攻撃やDoS攻撃に対する保護がない。

## 重大度

高

## 影響範囲

- `apps/mcp-proxy/src/index.ts`
- 全APIエンドポイント

## 詳細

### 現状

`index.ts` のアプリケーション設定にはレート制限ミドルウェアが含まれていない:

```typescript
// Hono アプリケーションの作成
const app = new Hono<HonoEnv>();

// CORS設定
app.use("/*", cors());

// ルートをマウント
app.route("/", healthRoute);
app.route("/", mcpRoute);
app.route("/unified", unifiedCrudRoute);
app.route("/.well-known", wellKnownRoute);
app.route("/oauth", oauthRoute);
// レート制限なし
```

### 問題点

1. **ブルートフォース攻撃への脆弱性**
   - API Key の総当たり攻撃
   - JWT トークンの推測攻撃（#002 タイミング攻撃と組み合わせ可能）
   - ユーザーID/パスワードの推測（OAuth経由）

2. **DoS攻撃への脆弱性**
   - 単一IPからの大量リクエスト
   - リソース枯渇攻撃
   - MCPサーバーへの過負荷転送

3. **コスト増加リスク**
   - 大量リクエストによるCloud Runインスタンス増加
   - データベース接続の枯渇
   - 外部API（Keycloak、MCPサーバー）への過負荷

4. **監査・コンプライアンス**
   - セキュリティ監査でレート制限の欠如が指摘される可能性
   - SOC2/ISOなどの準拠要件に影響

### 影響

- **セキュリティ**: 攻撃に対する防御の欠如
- **可用性**: DoS攻撃によるサービス停止リスク
- **コスト**: 不正利用によるクラウドコスト増加

## 推奨される対策

1. **Honoのレート制限ミドルウェア**

```typescript
import { rateLimiter } from "hono-rate-limiter";
import { RedisStore } from "rate-limit-redis";

// Redis を使用したレート制限（Cloud Run の複数インスタンスで共有）
const limiter = rateLimiter({
  windowMs: 60000, // 1分
  max: 100, // 1分あたり100リクエスト
  standardHeaders: true,
  keyGenerator: (c) => {
    // IPアドレスまたは認証済みユーザーIDをキーに使用
    return (
      c.get("authContext")?.userId ??
      c.req.header("x-forwarded-for") ??
      "anonymous"
    );
  },
  store: new RedisStore({
    sendCommand: async (...args) => {
      const redis = await getRedisClient();
      return redis?.call(...args);
    },
  }),
});

app.use("/*", limiter);
```

2. **エンドポイント別のレート制限**

```typescript
// 認証エンドポイント用（より厳しい制限）
const authLimiter = rateLimiter({
  windowMs: 60000,
  max: 10, // 1分あたり10リクエスト
  message: "Too many authentication attempts",
});

// MCP エンドポイント用（通常の制限）
const mcpLimiter = rateLimiter({
  windowMs: 60000,
  max: 100,
  message: "Rate limit exceeded",
});

// ヘルスチェック用（緩い制限）
const healthLimiter = rateLimiter({
  windowMs: 60000,
  max: 300,
});

app.use("/oauth/*", authLimiter);
app.use("/mcp/*", mcpLimiter);
app.use("/health", healthLimiter);
```

3. **Cloud Run のネイティブレート制限**

```yaml
# cloud run の設定で最大同時リクエスト数を制限
apiVersion: serving.knative.dev/v1
kind: Service
spec:
  template:
    spec:
      containerConcurrency: 80
```

4. **IP ベースのブロッキング**

```typescript
// 異常なリクエストパターンを検出してブロック
const suspiciousIPs = new Map<string, { count: number; lastSeen: number }>();

const antiAbuse = async (c: Context, next: Next) => {
  const ip = c.req.header("x-forwarded-for") ?? "unknown";
  const now = Date.now();

  const record = suspiciousIPs.get(ip) ?? { count: 0, lastSeen: now };

  // 1秒間に10回以上のリクエスト
  if (now - record.lastSeen < 1000 && record.count > 10) {
    logWarning("Potential abuse detected", { ip, count: record.count });
    return c.json({ error: "Too many requests" }, 429);
  }

  record.count = now - record.lastSeen < 1000 ? record.count + 1 : 1;
  record.lastSeen = now;
  suspiciousIPs.set(ip, record);

  return next();
};

app.use("/*", antiAbuse);
```

5. **認証失敗時の指数バックオフ**

```typescript
const authFailures = new Map<string, { count: number; lockedUntil: number }>();

const authRateLimiter = async (c: Context, next: Next) => {
  const identifier = getAuthIdentifier(c); // IP or user ID
  const failure = authFailures.get(identifier);

  // ロックアウト中
  if (failure && failure.lockedUntil > Date.now()) {
    const waitTime = Math.ceil((failure.lockedUntil - Date.now()) / 1000);
    return c.json(
      {
        error: "Account temporarily locked",
        retryAfter: waitTime,
      },
      429,
    );
  }

  await next();

  // 認証失敗をカウント
  if (c.res.status === 401) {
    const current = authFailures.get(identifier) ?? {
      count: 0,
      lockedUntil: 0,
    };
    current.count++;

    // 5回失敗でロックアウト（指数バックオフ）
    if (current.count >= 5) {
      const lockDuration = Math.min(
        30000 * Math.pow(2, current.count - 5), // 30秒から指数増加
        3600000, // 最大1時間
      );
      current.lockedUntil = Date.now() + lockDuration;
    }

    authFailures.set(identifier, current);
  } else if (c.res.status === 200) {
    // 成功時にカウンターをリセット
    authFailures.delete(identifier);
  }
};
```

6. **モニタリングとアラート**

```typescript
// レート制限のメトリクスを収集
const rateLimitMetrics = {
  totalRequests: 0,
  limitedRequests: 0,
  blockedIPs: new Set<string>(),
};

// 定期的にログ出力とアラート
setInterval(() => {
  if (rateLimitMetrics.limitedRequests > 100) {
    logWarning("High rate limit hits detected", rateLimitMetrics);
    // アラート送信
  }
}, 60000);
```

## 関連ファイル

- `apps/mcp-proxy/src/index.ts`
- `apps/mcp-proxy/src/middleware/auth/index.ts`
- `apps/mcp-proxy/src/middleware/auth/apiKey.ts`
- `apps/mcp-proxy/src/libs/cache/redis.ts`
