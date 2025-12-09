# @tumiki/scripts

このパッケージには、Tumikiプロジェクトの開発・テスト・運用に使用する各種スクリプトが含まれています。

## スクリプト一覧

### cleanUserMcp.ts

ユーザーのMCPサーバー関連データをクリーンアップするスクリプトです。

#### 使用方法

```bash
cd packages/scripts
bun run src/cleanUserMcp.ts <userId>
```

### createUserMcpServer.ts

ユーザー用のMCPサーバー設定を作成するスクリプトです。

#### 使用方法

```bash
cd packages/scripts
bun run src/createUserMcpServer.ts
```

### migrateWaitingList.ts

JSONファイルからWaitingListデータをデータベースに移行するスクリプトです。

#### 機能

- JSONファイルからのデータ読み込み
- バッチ処理による効率的な挿入
- 重複データのスキップオプション
- ドライランモード
- エラーハンドリングと個別リトライ

#### 使用方法

```bash
cd packages/scripts
bun run src/migrateWaitingList.ts <JSONファイルパス> [--dry-run] [--no-skip-duplicates]
```

#### オプション

- `--dry-run`: 実際にデータベースに挿入せず、処理内容を確認
- `--no-skip-duplicates`: 重複するメールアドレスもスキップせずに処理

### upsertAll.ts

すべてのMCPサーバー関連データを一括でアップサートするスクリプトです。

#### 使用方法

```bash
cd packages/scripts
bun run src/upsertAll.ts
```

#### Google Search Console用の環境変数設定

Google Search ConsoleのMCPサーバーを使用する場合、`GOOGLE_APPLICATION_CREDENTIALS`環境変数にJSONファイルのパスを指定します：

```bash
# .envファイルまたは環境変数として設定
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

**注意**:

- `upsertAll`実行時は、JSONファイルのパス（`.json`で終わるパス）を指定してください
- UIやProxyServer経由で使用する場合は、JSON文字列として直接渡されます

### upsertMcpServers.ts

MCPサーバーの定義をデータベースにアップサートするスクリプトです。

#### 使用方法

```bash
cd packages/scripts
bun run src/upsertMcpServers.ts
```

### upsertMcpTools.ts

MCPサーバーのツール定義をデータベースにアップサートするスクリプトです。

#### 使用方法

```bash
cd packages/scripts
bun run src/upsertMcpTools.ts
```

## パッケージとしての使用

このパッケージのスクリプトは、他のパッケージからインポートして使用することもできます：

```typescript
// Waiting List移行
import { migrateWaitingList } from "@tumiki/scripts/migrateWaitingList";
// MCPサーバーのアップサート
import { upsertMcpServers } from "@tumiki/scripts/upsertMcpServers";
import { upsertMcpTools } from "@tumiki/scripts/upsertMcpTools";

await migrateWaitingList({
  jsonFilePath: "./data/waitinglist.json",
  skipDuplicates: true,
  dryRun: false,
  batchSize: 100,
});

await upsertMcpServers();
await upsertMcpTools();
```

## 開発者向け情報

### 新しいスクリプトの追加

1. `src/` ディレクトリに新しいスクリプトファイルを作成
2. 適切なドキュメントをこのREADMEに追加
3. `package.json` の exports セクションにエクスポートを追加
4. 必要に応じて `package.json` の scripts セクションに追加

### スクリプトの命名規則

- `test-*.ts`: テスト用TypeScriptスクリプト
- `setup-*.ts`: セットアップ用TypeScriptスクリプト
- `deploy-*.ts`: デプロイ用TypeScriptスクリプト
- `migrate-*.ts`: データ移行用TypeScriptスクリプト
- `upsert-*.ts`: データ更新用TypeScriptスクリプト
- `clean-*.ts`: クリーンアップ用TypeScriptスクリプト
- `create-*.ts`: 作成用TypeScriptスクリプト

### TypeScript実行環境

スクリプトの実行には `bun` を使用します:

```bash
# @tumiki/scriptsパッケージ内でスクリプトを実行
cd packages/scripts
bun run src/your-script.ts

# package.jsonのスクリプトとして実行
pnpm your-script-name
```

### 環境変数

スクリプトの実行には以下の環境変数が必要です：

```env
# データベース接続
DATABASE_URL=postgresql://user:password@localhost:5434/tumiki
```
