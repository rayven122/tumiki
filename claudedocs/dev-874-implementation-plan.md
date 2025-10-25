# DEV-874 実装計画書（改訂版）

tumikiプロジェクトの肥大化した無駄なコード削減（tooling & npm scripts）

## 📋 Issue 情報

- **Issue ID**: DEV-874
- **優先度**: High
- **ステータス**: In Progress
- **担当者**: 鈴山英寿
- **Linear URL**: https://linear.app/rayven/issue/DEV-874
- **GitHub Issue**: #332
- **Git Branch**: `feature/dev-874-tumikiプロジェクトの肥大化した無駄なコード削減（tooling-npm-scripts）`

## 🎯 改訂版の目的

以下の3つの主要な改善を実施する：

1. **typecheck:dev の削除とtscへの統一**
2. **tooling/tsup-config の削除とtscへの移行**
3. **packages/utils の削除と呼び出し先への統合**

## 📊 現状分析

### 1. typecheck:dev の使用状況

**対象ファイル**（9箇所）:
- `package.json`（ルート）
- `apps/manager/package.json`
- `apps/proxyServer/package.json`
- `packages/db/package.json`
- `packages/auth/package.json`
- `packages/mailer/package.json`
- `packages/utils/package.json`
- `packages/youtube-mcp/package.json`
- `packages/scripts/package.json`

**現在の定義**:
```json
"typecheck:dev": "tsgo --noEmit"
```

**問題点**:
- TSGOは開発用の高速型チェックツールだが、tscとの二重管理になっている
- 全てのパッケージで重複定義されている
- tscに統一することで管理コストを削減できる

### 2. tooling/tsup-config の使用状況

**tsup.config.ts を持つパッケージ**:
- `packages/auth`
- `packages/utils`
- `packages/mailer`
- `packages/scripts`
- `packages/db`
- `apps/proxyServer`

**問題点**:
- tsupはバンドルツールだが、tscで直接コンパイルする方がシンプル
- テストファイルのコンパイル除外設定が必要
- tooling/tsup-config パッケージの保守が不要になる

### 3. packages/utils の使用状況

**依存パッケージ**:
- `apps/manager`: `getFaviconUrlsFromUrl` を使用
- `packages/scripts`: `runMcpSecurityScan`, `getMcpServerTools` を使用

**utilsパッケージの構造**:
```
packages/utils/src/
├── client/
├── server/
├── converter.ts
├── faviconUtils.ts (getFaviconUrlsFromUrl)
├── formatters.ts
└── index.ts
```

**問題点**:
- utilsパッケージが抽象的で、機能が分散している
- 実際に使われている関数は限定的
- 呼び出し先に直接組み込むことで依存関係を削減できる

## 🔧 実装計画

### Phase 1: typecheck:dev の削除とtscへの統一

#### 1.1 全パッケージのtypecheck:dev削除

**タスク**: 9箇所の `typecheck:dev` スクリプトを削除

**対象ファイル**:
```bash
# 以下のpackage.jsonから "typecheck:dev": "tsgo --noEmit" を削除
- package.json (ルート)
- apps/manager/package.json
- apps/proxyServer/package.json
- packages/db/package.json
- packages/auth/package.json
- packages/mailer/package.json
- packages/utils/package.json
- packages/youtube-mcp/package.json
- packages/scripts/package.json
```

**実施方法**:
1. 各package.jsonを編集し、`typecheck:dev` スクリプトを削除
2. ルートのpackage.jsonから `"typecheck:dev": "turbo run typecheck:dev"` を削除

**検証**:
```bash
pnpm typecheck  # tscによる型チェックが正常に動作することを確認
```

#### 1.2 turbo.jsonからtypecheck:dev削除

**タスク**: `turbo.json` から `typecheck:dev` タスク定義を削除（存在する場合）

**実施方法**:
1. `turbo.json` を確認
2. `typecheck:dev` タスクが定義されていれば削除

