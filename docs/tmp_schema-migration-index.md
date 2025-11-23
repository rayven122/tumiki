# Managerアプリケーション スキーマ移行ドキュメント

> **作成日**: 2025-01-23
> **ステータス**: 📝 Planning Phase
> **対象**: apps/manager/ の最新Prismaスキーマへの対応

## 📚 ドキュメント一覧

### 1. [タスクリスト](./tmp_manager-schema-migration-tasks.md)

**概要**: Manager アプリケーションのスキーマ移行に必要なすべてのタスクを Phase 別に整理

**内容**:

- 📋 7つのPhaseに分類された包括的なタスクリスト
- ⏱️ 各タスクの推定工数と優先度
- 🎯 29個の具体的なタスク（合計推定工数: 52-74時間）
- 🚨 リスクと注意点
- ✅ 完了条件チェックリスト

**推奨読者**: プロジェクトマネージャー、全エンジニア

---

### 2. [技術仕様書](./tmp_schema-migration-technical-spec.md)

**概要**: データモデルとクエリパターンの詳細な変更仕様

**内容**:

- 📊 テーブルマッピング表（旧 ↔ 新）
- 🔧 フィールドレベルの変更詳細
- 💻 Prismaクエリパターンの Before/After 比較
- 🆔 ID型定義の変更
- 🔗 リレーション構造の変更
- 🔐 OAuth認証フローの変更

**推奨読者**: バックエンドエンジニア、データベースエンジニア

---

### 3. [実装ガイド](./tmp_schema-migration-implementation-guide.md)

**概要**: 段階的な実装手順とトラブルシューティング

**内容**:

- 📖 Phase 別の詳細な実装手順
- 💡 コードサンプル（Before/After）
- 🛠️ よくある問題と解決策
- 🧪 テストとデバッグ方法
- ❓ FAQ

**推奨読者**: 実装担当エンジニア

---

## 🎯 Quick Start

### ステップ1: ドキュメント理解

1. [タスクリスト](./tmp_manager-schema-migration-tasks.md)を読んで全体像を把握
2. [技術仕様書](./tmp_schema-migration-technical-spec.md)でスキーマ変更の詳細を理解
3. [実装ガイド](./tmp_schema-migration-implementation-guide.md)で実装方法を確認

### ステップ2: 環境準備

```bash
# 最新のスキーマを確認
cat packages/db/prisma/README.md

# @tumiki/db パッケージをビルド
cd packages/db
pnpm build

# Manager アプリケーションの型チェック
cd ../../apps/manager
pnpm typecheck
```

### ステップ3: 実装開始

推奨実施順序に従って実装:

```
Phase 1 (基盤レイヤー) → Phase 2 (tRPC) → Phase 3 (共通ユーティリティ)
→ Phase 7 (型チェック) → Phase 4 (OAuth) → Phase 5 (フロントエンド)
→ Phase 6 (テスト)
```

---

## 📊 プロジェクト概要

### 変更規模

| カテゴリ                     | 変更数        |
| ---------------------------- | ------------- |
| テーブルの変更/削除          | 12テーブル    |
| tRPCルーター                 | 5ルーター     |
| 共通ユーティリティ           | 1ファイル     |
| フロントエンドコンポーネント | 16ファイル    |
| ID型定義                     | 8型           |
| **合計推定工数**             | **52-74時間** |

### 主要な変更点

1. **テーブル名の統一的な命名規則**
   - `McpServer` → `McpServerTemplate`
   - `UserMcpServerInstance` → `McpServer`
   - `UserMcpServerConfig` → `McpConfig`
   - `Tool` → `McpTool`

2. **ツールグループ構造の完全削除**
   - `UserToolGroup` テーブル削除
   - `UserToolGroupTool` 中間テーブル削除
   - 暗黙的多対多リレーションへ移行

3. **OAuth/APIキー管理の統合**
   - `oauth.prisma` → `userMcpServer.prisma` に統合
   - `apiKey.prisma` → 統合

---

## 🚨 重要な注意事項

### 高リスク項目

1. **ツールグループ構造の完全削除**
   - 現在の実装に深く組み込まれている
   - 代替ロジックの設計が必要
   - 推定工数: 8-12時間（Phase 2.2）

2. **OAuthSession テーブルの削除**
   - OAuth フロー全体の見直しが必要
   - セッション管理の代替実装が必要
   - 推定工数: 3-4時間（Phase 4）

3. **ID型の大規模変更**
   - 全ファイルへの波及
   - 型エラーの大量発生が予想される
   - 推定工数: 1-2時間（Phase 1）+ 継続的な修正

### 推奨事項

- ✅ 小さな単位でコミット（1ファイル or 関連ファイルセット）
- ✅ 各 Phase ごとに型チェックを実行
- ✅ Phase 1-3 完了後、必ず Phase 7（型チェック・ビルド）を実施
- ❌ 複数 Phase を並行実装しない
- ❌ 型エラーを無視して先に進まない

---

## 📈 進捗管理

### Phase別の進捗状況

| Phase                       | ステータス | 推定工数  | 完了日 |
| --------------------------- | ---------- | --------- | ------ |
| Phase 1: 基盤レイヤー       | ⬜ 未着手  | 1-2時間   | -      |
| Phase 2: tRPCルーター       | ⬜ 未着手  | 19-27時間 | -      |
| Phase 3: 共通ユーティリティ | ⬜ 未着手  | 4-6時間   | -      |
| Phase 7: 型チェック・ビルド | ⬜ 未着手  | 3-6時間   | -      |
| Phase 4: OAuth API          | ⬜ 未着手  | 3-4時間   | -      |
| Phase 5: フロントエンド     | ⬜ 未着手  | 18-23時間 | -      |
| Phase 6: テスト             | ⬜ 未着手  | 4-6時間   | -      |

### マイルストーン

- [ ] **Milestone 1**: Phase 1-3 完了（API層の完成）
- [ ] **Milestone 2**: Phase 7 完了（型エラー解消、ビルド成功）
- [ ] **Milestone 3**: Phase 4-5 完了（OAuth・UI実装）
- [ ] **Milestone 4**: Phase 6 完了（テスト完了）
- [ ] **Milestone 5**: 本番環境デプロイ（データ移行含む）

---

## 🔗 関連リソース

### ドキュメント

- [Prisma Schema README](../packages/db/prisma/README.md) - 新スキーマの詳細
- [プロジェクトガイドライン](../CLAUDE.md) - 開発ガイドライン
- [PR #459](https://github.com/rayven122/tumiki/pull/459) - スキーマリファクタリングPR

### 参考情報

- [Prisma公式ドキュメント - Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [Prisma公式ドキュメント - Many-to-many](https://www.prisma.io/docs/concepts/components/prisma-schema/relations/many-to-many-relations)

---

## ❓ サポート

### 質問・問題報告

- **技術的な質問**: [実装ガイドのFAQ](./tmp_schema-migration-implementation-guide.md#5-faq)を参照
- **バグ報告**: GitHub Issues に報告
- **設計相談**: テックリードに相談

---

**最終更新日**: 2025-01-23
