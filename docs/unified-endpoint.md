# 統合MCPエンドポイント仕様書

## 概要

mcp-proxyに「統合MCPエンドポイント」機能を追加する。ユーザーが事前に登録した複数のMCPサーバーを単一エンドポイントで利用可能にする。

### 背景

現在のmcp-proxyは `/mcp/:mcpServerId` エンドポイントで個別のMCPサーバーにアクセスする設計となっている。この設計では、AIクライアントが複数のMCPサーバーを利用する場合、それぞれのエンドポイントを個別に設定する必要がある。

統合エンドポイントにより、ユーザーが選択した複数のMCPサーバーのツールを単一エンドポイントで公開し、AIクライアントからの利便性を向上させる。

## 要件

### 基本仕様

| 項目 | 仕様 |
|------|------|
| URL | `POST /mcp/unified/:unifiedId` |
| 認証 | JWT認証のみ |
| アクセス制御 | 作成者のみ利用可能（JWTのuserIdとUnifiedMcpServer.createdByが一致確認） |
| 既存エンドポイント | `/mcp/:mcpServerId` は変更なし・維持 |

### データモデル

新規 `UnifiedMcpServer` テーブルを作成：

```prisma
model UnifiedMcpServer {
  id             String   @id @default(cuid())
  name           String   // 必須、表示名
  description    String?  // オプショナル

  organizationId String
  organization   Organization @relation(...)

  createdBy      String   // 作成者のuserId

  mcpServers     McpServer[] // 多対多リレーション

  deletedAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@index([createdBy])
  @@index([deletedAt])
}
```

### 制約条件

| 項目 | 仕様 |
|------|------|
| 子サーバー範囲 | 同一組織内のMCPサーバーのみ |
| 子サーバー数上限 | なし |
| 作成権限 | 組織の全メンバー |
| 共有 | 作成者専用（他ユーザーへの共有なし） |
| 名前 | 必須（name）、IDはcuid |
| 説明 | オプショナル（description） |

### ツール名フォーマット

統合エンドポイントでは、複数のMCPサーバーからのツールを一意に識別するため、3階層のnamespace形式を採用する。

```
{mcpServerId}__{instanceName}__{toolName}
```

- `mcpServerId`: McpServer.idの最初の8文字（衝突防止のため）
- `instanceName`: McpServerTemplateInstance.normalizedName
- `toolName`: MCPツールの元の名前

例: `abc12345__personal__list_repos`

**ツール名重複**: 子MCPサーバー間で同名ツールがあっても全て公開（3階層フォーマットで一意性保証）

### パフォーマンス

| 項目 | 仕様 |
|------|------|
| キャッシュ | Redis TTL 5分（キー: `unified:tools:{unifiedId}`） |
| キャッシュ無効化 | TTLのみ（即時無効化なし） |
| タイムアウト | 30秒 |

### エラーハンドリング

**Fail-fast戦略**: tools/list時に1つのMCPサーバーでもエラーが発生した場合、全体をエラーとして返却する。

子MCPサーバーのステータス:
- `serverStatus=RUNNING`, `deletedAt=null` のサーバーのみ対象
- 1つでも `STOPPED` や `ERROR` 状態があれば全体エラー

### PII/TOON設定

**ツール単位適用**: tools/call実行時、対象ツールが属するMCPサーバーのPII/TOON設定を適用する。

### ログ記録

**両方に記録**:
- 統合MCPサーバー（unifiedMcpServerId）のログエントリを記録
- 実際にツールが実行されたMCPサーバー（mcpServerId）のログエントリも記録
- ログには両方のIDを含める

### MCP serverInfo

initialize時に返すserverInfo:
- `name`: UnifiedMcpServer.name
- `version`: 固定値（例: "1.0.0"）

## 処理フロー

### tools/list フロー

```
1. JWT認証・アクセス制御チェック
   a. JWTのuserIdとUnifiedMcpServer.createdByが一致確認
2. Redisキャッシュをチェック（キー: unified:tools:{unifiedId}）
3. キャッシュヒット時: キャッシュから返却
4. キャッシュミス時:
   a. DBからUnifiedMcpServerの子MCPサーバー一覧を取得
   b. 全子MCPサーバーがserverStatus=RUNNING, deletedAt=nullであることを確認
   c. 1つでも異常があればエラー返却（Fail-fast）
   d. 各McpServerのtemplateInstances→allowedToolsを展開
   e. 3階層フォーマットでツール名を生成
   f. Redisに保存（TTL: 5分）
5. ツール一覧を返却
```

### tools/call フロー