### Phase 2: tooling/tsup-config の削除とtscへの移行

#### 2.1 各パッケージのtsup.config.ts削除

**タスク**: tsupからtscへの移行とtsup.config.tsの削除

**対象パッケージ**:
- `packages/auth`
- `packages/utils`
- `packages/mailer`
- `packages/scripts`
- `packages/db`
- `apps/proxyServer`

**実施方法（各パッケージ共通）**:

1. **tsconfig.jsonの更新**:
```json
{
  "extends": "@tumiki/tsconfig/base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true
  },
  "include": ["src/**/*"],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx"
  ]
}
```

2. **package.jsonのbuildスクリプト更新**:
```json
{
  "scripts": {
    "build": "tsc",
    "clean": "rm -rf dist"
  }
}
```

3. **tsup関連の削除**:
   - `tsup.config.ts` を削除
   - `package.json` から `tsup` devDependency を削除
   - `package.json` から `@tumiki/tsup-config` を削除

**検証**:
```bash
pnpm build     # tscによるビルドが成功することを確認
pnpm typecheck # 型チェックが成功することを確認
```

#### 2.2 tooling/tsup-configパッケージの削除

**タスク**: `tooling/tsup-config` ディレクトリ全体を削除

**実施方法**:
1. 全パッケージのtsup移行が完了していることを確認
2. `tooling/tsup-config` ディレクトリを削除
3. ルートの `pnpm-workspace.yaml` から `tooling/tsup-config` を削除（必要な場合）

**検証**:
```bash
pnpm install   # 依存関係が正常に解決されることを確認
pnpm build     # 全パッケージがビルドできることを確認
```

### Phase 3: packages/utils の削除と呼び出し先への統合

#### 3.1 utilsコードのapps/managerへの移行

**タスク**: `getFaviconUrlsFromUrl` をapps/managerに移行

**実施方法**:

1. **新規ディレクトリ作成**:
```bash
mkdir -p apps/manager/src/utils
```

2. **ファイルコピーと調整**:
```bash
# packages/utils/src/faviconUtils.ts の内容を
# apps/manager/src/utils/faviconUtils.ts にコピー
```

3. **import文の更新**:
```typescript
// apps/manager/src/components/ui/FaviconImage.tsx
// 変更前
import { getFaviconUrlsFromUrl } from "@tumiki/utils";

// 変更後
import { getFaviconUrlsFromUrl } from "~/utils/faviconUtils";
```

**検証**:
```bash
cd apps/manager
pnpm typecheck # 型チェック成功
pnpm build     # ビルド成功
```

#### 3.2 utilsコードのpackages/scriptsへの移行

**タスク**: `runMcpSecurityScan`, `getMcpServerTools` をpackages/scriptsに移行

**実施方法**:

1. **新規ディレクトリ作成**:
```bash
mkdir -p packages/scripts/src/utils
```

2. **ファイルコピーと調整**:
```bash
# packages/utils/src/server/ の内容を
# packages/scripts/src/utils/ にコピー
```

3. **import文の更新**:
```typescript
// packages/scripts/src/security-scan-mcp.ts
// 変更前
import { runMcpSecurityScan } from "@tumiki/utils/server";

// 変更後
import { runMcpSecurityScan } from "./utils/mcpSecurityScan";

// packages/scripts/src/upsertMcpTools.ts
// 変更前
import { getMcpServerTools } from "@tumiki/utils/server";

// 変更後
import { getMcpServerTools } from "./utils/mcpServerTools";
```

**検証**:
```bash
cd packages/scripts
pnpm typecheck # 型チェック成功
pnpm build     # ビルド成功
```

#### 3.3 packages/utilsの削除

**タスク**: `packages/utils` パッケージ全体を削除

**実施方法**:

1. **依存関係の削除**:
```bash
# apps/manager/package.json から "@tumiki/utils": "workspace:*" を削除
# packages/scripts/package.json から "@tumiki/utils": "workspace:*" を削除
```

