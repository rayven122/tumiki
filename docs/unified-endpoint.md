# 統合MCPエンドポイント仕様書

## 概要

mcp-proxyに「統合MCPエンドポイント」機能を追加する。ユーザーが事前に登録した複数のMCPサーバーを単一エンドポイントで利用可能にする。

### 背景

現在のmcp-proxyは `/mcp/:mcpServerId` エンドポイントで個別のMCPサーバーにアクセスする設計となっている。この設計では、AIクライアントが複数のMCPサーバーを利用する場合、それぞれのエンドポイントを個別に設定する必要がある。

統合エンドポイントにより、ユーザーが選択した複数のMCPサーバーのツールを単一エンドポイントで公開し、AIクライアントからの利便性を向上させる。

### 実装スコープ

**今回の実装範囲:**
- mcp-proxyに統合MCPエンドポイント機能を追加
- CRUD API（POST/GET/PUT/DELETE /unified）を追加
- `/mcp/unified/:unifiedId` エンドポイントを追加
- Prismaスキーマに UnifiedMcpServer を追加
- McpServerRequestLog に unifiedMcpServerId カラムを追加

**第2段階:**
- 管理UI（managerアプリ）
- Dynamic Toolsets（search_tools, describe_tools, execute_tool）
- dynamicToolsetsEnabledフラグ管理

## 要件

### 基本仕様

| 項目 | 仕様 |
|------|------|
| URL | `POST /mcp/unified/:unifiedId` |
| 認証 | JWT認証のみ |
| アクセス制御 | 作成者のみ利用可能（JWTのuserIdとUnifiedMcpServer.createdByが一致確認） |
| 既存エンドポイント | `/mcp/:mcpServerId` は変更なし・維持 |

### データモデル

新規 `UnifiedMcpServer` テーブルを作成（明示的多対多リレーション）：

```prisma
model UnifiedMcpServer {
  id             String   @id @default(cuid())
  name           String   // 必須、表示名（重複許可）
  description    String?  // オプショナル

  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])

  createdBy      String   // 作成者のuserId
  creator        User     @relation(fields: [createdBy], references: [id])

  // 明示的多対多リレーション
  childServers   UnifiedMcpServerChild[]

  deletedAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([organizationId])
  @@index([createdBy])
  @@index([deletedAt])
}

model UnifiedMcpServerChild {
  id                  String   @id @default(cuid())

  unifiedMcpServerId  String
  unifiedMcpServer    UnifiedMcpServer @relation(fields: [unifiedMcpServerId], references: [id], onDelete: Cascade)

  mcpServerId         String
  mcpServer           McpServer @relation(fields: [mcpServerId], references: [id], onDelete: Cascade)

  displayOrder        Int @default(0)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([unifiedMcpServerId, mcpServerId])
  @@index([mcpServerId])
}
```

### ログテーブル拡張

既存の `McpServerRequestLog` テーブルに以下のカラムを追加：

```prisma
model McpServerRequestLog {
  // ... 既存フィールド ...

  unifiedMcpServerId String?  // 統合エンドポイント経由の場合のみ設定

  @@index([unifiedMcpServerId, createdAt])
}
```

### 制約条件

| 項目 | 仕様 |
|------|------|
| 子サーバー範囲 | 同一組織内のMCPサーバーのみ |
| 子サーバー数 | 最低1件必須、上限なし |
| 作成権限 | 組織の全メンバー |
| 共有 | 作成者専用（他ユーザーへの共有なし） |
| 名前 | 必須、重複許可（IDで一意識別） |
| 説明 | オプショナル |
| OAuthトークン | 作成時に全子サーバーのOAuthトークン保持を確認必須 |

### ツール名フォーマット

統合エンドポイントでは、複数のMCPサーバーからのツールを一意に識別するため、3階層のnamespace形式を採用する。

```
{mcpServerId}__{instanceName}__{toolName}
```

- `mcpServerId`: McpServer.id（完全なID）
- `instanceName`: McpServerTemplateInstance.normalizedName
- `toolName`: MCPツールの元の名前

例: `cm1abc2def3ghi__personal__list_repos`

