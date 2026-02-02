<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/images/logo.svg">
  <source media="(prefers-color-scheme: light)" srcset="docs/images/logo.svg">
  <img alt="Tumiki Logo" src="docs/images/logo.svg" width="80">
</picture>

# Tumiki

**AIエージェントとビジネスツールをつなぐAI統合プラットフォーム**

[English version](README.md)

---

<p align="center">
  <img src="docs/images/screenshot.png" alt="Tumiki ダッシュボード" width="800">
</p>

## 概要

AIエージェントチーム環境を、これ一つでシンプルに構築。

複数のSaaSツールとAIエージェントを統一管理し、チーム全体の生産性を向上させるプラットフォームです。MCPサーバーの一元管理により、煩雑な設定作業を劇的に簡素化します。

## MCPとは

**MCP（Model Context Protocol）**は、AIアシスタントがビジネスツールと安全に連携するためのオープン標準です。

例えるなら、USBがデバイスとパソコンをつなぐように、MCPはAIとNotion、Slack、Googleカレンダーなどのアプリをつなぎます。

## 主な機能

| 機能                           | 説明                                                 |
| ------------------------------ | ---------------------------------------------------- |
| **AIとビジネスツール連携**     | さまざまなビジネスツールとAIをシームレスに統合       |
| **ロールと権限の制御**         | きめ細かなロールと権限設定でアクセス制御を管理       |
| **ツール統合の一元管理**       | すべてのツール統合を単一のダッシュボードで管理       |
| **アクティビティログの可視化** | 包括的なログ記録ですべてのアクティビティを追跡・分析 |
| **セキュアな運用**             | 企業レベルのセキュリティで機密データを安全に管理     |
| **高速セットアップ**           | 専門知識不要で数分でAIエージェントチーム環境を構築   |

## はじめに

### ユーザー向け（SaaS）

SaaSアクセスについてはお問い合わせください。

### 開発者向け

#### 前提条件

- Node.js >= 22.14.0
- pnpm 10.11.0
- Docker

#### クイックスタート

```bash
# リポジトリをクローン
git clone https://github.com/rayven122/tumiki.git
cd tumiki

# 依存関係をインストール
pnpm install

# Dockerコンテナを起動（PostgreSQL, Redis, Keycloak）
pnpm docker:up

# 開発環境をセットアップ（初回のみ）
pnpm setup:dev

# 開発サーバーを起動
pnpm dev
```

詳細なセットアップ手順については、[docs/SETUP.md](./docs/SETUP.md)を参照してください。

## 技術スタック

### フロントエンド

- [Next.js 15](https://nextjs.org) - React 19 + App Router
- [tRPC](https://trpc.io) - 型安全API
- [Tailwind CSS](https://tailwindcss.com) - CSSフレームワーク
- [Radix UI](https://www.radix-ui.com/) - UIコンポーネントライブラリ

### バックエンド

- [Hono](https://hono.dev) - Webフレームワーク
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) - MCP SDK
- [Keycloak](https://www.keycloak.org) - 認証・認可

### データベース・インフラ

- [PostgreSQL](https://postgresql.org) - メインデータベース
- [Prisma](https://prisma.io) - ORM + フィールド暗号化
- [Redis](https://redis.io) - キャッシュ・セッション管理
- [Turbo](https://turbo.build/repo) - モノレポビルドシステム

## ドキュメント

- [セットアップガイド](./docs/SETUP.md) - 詳細なセットアップ手順
- [環境変数](./docs/environment-variables.md) - 設定リファレンス

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

一部のファイルはElastic License v2.0 (ELv2)の下でライセンスされています。詳細は[LICENSE.EE](LICENSE.EE)を参照してください。

## サポート

- [GitHub Issues](https://github.com/rayven122/tumiki/issues) - バグ報告と機能リクエスト