2. **パッケージディレクトリの削除**:
```bash
rm -rf packages/utils
```

3. **pnpm-workspace.yamlの更新**（必要な場合）:
```yaml
# packages/utils が明示的にリストされていれば削除
```

**検証**:
```bash
pnpm install   # 依存関係が正常に解決されることを確認
pnpm build     # 全パッケージがビルドできることを確認
pnpm typecheck # 型チェックが成功することを確認
```

### Phase 4: ドキュメント更新と最終検証

#### 4.1 README.md更新

**タスク**: プロジェクトREADME.mdの更新

**更新内容**:
- `typecheck:dev` コマンドの記述を削除
- ビルドシステムの説明をtsupからtscに変更
- utilsパッケージの記述を削除

#### 4.2 CLAUDE.md更新

**タスク**: 開発ガイドラインの更新

**更新内容**:
- 型チェックコマンドセクションから `typecheck:dev` を削除
- `typecheck` (tsc使用) のみを推奨として記載
- utilsパッケージに関する記述を削除

#### 4.3 最終検証

**タスク**: 全体の動作確認

**検証項目**:
```bash
# 1. 依存関係の確認
pnpm install

# 2. フォーマット
pnpm format:fix

# 3. Lint
pnpm lint:fix

# 4. 型チェック
pnpm typecheck

# 5. ビルド
pnpm build

# 6. テスト
pnpm test

# 7. CI確認
# GitHub Actionsが全て成功することを確認
```

## ⚠️ 実装時の注意事項

### 段階的な実施

- 各Phaseは個別のコミットとして実施
- Phase 1 → Phase 2 → Phase 3 → Phase 4 の順番を厳守
- 各Phase完了後に必ず検証を実施

### テストファイルの除外

**重要**: tsconfigでテストファイルを確実に除外する

```json
{
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "**/__tests__/**",
    "**/tests/**"
  ]
}
```

### ロールバック計画

- 各Phaseで問題が発生した場合は即座にロールバック
- Phase 3（utilsの削除）は特に慎重に実施
- バックアップブランチを作成しておく

### パフォーマンス確認

**tscビルド速度の確認**:
- tsupからtscへの移行後、ビルド時間を測定
- 極端に遅くなる場合は設定を見直し

**型チェック速度の確認**:
- typecheck:dev削除後、通常のtypecheckの速度を確認
- CIでのビルド時間を監視

## 📝 完了条件

### Phase 1完了条件

- [ ] 9箇所全ての `typecheck:dev` スクリプトが削除されている
- [ ] `pnpm typecheck` が正常に動作する
- [ ] turbo.jsonから `typecheck:dev` タスクが削除されている（存在した場合）

### Phase 2完了条件

- [ ] 6パッケージ全ての `tsup.config.ts` が削除されている
- [ ] 各パッケージのbuildスクリプトが `tsc` に変更されている
- [ ] `tooling/tsup-config` ディレクトリが削除されている
- [ ] 全パッケージで `pnpm build` が成功する
- [ ] テストファイルがdistに出力されていないことを確認

### Phase 3完了条件

- [ ] `getFaviconUrlsFromUrl` が `apps/manager/src/utils/` に移行されている
- [ ] `runMcpSecurityScan`, `getMcpServerTools` が `packages/scripts/src/utils/` に移行されている
- [ ] apps/manager, packages/scripts のimport文が更新されている
- [ ] `packages/utils` ディレクトリが削除されている
- [ ] `@tumiki/utils` への依存関係が全て削除されている
- [ ] `pnpm install` が成功する
- [ ] 全パッケージで `pnpm typecheck` が成功する

### Phase 4完了条件

- [ ] README.mdが更新されている
- [ ] CLAUDE.mdが更新されている
- [ ] ドキュメントの内容が実際の状態と一致している

### 全体完了条件