```
1. JWT認証・アクセス制御チェック
2. 3階層ツール名をパース
3. mcpServerIdプレフィックスでMcpServerを検索
4. instanceNameでtemplateInstanceを検索
5. 対象McpServerのPII/TOON設定を実行コンテキストに設定
6. リクエストユーザーの認証情報（McpConfig, OAuthToken）を使用
7. 既存のconnectToMcpServer()でリモートMCPに接続
8. ツールを実行
9. ログ記録（統合MCP + 子MCPサーバー両方）
10. 結果を返却
```

### 認証フロー

```
1. Authorization: Bearer {JWT} ヘッダーを検証
2. URLパスから unifiedId を取得
3. UnifiedMcpServerを取得
4. JWTのuserIdとUnifiedMcpServer.createdByが一致確認
5. 認証コンテキスト設定（unifiedMcpServerId, mcpServerId=null, isUnifiedEndpoint=true）
```

## CRUD API

mcp-proxyにREST APIとして実装:

### エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/unified` | 統合MCPサーバー作成 |
| GET | `/unified` | 自分の統合MCPサーバー一覧取得 |
| GET | `/unified/:id` | 統合MCPサーバー詳細取得 |
| PUT | `/unified/:id` | 統合MCPサーバー更新 |
| DELETE | `/unified/:id` | 統合MCPサーバー削除（論理削除） |

### 作成API

```typescript
// POST /unified
// Authorization: Bearer {JWT}
{
  name: string,           // 必須
  description?: string,   // オプショナル
  mcpServerIds: string[]  // 必須、子MCPサーバーID配列
}
```

### 削除時の挙動

- 論理削除（deletedAt設定）
- 子MCPサーバーへの影響なし（参照関係のみ削除）

## ファイル構成

### 新規作成

```
packages/db/prisma/schema/
└── unifiedMcpServer.prisma          # UnifiedMcpServerモデル

apps/mcp-proxy/src/
├── routes/
│   ├── mcpUnified.ts                # 統合MCPルート（プロキシ）
│   └── unifiedCrud.ts               # CRUD APIルート
├── handlers/
│   └── mcpUnifiedHandler.ts         # 統合プロキシハンドラー
├── services/
│   └── unifiedMcp/
│       ├── index.ts                 # エクスポート
│       ├── toolsAggregator.ts       # ツール集約
│       ├── toolExecutor.ts          # 3階層ツール実行
│       └── types.ts                 # 型定義
├── middleware/
│   └── auth/
│       └── unifiedJwt.ts            # 統合用JWT認証
└── libs/
    └── cache/
        └── unifiedToolsCache.ts     # Redisキャッシュ
```

### 変更

```
apps/mcp-proxy/src/
├── index.ts                         # ルートマウント追加
└── types/index.ts                   # AuthContext型拡張
```

## 将来拡張（第2段階）

### Dynamic Toolsets

Speakeasy方式のDynamic Toolsets機能を追加予定（第2段階の詳細は未定）。

- `search_tools`: ツール検索（内部検索はclaude-3-5-haikuを使用）
- `describe_tools`: ツールスキーマ取得
- `execute_tool`: ツール実行

参考: https://www.speakeasy.com/blog/how-we-reduced-token-usage-by-100x-dynamic-toolsets-v2

### 管理UI

manager アプリに統合MCPサーバー作成/編集画面を追加予定。

## 設計決定の根拠

### なぜJWT認証のみか

- 統合エンドポイントは複数のMCPサーバーにアクセスするため、より厳格な認証が必要
- API Keyは個別のMCPサーバー単位で発行されており、統合レベルのアクセスには不適切
- JWT認証によりユーザーの組織メンバーシップと作成者確認が可能

### なぜ事前登録型か

- AIクライアントのエンドポイント設定がシンプル（単一のunifiedIdのみ）
- リクエストごとのサーバー指定は複雑でエラーを招きやすい
- ユーザーが意図的に選択したサーバーのみを統合できる

### なぜ作成者専用か

- シンプルな実装で初期リリースを優先
- 共有機能は将来の拡張として検討可能
- 権限管理の複雑さを回避

### なぜFail-fastか

- 部分的な成功を返すと、AIクライアントが不完全なツール一覧で動作し、予期しない挙動を引き起こす可能性
- エラーの原因を明確にすることで、問題の特定と解決が容易

### なぜRedisキャッシュTTL 5分か

- 現在のMcpServer情報キャッシュと同じ設定で一貫性を維持
- ツール一覧の変更頻度は低いため、5分は妥当
- 即時無効化は実装複雑度が上がるため初期リリースではTTLのみ