**ツール名重複**: 子MCPサーバー間で同名ツールがあっても全て公開（3階層フォーマットで一意性保証）

### パフォーマンス

| 項目 | 仕様 |
|------|------|
| キャッシュ | Redis TTL 5分（キー: `unified:tools:{unifiedId}`） |
| キャッシュ無効化 | TTLのみ（即時無効化なし） |
| タイムアウト | リクエスト全体で30秒 |
| 並列度制限 | 子サーバーへのアクセスは同時に5件まで |

### エラーハンドリング

**tools/list: Fail-fast戦略**
- 1つのMCPサーバーでもエラーが発生した場合、全体をエラーとして返却
- `serverStatus=RUNNING`, `deletedAt=null` のサーバーのみ対象
- 1つでも `STOPPED` や `ERROR` 状態があれば全体エラー
- **論理削除された子サーバーは自動除外**（エラーにはしない）
- 全ての子サーバーが除外された場合は空のtools/listを返却

**tools/call: 接続時判断**
- 事前のserverStatusチェックは行わず、実際に接続を試みてから判断
- 接続失敗時にエラーを返却（既存実装と同じ動作）

**エラーメッセージ**
- 子MCPサーバー名、ツール名、エラー詳細を含める（デバッグ性優先）

### PII/TOON設定

**子サーバーの設定のみ使用**:
- 統合MCPサーバー自体にはPII/TOON設定を持たない
- tools/call実行時、対象ツールが属するMCPサーバーのPII/TOON設定を適用

### ログ記録

**両方に記録**:
- 統合MCPサーバー（unifiedMcpServerId）と実際のMCPサーバー（mcpServerId）の両方のIDをログに含める
- 既存の `McpServerRequestLog` テーブルを使用

### MCP serverInfo

initialize時に返すserverInfo:
- `name`: UnifiedMcpServer.name
- `version`: 固定値 `"1.0.0"`

## 処理フロー

### tools/list フロー

```
1. JWT認証・アクセス制御チェック
   a. JWTのuserIdとUnifiedMcpServer.createdByが一致確認
2. Redisキャッシュをチェック（キー: unified:tools:{unifiedId}）
3. キャッシュヒット時: キャッシュから返却
4. キャッシュミス時:
   a. DBからUnifiedMcpServerの子MCPサーバー一覧を取得
   b. deletedAt=nullの子サーバーのみをフィルタ（削除済みは自動除外）
   c. 全残存サーバーがserverStatus=RUNNINGであることを確認
   d. 1つでもSTOPPED/ERROR状態があればエラー返却（Fail-fast）
   e. 各McpServerのtemplateInstances→allowedToolsを展開（並列度5件制限）
   f. 3階層フォーマットでツール名を生成
   g. Redisに保存（TTL: 5分）
5. ツール一覧を返却（全除外時は空リスト）
```

### tools/call フロー

```
1. JWT認証・アクセス制御チェック
2. 3階層ツール名をパース（{mcpServerId}__{instanceName}__{toolName}）
3. mcpServerIdでMcpServerを検索
4. instanceNameでtemplateInstanceを検索
5. 対象McpServerのPII/TOON設定を実行コンテキストに設定
6. リクエストユーザーの認証情報（McpConfig, OAuthToken）を使用
7. 既存のconnectToMcpServer()でリモートMCPに接続（接続失敗時にエラー）
8. ツールを実行
9. ログ記録（unifiedMcpServerId + mcpServerId両方を記録）
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

mcp-proxyにREST APIとして実装（JWT認証のみ）:

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

// リクエスト
{
  name: string,           // 必須
  description?: string,   // オプショナル
  mcpServerIds: string[]  // 必須、最低1件
}

// バリデーション
// - mcpServerIds が空配列の場合はエラー
// - 指定されたmcpServerIdが同一組織内に存在しない場合はエラー
// - ユーザーがOAuthトークンを持っていないサーバーが含まれる場合はエラー

// レスポンス
{
  id: string,
  name: string,
  description: string | null,
  organizationId: string,
  createdBy: string,
  mcpServers: [
    { id: string, name: string, serverStatus: ServerStatus }
  ],
  createdAt: string,
  updatedAt: string
}
```

### 一覧API