- [ ] `pnpm format:fix` が成功
- [ ] `pnpm lint:fix` が成功
- [ ] `pnpm typecheck` が成功（tscのみ使用）
- [ ] `pnpm build` が成功（tscのみ使用）
- [ ] `pnpm test` が成功
- [ ] distディレクトリにテストファイルが含まれていない
- [ ] CIが全て成功
- [ ] Claude Code Reviewで重要度8以上の指摘がない

## 📊 進捗管理

| Phase | タスク数 | 完了 | 進捗率 | 担当者 |
|-------|---------|------|--------|--------|
| Phase 1 | 2 | 0 | 0% | 鈴山英寿 |
| Phase 2 | 2 | 0 | 0% | 鈴山英寿 |
| Phase 3 | 3 | 0 | 0% | 鈴山英寿 |
| Phase 4 | 3 | 0 | 0% | 鈴山英寿 |
| **合計** | **10** | **0** | **0%** | - |

## 📊 期待される改善効果

### コードベースの削減

- **削除されるパッケージ**:
  - `tooling/tsup-config`
  - `packages/utils`
- **削除されるスクリプト**: 9箇所の `typecheck:dev`
- **削除される設定ファイル**: 6箇所の `tsup.config.ts`

### 保守性の向上

- 型チェックツールをtscに統一（TSGO不要）
- ビルドツールをtscに統一（tsup不要）
- utilsパッケージの抽象化を解消

### 依存関係の簡素化

- tsup関連の依存関係を削除
- tsgo関連の依存関係を削除
- @tumiki/utils への依存を削除

## 🔗 関連リソース

- Linear Issue: https://linear.app/rayven/issue/DEV-874
- GitHub Issue: https://github.com/rayven122/tumiki/issues/332
- Git Branch: `feature/dev-874-tumikiプロジェクトの肥大化した無駄なコード削減（tooling-npm-scripts）`

## 📅 スケジュール（目安）

- **Phase 1**: 0.5日（typecheck:dev削除）
- **Phase 2**: 1.5日（tsup削除とtsc移行）
- **Phase 3**: 1.5日（utils統合）
- **Phase 4**: 0.5日（ドキュメント更新）
- **合計**: 約4日

## 📋 詳細タスクリスト

### Phase 1: typecheck:dev の削除

- [ ] `package.json` (ルート) から `typecheck:dev` 削除
- [ ] `apps/manager/package.json` から `typecheck:dev` 削除
- [ ] `apps/proxyServer/package.json` から `typecheck:dev` 削除
- [ ] `packages/db/package.json` から `typecheck:dev` 削除
- [ ] `packages/auth/package.json` から `typecheck:dev` 削除
- [ ] `packages/mailer/package.json` から `typecheck:dev` 削除
- [ ] `packages/utils/package.json` から `typecheck:dev` 削除
- [ ] `packages/youtube-mcp/package.json` から `typecheck:dev` 削除
- [ ] `packages/scripts/package.json` から `typecheck:dev` 削除
- [ ] `turbo.json` から `typecheck:dev` タスク削除（存在する場合）
- [ ] `pnpm typecheck` で検証

### Phase 2: tsup削除とtsc移行

**packages/auth**:
- [ ] `tsconfig.json` 更新（exclude設定追加）
- [ ] `package.json` のbuildスクリプトを `tsc` に変更
- [ ] `tsup.config.ts` 削除
- [ ] `package.json` から `tsup` と `@tumiki/tsup-config` を削除
- [ ] `pnpm build` で検証
- [ ] distディレクトリにテストファイルがないことを確認

**packages/mailer**:
- [ ] `tsconfig.json` 更新（exclude設定追加）
- [ ] `package.json` のbuildスクリプトを `tsc` に変更
- [ ] `tsup.config.ts` 削除
- [ ] `package.json` から `tsup` と `@tumiki/tsup-config` を削除
- [ ] `pnpm build` で検証
- [ ] distディレクトリにテストファイルがないことを確認

