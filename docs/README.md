# Tumiki ドキュメント

Tumiki MCP Manager プロジェクトの技術ドキュメント集です。

## 📚 概要

このディレクトリには、Tumikiプロジェクトの設計、開発、運用に関する包括的なドキュメントが含まれています。新規メンバーのオンボーディングから、詳細な技術仕様まで、プロジェクトに関わる全ての情報を体系的に整理しています。

## 🚀 クイックスタート

新規開発者の方は以下のドキュメントから始めてください：

1. [プロジェクトREADME](../README.md) - プロジェクト全体の概要
2. [環境構築ガイド](../SETUP.md) - 開発環境のセットアップ
3. [MCP サーバー追加ガイド](./development/adding-mcp-server.md) - 新しいMCPサーバーの追加方法
4. [認証システム概要](./auth/README.md) - 認証の仕組みと実装

## 📂 カテゴリー別インデックス

### 🏗️ アーキテクチャ・設計 ([architecture/](./architecture/))

システム全体の設計思想と技術仕様に関するドキュメント。

- [DB設計.md](./architecture/DB設計.md) - データベーススキーマとER図
- [MCPサーバー管理サービスの要件定義書.md](./architecture/MCPサーバー管理サービスの要件定義書.md) - サービスの機能要件と非機能要件
- [MCPサーバー管理画面設計書.md](./architecture/MCPサーバー管理画面設計書.md) - 管理画面のUI/UX設計
- [mcp-server-request-log-design.md](./architecture/mcp-server-request-log-design.md) - リクエストログの設計仕様
- [外部サービス接続管理設計書.md](./architecture/外部サービス接続管理設計書.md) - 外部API連携の設計
- [ディレクトリ設計.ini](./architecture/ディレクトリ設計.ini) - プロジェクトのディレクトリ構造

### 🔐 認証関連 (auth/)

Auth0を使用した認証システムとOAuth実装に関するドキュメント。詳細は[auth/README.md](./auth/README.md)を参照。

- **auth0/** - Auth0固有の設定とアクション
- **oauth/** - OAuth認証の実装ガイドとプロバイダー設定

### 💼 ビジネス・事業関連 ([business/](./business/))

事業戦略、ブランディング、マーケティングに関するドキュメント。

- [readme.md](./business/readme.md) - Tumiki事業概要（開発AI向け整理版）
- [BrandBook.md](./business/BrandBook.md) - ブランドガイドライン
- [LandingPage.md](./business/LandingPage.md) - ランディングページ設計
- [WaitingList.md](./business/WaitingList.md) - ウェイティングリスト機能仕様
- [agent-sample.md](./business/agent-sample.md) - AIエージェントのサンプル実装
- [toppage-v2.md](./business/toppage-v2.md) - トップページv2の設計

### 🛠️ 開発ガイド ([development/](./development/))

開発に必要な手順書と実装ガイド。

- [adding-mcp-server.md](./development/adding-mcp-server.md) - 新しいMCPサーバーの追加手順
- [testing-environment.md](./development/testing-environment.md) - テスト環境セットアップガイド
- [stripe-setup.md](./development/stripe-setup.md) - Stripe決済の設定ガイド
- [stripe-integration-implementation-plan.md](./development/stripe-integration-implementation-plan.md) - Stripe統合の実装計画
- [vercel-env-management.md](./development/vercel-env-management.md) - Vercel環境変数の管理

### 🚢 運用・デプロイ ([operations/](./operations/))

本番環境の運用とデプロイに関するドキュメント。

- [proxy-server-deployment.md](./operations/proxy-server-deployment.md) - ProxyServerのデプロイ手順
- [mailer.md](./operations/mailer.md) - メール送信システムの設定
- [script.md](./operations/script.md) - 運用スクリプトの使用方法

### 🛡️ セキュリティ ([security/](./security/))

セキュリティポリシーと実装に関するドキュメント。

- [security.md](./security/security.md) - セキュリティポリシーとベストプラクティス
- [security-implementation-report.md](./security/security-implementation-report.md) - セキュリティ実装レポート
- [ロール管理.md](./security/ロール管理.md) - ロールベースアクセス制御の設計

### 🔌 外部サービス連携 ([integrations/](./integrations/))

OAuth認証を使用した外部サービスとの連携設定。

- [auth0-figma-oauth-setup.md](./integrations/auth0-figma-oauth-setup.md) - Figma OAuth設定ガイド
- [auth0-notion-oauth-setup.md](./integrations/auth0-notion-oauth-setup.md) - Notion OAuth設定ガイド

### 📊 週次レポート ([weekly-reports/](./weekly-reports/))

プロジェクトの進捗と課題を記録した週次レポート。

- [週次業務報告_2025年07月14日.md](./weekly-reports/週次業務報告_2025年07月14日.md)
- [週次業務報告_2025年7月28日.md](./weekly-reports/週次業務報告_2025年7月28日.md)
- [週次業務報告_2025年7月7日.md](./weekly-reports/週次業務報告_2025年7月7日.md)

### 📝 その他

- [memo.md](./memo.md) - 開発中のメモと備忘録

## 📖 ドキュメント作成ガイドライン

### 新しいドキュメントの追加

1. **配置場所の決定**
   - 上記のカテゴリーから適切なものを選択
   - 新しいカテゴリーが必要な場合は、この README.md も更新

2. **命名規則**
   - 日本語ファイル名も可（例：`DB設計.md`）
   - 英語の場合はケバブケース（例：`mcp-server-design.md`）
   - 拡張子は `.md` を使用

3. **フォーマット**
   - Markdown形式で記述
   - 見出しは `#` から始める（ファイル名と同じレベル）
   - コードブロックには言語を指定
   - 図表がある場合は、Mermaidまたは画像を使用

4. **内容の構成**
   ```markdown
   # ドキュメントタイトル
   
   ## 概要
   このドキュメントの目的と範囲を簡潔に説明
   
   ## 背景
   なぜこのドキュメントが必要なのか
   
   ## 詳細
   本文をセクションに分けて記述
   
   ## 関連ドキュメント
   関連する他のドキュメントへのリンク
   ```

### ドキュメントの更新

- 重要な変更を行った場合は、変更履歴をドキュメント末尾に記載
- 古い情報は削除せず、取り消し線（`~~古い情報~~`）で示す
- 日付を含む情報は、更新日を明記

## 🔍 ドキュメント検索のヒント

- VSCodeの検索機能（Cmd/Ctrl + Shift + F）で全文検索
- ファイル名検索（Cmd/Ctrl + P）で素早くアクセス
- このREADMEをブックマークして、目次として活用

## 🤝 貢献方法

ドキュメントの改善提案や新規追加は大歓迎です：

1. 誤字脱字や不明確な表現を見つけたら修正
2. 不足している情報があれば追加
3. より良い構成の提案
4. 図表の追加による理解促進

## 📅 更新履歴

- 2025-08-01: ドキュメント整理とナビゲーション用README作成