```typescript
// GET /unified
// Authorization: Bearer {JWT}

// レスポンス
{
  items: [
    {
      id: string,
      name: string,
      description: string | null,
      mcpServers: [
        { id: string, name: string, serverStatus: ServerStatus }
      ],
      createdAt: string,
      updatedAt: string
    }
  ]
}

// 作成者（createdBy = 認証ユーザー）の統合サーバーのみ返却
```

### 更新API

```typescript
// PUT /unified/:id
// Authorization: Bearer {JWT}

// リクエスト
{
  name?: string,
  description?: string,
  mcpServerIds?: string[]  // 指定した場合は完全置換
}

// mcpServerIdsを指定した場合:
// - 最低1件必須
// - 既存の関連を全て削除し、新しい関連を作成
// - OAuthトークンチェックを再実行
```

### 削除時の挙動

- 論理削除（deletedAt設定）
- 子MCPサーバーへの影響なし（参照関係のみ削除）

## ファイル構成

### 新規作成

```
packages/db/prisma/schema/
└── unifiedMcpServer.prisma          # UnifiedMcpServer, UnifiedMcpServerChildモデル

apps/mcp-proxy/src/
├── routes/
│   ├── mcpUnified.ts                # 統合MCPルート（プロキシ）
│   └── unifiedCrud.ts               # CRUD APIルート
├── handlers/
│   └── mcpUnifiedHandler.ts         # 統合プロキシハンドラー
├── services/
│   └── unifiedMcp/
│       ├── index.ts                 # エクスポート
│       ├── toolsAggregator.ts       # ツール集約（並列度制限付き）
│       ├── toolNameParser.ts        # 3階層ツール名パース
│       ├── toolExecutor.ts          # ツール実行
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
packages/db/prisma/schema/
└── mcpServerRequestLog.prisma       # unifiedMcpServerIdカラム追加

apps/mcp-proxy/src/
├── index.ts                         # ルートマウント追加
└── types/index.ts                   # AuthContext型拡張
```

## 将来拡張（第2段階）

### Dynamic Toolsets

Speakeasy方式のDynamic Toolsets機能を追加予定。

**フラグ管理:**
- McpServerに `dynamicToolsetsEnabled` フラグを追加
- MCPサーバー詳細画面のPII/TOON設定と同じセクションで管理

**ツール構成:**
- `search_tools`: ツール検索（AIベース、claude-3-5-haiku使用予定）
- `describe_tools`: ツールスキーマ取得
- `execute_tool`: ツール実行

**統合エンドポイントでの挙動:**
- フラグがtrueのサーバーのツールは、上記3つのメタツールのみ公開
- 統合レベルで1セットの3ツールに集約（サーバー単位ではない）
- 複数のDynamic Toolsets対応サーバーがある場合、全サーバーをまとめて検索

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

### なぜFail-fast（tools/list）か

- 部分的な成功を返すと、AIクライアントが不完全なツール一覧で動作し、予期しない挙動を引き起こす可能性
- エラーの原因を明確にすることで、問題の特定と解決が容易

### なぜtools/callは接続時判断か

- 既存の個別エンドポイントと同じ動作を維持
- serverStatusはあくまで参考情報であり、実際の接続性とは異なる場合がある

### なぜ3階層ツール名で完全なIDを使用するか

- 8文字短縮では衝突の可能性がある
- 完全なIDを使用することで確実な一意性を保証
- ツール名は長くなるが、AIクライアントには透過的

### なぜ論理削除された子サーバーを自動除外するか

- ユーザー体験の向上（エラーではなく利用可能なサーバーで継続）
- 管理者が子サーバーを削除しても、統合サーバー利用者への影響を最小化

### なぜRedisキャッシュTTL 5分か

- 現在のMcpServer情報キャッシュと同じ設定で一貫性を維持
- ツール一覧の変更頻度は低いため、5分は妥当
- 即時無効化は実装複雑度が上がるため初期リリースではTTLのみ

### なぜOAuthトークンを事前チェックするか

- tools/call時に認証エラーが発生することを防ぐ
- 作成時に問題を検出し、ユーザーに適切な対応を促す
- 統合サーバーの品質を保証