**packages/scripts**:
- [ ] `tsconfig.json` 更新（exclude設定追加）
- [ ] `package.json` のbuildスクリプトを `tsc` に変更
- [ ] `tsup.config.ts` 削除
- [ ] `package.json` から `tsup` と `@tumiki/tsup-config` を削除
- [ ] `pnpm build` で検証
- [ ] distディレクトリにテストファイルがないことを確認

**packages/db**:
- [ ] `tsconfig.json` 更新（exclude設定追加）
- [ ] `package.json` のbuildスクリプトを `tsc` に変更
- [ ] `tsup.config.ts` 削除
- [ ] `package.json` から `tsup` と `@tumiki/tsup-config` を削除
- [ ] `pnpm build` で検証
- [ ] distディレクトリにテストファイルがないことを確認

**apps/proxyServer**:
- [ ] `tsconfig.json` 更新（exclude設定追加）
- [ ] `package.json` のbuildスクリプトを `tsc` に変更
- [ ] `tsup.config.ts` 削除
- [ ] `package.json` から `tsup` と `@tumiki/tsup-config` を削除
- [ ] `pnpm build` で検証
- [ ] distディレクトリにテストファイルがないことを確認

**tooling/tsup-config削除**:
- [ ] 全パッケージの移行完了を確認
- [ ] `tooling/tsup-config` ディレクトリ削除
- [ ] `pnpm install` で検証
- [ ] `pnpm build` で全パッケージのビルド成功を確認

### Phase 3: utils統合

**apps/manager統合**:
- [ ] `apps/manager/src/utils` ディレクトリ作成
- [ ] `faviconUtils.ts` を `apps/manager/src/utils/` にコピー
- [ ] `apps/manager/src/components/ui/FaviconImage.tsx` のimport更新
- [ ] その他のimport文も更新（存在する場合）
- [ ] `apps/manager/package.json` から `@tumiki/utils` 削除
- [ ] `cd apps/manager && pnpm typecheck` で検証
- [ ] `cd apps/manager && pnpm build` で検証

**packages/scripts統合**:
- [ ] `packages/scripts/src/utils` ディレクトリ作成
- [ ] server側のユーティリティを `packages/scripts/src/utils/` にコピー
- [ ] `packages/scripts/src/security-scan-mcp.ts` のimport更新
- [ ] `packages/scripts/src/upsertMcpTools.ts` のimport更新
- [ ] `packages/scripts/package.json` から `@tumiki/utils` 削除
- [ ] `cd packages/scripts && pnpm typecheck` で検証
- [ ] `cd packages/scripts && pnpm build` で検証

**packages/utils削除**:
- [ ] 全ての移行完了を確認
- [ ] `packages/utils` ディレクトリ削除
- [ ] `pnpm-workspace.yaml` から削除（明示的にリストされている場合）
- [ ] `pnpm install` で検証
- [ ] `pnpm typecheck` で全体の型チェック成功を確認
- [ ] `pnpm build` で全体のビルド成功を確認

### Phase 4: ドキュメント更新

- [ ] `README.md` から `typecheck:dev` の記述を削除
- [ ] `README.md` のビルドシステム説明を更新
- [ ] `README.md` から utilsパッケージの記述を削除
- [ ] `CLAUDE.md` から `typecheck:dev` セクションを削除
- [ ] `CLAUDE.md` の開発コマンド一覧を更新
- [ ] ドキュメントと実際の状態の整合性を確認

### 最終検証

- [ ] `pnpm install` 成功
- [ ] `pnpm format:fix` 成功
- [ ] `pnpm lint:fix` 成功
- [ ] `pnpm typecheck` 成功
- [ ] `pnpm build` 成功
- [ ] `pnpm test` 成功
- [ ] distディレクトリにテストファイルが含まれていないことを全パッケージで確認
- [ ] GitHub Actions CI が成功することを確認
- [ ] Claude Code Review で重要度8以上の指摘がないことを確認

---

**作成日**: 2025-10-25
**最終更新**: 2025-10-25
**ステータス**: Planning
**改訂**: 第2版（要件に基づき全面改訂）
