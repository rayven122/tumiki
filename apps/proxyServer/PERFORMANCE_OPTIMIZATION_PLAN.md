# ProxyServer パフォーマンスチューニング詳細実装計画

## 🎯 分析結果サマリー

- **既存キャッシュ**: AuthCacheクラスで統一管理（LRUCache使用）
- **主要ボトルネック**: DBアクセス（キャッシュなし）、ログ処理（32箇所）、JSON.stringify（12箇所）
- **利用可能ツール**: lru-cache（^11.0.5）を使用した統一キャッシュシステム

## 📋 実装計画（優先度順）

### 1. DBアクセス最適化（最高優先度） 🔴

#### 1.1 integratedAuth.ts

```typescript
// AuthCacheを使用した統一キャッシュ実装
import { AuthCache } from "../utils/cache/authCache";
import { validateApiKey, setAuthCache } from "../libs/validateApiKey";

// AuthCacheインスタンスを作成
const authCache = new AuthCache();
setAuthCache(authCache);

// validateApiKey関数が内部でAuthCacheを使用
// - 自動的にキャッシュから取得を試みる
// - キャッシュミスの場合はDBから取得してキャッシュに保存
// - TTL: 5分間（設定可能）
// - 最大エントリー数: 100（設定可能）

// selectの最適化: includeを削除し、必要最小限のフィールドのみ取得
select: {
  id: true,
  userId: true,
  organizationId: true,
  authType: true,
}
```

#### 1.2 proxy.ts

```typescript
// AuthCacheを使用した統一キャッシュ実装
import { createAuthCache } from "../utils/cache/authCache";
import { validateApiKey, setAuthCache } from "../libs/validateApiKey";

// AuthCacheインスタンスを作成して設定
const authCache = createAuthCache();
setAuthCache(authCache);

// APIキー検証時に自動的にキャッシュが使用される
const validation = await validateApiKey(apiKey);
  cacheKey: ([id]) => id,
});

// クエリ最適化: 2つのfindUniqueを1つのクエリに統合
const serverInstance = await db.userMcpServerInstance.findUnique({
  where: { id: userMcpServerInstanceId, deletedAt: null },
  select: {
    id: true,
    toolGroup: {
      select: {
        toolGroupTools: {
          select: {
            userMcpServerConfigId: true,
            tool: { select: { name: true } },
          },
        },
      },
    },
  },
});

// N+1問題の解決: includeで関連データを一括取得
const serverConfigs = await db.userMcpServerConfig.findMany({
  where: { id: { in: serverConfigIds } },
  select: {
    id: true,
    name: true,
    envVars: true,
    mcpServer: {
      select: {
        command: true,
        args: true,
        transportType: true,
        url: true,
      },
    },
  },
});
```

### 2. ログ処理の非同期化（高優先度） 🟠

#### 2.1 requestLogger.ts

```typescript
// 完全非同期化
export const logMcpRequest = async (
  params: LogRequestParams,
): Promise<void> => {
  // レスポンス後に非同期で実行
  setImmediate(async () => {
    try {
      // mcpServerInstanceIdが未定義の場合はスキップ
      if (!params.mcpServerInstanceId) return;

      // データ圧縮を事前に実行
      const compressionResult = await compressRequestResponseData(
        params.requestData,
        params.responseData,
      );

      // ネストされたcreateを使用（トランザクション不要）
      await db.mcpServerRequestLog.create({
        data: {
          userId: params.userId || null,
          mcpServerInstanceId: params.mcpServerInstanceId,
          // ... その他のフィールド
          requestData: compressionResult
            ? {
                create: {
                  inputDataCompressed: compressionResult.inputDataCompressed,
                  outputDataCompressed: compressionResult.outputDataCompressed,
                  // ... 圧縮データ
                },
              }
            : undefined,
        },
      });
    } catch (error) {
      // エラー時もfire-and-forget
      logger.error("Failed to log MCP request", { error });
    }
  });
};
```

#### 2.2 ログレベルの最適化

```typescript
// 本番環境で不要なログを削減
const isDevelopment = process.env.NODE_ENV === "development";

// logger.infoをlogger.debugに変更
if (isDevelopment) {
  logger.debug("詳細ログ", data);
}

// 必要最小限のログのみ記録
logger.error("エラー発生", { error }); // エラーは常に記録
```

