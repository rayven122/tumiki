# データベースパフォーマンス最適化提案

## 概要

マルチテナンシー機能の実装により、`organizationId`を基準とした頻繁なフィルタリングが発生するため、該当フィールドにインデックスを追加してクエリパフォーマンスを向上させます。

## 現在のインデックス状況

### 既存のインデックス

- `OrganizationGroup.organizationId` - ✅ 既存
- `ResourceAccessControl.[organizationId, resourceType, resourceId]` - ✅ 既存
- `UserMcpServerInstance.deletedAt` - ✅ 既存
- `McpApiKey.userMcpServerInstanceId` - ✅ 既存
- `OrganizationInvitation.token` - ✅ 既存

## 追加推奨インデックス

### 高優先度：マルチテナンシー関連

#### 1. UserMcpServerConfig.organizationId

```sql
CREATE INDEX CONCURRENTLY idx_user_mcp_server_config_org_id
ON "UserMcpServerConfig"("organizationId");
```

**理由**:

- マルチテナンシー拡張により全ての読み取り・更新・削除操作で自動フィルタリング
- アプリケーションで最も頻繁にアクセスされるテーブルの一つ
- 現在インデックスなしでフルテーブルスキャンが発生

**影響範囲**:

- `findMany`, `findFirst`, `update`, `delete`, `count` 操作の大幅な高速化
- 組織切り替え時のレスポンス改善

#### 2. UserToolGroup.organizationId

```sql
CREATE INDEX CONCURRENTLY idx_user_tool_group_org_id
ON "UserToolGroup"("organizationId");
```

**理由**:

- ツールグループの管理・表示で頻繁に組織別フィルタリング
- UI上でのツールグループ一覧表示のパフォーマンス向上

#### 3. UserMcpServerInstance.organizationId

```sql
CREATE INDEX CONCURRENTLY idx_user_mcp_server_instance_org_id
ON "UserMcpServerInstance"("organizationId");
```

**理由**:

- MCPサーバーインスタンス管理での組織別フィルタリング
- ダッシュボードでのサーバー一覧表示の高速化

#### 4. McpServerRequestLog.organizationId

```sql
CREATE INDEX CONCURRENTLY idx_mcp_server_request_log_org_id
ON "McpServerRequestLog"("organizationId");
```

**理由**:

- 分析・監視機能での組織別ログ集計
- 大量のログデータが蓄積されるテーブルのため高速化効果が大きい

### 中優先度：複合インデックス

#### 5. UserMcpServerInstance.[organizationId, deletedAt]

```sql
CREATE INDEX CONCURRENTLY idx_user_mcp_server_instance_org_deleted
ON "UserMcpServerInstance"("organizationId", "deletedAt");
```

**理由**:

- 論理削除を考慮した組織別インスタンス取得の最適化
- 既存の`deletedAt`単独インデックスと併用

#### 6. McpServerRequestLog.[organizationId, createdAt]

```sql
CREATE INDEX CONCURRENTLY idx_mcp_server_request_log_org_created
ON "McpServerRequestLog"("organizationId", "createdAt");
```

**理由**:

- 組織別の時系列分析クエリの最適化
- 期間指定でのログ検索の高速化

### 低優先度：特定用途向け

#### 7. McpServer.organizationId (組織限定公開用)

```sql
CREATE INDEX CONCURRENTLY idx_mcp_server_org_id
ON "McpServer"("organizationId")
WHERE "organizationId" IS NOT NULL;
```

**理由**:

- 組織限定公開MCPサーバーの検索用
- 部分インデックスで容量効率を向上

## 実装優先順位

### Phase 1: 即座に実装 (高優先度)

1. `UserMcpServerConfig.organizationId`
2. `UserToolGroup.organizationId`
3. `UserMcpServerInstance.organizationId`

### Phase 2: 次回リリースで実装 (中優先度)

4. `McpServerRequestLog.organizationId`
5. `UserMcpServerInstance.[organizationId, deletedAt]`
6. `McpServerRequestLog.[organizationId, createdAt]`

### Phase 3: パフォーマンス監視後に判断 (低優先度)

7. `McpServer.organizationId` (条件付き)

## パフォーマンス予測

### 改善予想

- **小規模環境** (組織数 < 100): クエリ時間 50-70% 短縮
- **中規模環境** (組織数 100-1000): クエリ時間 70-85% 短縮
- **大規模環境** (組織数 > 1000): クエリ時間 85-95% 短縮

### ディスク使用量

- 各インデックス: 約2-5MB (1万レコードあたり)
- 総増加量: 10-25MB程度 (想定データ量)

## 実装コマンド

### 本番環境での安全な実装

```sql
-- 1. 接続数を事前確認
SELECT count(*) FROM pg_stat_activity;

-- 2. 負荷の低い時間帯にCONCURRENTLYで実行
CREATE INDEX CONCURRENTLY idx_user_mcp_server_config_org_id
ON "UserMcpServerConfig"("organizationId");

CREATE INDEX CONCURRENTLY idx_user_tool_group_org_id
ON "UserToolGroup"("organizationId");

CREATE INDEX CONCURRENTLY idx_user_mcp_server_instance_org_id
ON "UserMcpServerInstance"("organizationId");

-- 3. インデックス作成後の確認
\d+ "UserMcpServerConfig"
\d+ "UserToolGroup"
\d+ "UserMcpServerInstance"
```

### 開発環境での実装

```sql
-- CONCURRENTLYなしで高速実行
CREATE INDEX idx_user_mcp_server_config_org_id
ON "UserMcpServerConfig"("organizationId");

CREATE INDEX idx_user_tool_group_org_id
ON "UserToolGroup"("organizationId");

CREATE INDEX idx_user_mcp_server_instance_org_id
ON "UserMcpServerInstance"("organizationId");
```

## 監視・メンテナンス

### 定期監視項目

1. **インデックス使用率**

   ```sql
   SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE indexname LIKE 'idx_%org%';
   ```

2. **クエリパフォーマンス**

   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM "UserMcpServerConfig"
   WHERE "organizationId" = 'org_example';
   ```

3. **インデックスサイズ監視**
   ```sql
   SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass))
   FROM pg_indexes
   WHERE indexname LIKE 'idx_%org%';
   ```

## 注意事項

### 本番環境での実装時

- `CONCURRENTLY`オプション使用で読み取り専用ロックのみ
- ピーク時間を避けて実装
- 実装前にディスク容量を確認
- 実装後はクエリプランの変化を監視

### 継続的最適化

- 定期的なクエリ分析でインデックス効果を測定
- アプリケーションの使用パターン変化に応じて見直し
- 不要になったインデックスの削除も検討
