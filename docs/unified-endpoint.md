# 統合MCPエンドポイント仕様書

## 概要

mcp-proxyに「統合MCPエンドポイント」機能を追加する。外部AIクライアント（Claude Desktop等）から、ユーザーの組織内の全MCPサーバーを単一エンドポイントで利用可能にする。

### 背景

現在のmcp-proxyは `/mcp/:mcpServerId` エンドポイントで個別のMCPサーバーにアクセスする設計となっている。この設計では、AIクライアントが複数のMCPサーバーを利用する場合、それぞれのエンドポイントを個別に設定する必要がある。

統合エンドポイントにより、組織内の全MCPサーバーのツールを単一エンドポイントで公開し、AIクライアントからの利便性を向上させる。

## 要件

### 基本仕様

| 項目 | 仕様 |
|------|------|
| URL | `POST /mcp/org/:orgId` |
| 認証 | JWT認証のみ |
| アクセス制御 | 組織単位（JWTのorganizationIdとURLのorgIdが一致確認） |
| 既存エンドポイント | `/mcp/:mcpServerId` は変更なし・維持 |

### ツール名フォーマット

統合エンドポイントでは、複数のMCPサーバーからのツールを一意に識別するため、3階層のnamespace形式を採用する。

```
{mcpServerId}__{instanceName}__{toolName}
```

- `mcpServerId`: McpServer.idの最初の8文字（衝突防止のため）
- `instanceName`: McpServerTemplateInstance.normalizedName
- `toolName`: MCPツールの元の名前

例: `abc12345__personal__list_repos`

### パフォーマンス

| 項目 | 仕様 |
|------|------|
| キャッシュ | Redis TTL 5分（キー: `unified:tools:{orgId}`） |
| タイムアウト | 30秒 |

### エラーハンドリング

**Fail-fast戦略**: tools/list時に1つのMCPサーバーでもエラーが発生した場合、全体をエラーとして返却する。

### PII/TOON設定

**ツール単位適用**: tools/call実行時、対象ツールが属するMCPサーバーのPII/TOON設定を適用する。

### ログ記録

統合エンドポイント専用のログエントリを記録する。実際にツールが実行された場合は、そのMCPサーバーのIDも記録する。

## 処理フロー

### tools/list フロー

```
1. Redisキャッシュをチェック（キー: unified:tools:{orgId}）
2. キャッシュヒット時: キャッシュから返却
3. キャッシュミス時:
   a. DBから組織内の全McpServer（serverStatus=RUNNING, deletedAt=null）を取得
   b. 各McpServerのtemplateInstances→allowedToolsを展開
   c. 3階層フォーマットでツール名を生成
   d. Redisに保存（TTL: 5分）
4. ツール一覧を返却
```

### tools/call フロー

```
1. 3階層ツール名をパース
2. mcpServerIdプレフィックスでMcpServerを検索
3. instanceNameでtemplateInstanceを検索
4. 対象McpServerのPII/TOON設定を実行コンテキストに設定
5. 既存のconnectToMcpServer()でリモートMCPに接続
6. ツールを実行
7. 結果を返却
```

### 認証フロー

```
1. Authorization: Bearer {JWT} ヘッダーを検証
2. URLパスから orgId を取得
3. JWTのorganizationIdとorgIdが一致することを確認
4. ユーザーが組織のメンバーであることを確認
5. 認証コンテキスト設定（mcpServerId=null, isUnifiedEndpoint=true）
```

## ファイル構成

### 新規作成

```
apps/mcp-proxy/src/
├── routes/
│   └── mcpUnified.ts                    # 統合ルート
├── handlers/
│   └── mcpUnifiedHandler.ts             # 統合ハンドラー
├── services/
│   └── unifiedMcp/
│       ├── index.ts                     # エクスポート
│       ├── toolsAggregator.ts           # ツール集約
│       ├── toolExecutor.ts              # 3階層ツール実行
│       └── types.ts                     # 型定義
├── middleware/
│   └── auth/
│       └── unifiedJwt.ts                # 統合用JWT認証
└── libs/
    └── cache/
        └── unifiedToolsCache.ts         # Redisキャッシュ
```

### 変更

```
apps/mcp-proxy/src/
├── index.ts                             # ルートマウント追加
└── types/index.ts                       # AuthContext型拡張
```

## 将来拡張（第2段階）

### Dynamic Toolsets

Speakeasy方式のDynamic Toolsets機能を追加予定。

- `search_tools`: ツール検索（内部検索はclaude-3-5-haikuを使用）
- `describe_tools`: ツールスキーマ取得
- `execute_tool`: ツール実行

参考: https://www.speakeasy.com/blog/how-we-reduced-token-usage-by-100x-dynamic-toolsets-v2

## 設計決定の根拠

### なぜJWT認証のみか

- 統合エンドポイントは組織全体のリソースにアクセスするため、より厳格な認証が必要
- API Keyは個別のMCPサーバー単位で発行されており、組織レベルのアクセスには不適切
- JWT認証によりユーザーの組織メンバーシップを確認可能

### なぜFail-fastか

- 部分的な成功を返すと、AIクライアントが不完全なツール一覧で動作し、予期しない挙動を引き起こす可能性
- エラーの原因を明確にすることで、問題の特定と解決が容易
- シンプルな実装で初期リリースを優先

### なぜRedisキャッシュTTL 5分か

- 現在のMcpServer情報キャッシュと同じ設定で一貫性を維持
- ツール一覧の変更頻度は低いため、5分は妥当
- 必要に応じてキャッシュ無効化APIを将来追加可能