### 3. レスポンス最適化（中優先度） 🟡

#### 3.1 JSON処理の最適化

```typescript
// JSON.stringifyの結果をキャッシュして再利用
const requestStr = JSON.stringify(req.body || {});
const responseStr = responseData ? JSON.stringify(responseData) : "";

// 大きなペイロードのサイズチェックを事前に実施
const maxLogSize = 5 * 1024 * 1024; // 5MB
if (requestStr.length > maxLogSize) {
  requestData = `[Data too large: ${requestStr.length} bytes]`;
} else {
  requestData = requestStr;
}
```

#### 3.2 エラーハンドリングの統一

```typescript
// 統一エラーレスポンス関数（integratedAuth.tsで実装済み）
const sendAuthError = (
  res: Response,
  statusCode: number,
  message: string,
  code = -32000,
  headers?: Record<string, string>,
): void => {
  if (res.headersSent) return;

  if (headers) {
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
  }

  res.status(statusCode).json({
    jsonrpc: "2.0",
    error: { code, message },
    id: null,
  });
};
```

### 4. セッション管理最適化（低優先度） 🟢

#### 4.1 session.ts

```typescript
// クリーンアップ最適化
export const cleanupExpiredSessions = async (): Promise<void> => {
  const now = Date.now();
  const expiredSessions: string[] = [];

  for (const [sessionId, session] of sessions) {
    if (now - session.lastActivity > SESSION_CONFIG.SESSION_TIMEOUT) {
      expiredSessions.push(sessionId);
    }
  }

  // バッチ処理で非同期削除
  await Promise.all(
    expiredSessions.map((sessionId) => deleteSession(sessionId)),
  );
};

// WeakMapの活用検討（メモリリーク防止）
// ※ sessionIdは文字列なのでWeakMapは使用不可
// 代替案: 定期的なメモリ使用量チェックとクリーンアップ
```

## 📊 期待される改善効果

| 改善項目       | 現状                   | 改善後                   | 削減率                 |
| -------------- | ---------------------- | ------------------------ | ---------------------- |
| DBアクセス回数 | リクエスト毎に4-6回    | 初回のみ、以降キャッシュ | 80-90%                 |
| レスポンス時間 | 平均100-200ms          | 平均30-50ms              | 70%                    |
| メモリ使用量   | 不要なログ・データ保持 | 最適化済み               | 30%                    |
| ログ処理時間   | 同期的に実行           | 非同期実行               | レスポンスへの影響なし |

## 🚀 実装順序

### Phase 1: DBキャッシュ実装（1-2日）

1. integratedAuth.tsのキャッシュ実装
2. proxy.tsのキャッシュ実装
3. テスト実行と動作確認

### Phase 2: ログ処理の非同期化（1日）

1. requestLogger.tsの非同期化
2. ログレベルの最適化
3. 構造化ログの軽量化

### Phase 3: レスポンス最適化（1日）

1. JSON処理の最適化
2. エラーハンドリングの統一
3. ヘッダー送信チェックの効率化

### Phase 4: セッション管理改善（半日）

1. クリーンアップ処理の最適化
2. メモリ使用量の監視強化

## ⚠️ 注意事項

### キャッシュ管理

- **無効化タイミング**: データ更新時にキャッシュをクリアする仕組みが必要
- **メモリ監視**: キャッシュサイズの上限設定と監視
- **TTL設定**: 5分間のTTLが適切か運用後に再評価

### テスト

- 既存のテストケースへの影響を確認
- パフォーマンステストの実施
- 負荷テストでの検証

### モニタリング

- レスポンスタイムの計測
- DBクエリ数の追跡
- メモリ使用量の監視
- エラー率の確認

## 📈 成功指標

- [ ] 平均レスポンスタイム: 50ms以下
- [ ] P95レスポンスタイム: 100ms以下
- [ ] DBクエリ削減率: 80%以上
- [ ] メモリ使用量: 100MB以下で安定
- [ ] エラー率: 0.1%以下

## 🔄 継続的改善

1. **メトリクス収集**: 実装後の詳細なパフォーマンスメトリクスを収集
2. **ボトルネック分析**: 新たなボトルネックの特定と改善
3. **キャッシュ戦略の見直し**: 使用パターンに基づいた最適化
4. **コード最適化**: プロファイリングツールを使用した詳細な最適化

---

_最終更新: 2025-08-05_
