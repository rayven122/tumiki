# Tumiki ドキュメント

このディレクトリには、Tumikiのアーキテクチャ、実装、セキュリティ、コンプライアンス、運用に関するドキュメントが含まれています。

---

## 📚 ドキュメント一覧

### アーキテクチャ
- **[ハイブリッドアーキテクチャ設計書](./architecture/hybrid-architecture.md)**
  - データプレーン/コントロールプレーンの分離
  - コンポーネント詳細
  - セキュリティ設計
  - デプロイメント

### 実装
- **[実装計画](./implementation/plan.md)**
  - 6フェーズの実装ステップ
  - 変更ファイル一覧（優先度付き）
  - 検証計画
  - リスク管理

### セキュリティ
- **[セキュリティホワイトペーパー](./security/WHITEPAPER.md)**
  - データレジデンシー保証
  - ペイロード流出防止の技術的説明
  - 暗号化方式（保存時・通信時）
  - 認証・認可メカニズム
  - PIIマスキング
  - 監査・ロギング
  - SIEM連携

### コンプライアンス
- **[コンプライアンスガイドライン](./compliance/GUIDELINES.md)**
  - GDPR対応
  - 金融庁ガイドライン対応
  - 医療情報システムの安全管理ガイドライン対応
  - PCI DSS対応（計画中）
  - コンプライアンスチェックリスト

### 運用
- **[運用ガイド](./operations/RUNBOOK.md)**
  - セットアップ手順
  - 日常運用（ヘルスチェック、ログ確認）
  - バックアップ・リストア
  - メンテナンス
  - トラブルシューティング
  - パフォーマンスチューニング
  - ディザスタリカバリー

### 認証
- **[認証ガイド](./auth/)** ※既存
  - Keycloak設定
  - OAuth 2.1 / OIDC

### その他
- **[環境変数リファレンス](./environment-variables.md)** ※既存
- **[セットアップガイド](./SETUP.md)** ※既存

---

## 🎯 想定読者別ガイド

### CISO・セキュリティ担当者向け
1. [セキュリティホワイトペーパー](./security/WHITEPAPER.md) - セキュリティアーキテクチャの全体像
2. [コンプライアンスガイドライン](./compliance/GUIDELINES.md) - 各種規制への対応状況
3. [ハイブリッドアーキテクチャ設計書](./architecture/hybrid-architecture.md) - データレジデンシー保証

### 開発者向け
1. [実装計画](./implementation/plan.md) - 実装の詳細ステップ
2. [ハイブリッドアーキテクチャ設計書](./architecture/hybrid-architecture.md) - コンポーネント詳細
3. [運用ガイド](./operations/RUNBOOK.md) - トラブルシューティング

### インフラ・運用担当者向け
1. [運用ガイド](./operations/RUNBOOK.md) - セットアップからメンテナンスまで
2. [ハイブリッドアーキテクチャ設計書](./architecture/hybrid-architecture.md) - デプロイメント
3. [セットアップガイド](./SETUP.md) - 初期セットアップ

### 情報システム部門向け
1. [ハイブリッドアーキテクチャ設計書](./architecture/hybrid-architecture.md) - 全体像
2. [コンプライアンスガイドライン](./compliance/GUIDELINES.md) - 規制対応
3. [運用ガイド](./operations/RUNBOOK.md) - 運用フロー

---

## 📖 クイックリンク

### セキュリティ関連
- [データレジデンシー保証](./security/WHITEPAPER.md#1-データレジデンシー保証)
- [ペイロード流出防止](./security/WHITEPAPER.md#1-データレジデンシー保証)
- [暗号化方式](./security/WHITEPAPER.md#2-暗号化方式)
- [PIIマスキング](./security/WHITEPAPER.md#4-piiマスキング)

### コンプライアンス関連
- [GDPR対応](./compliance/GUIDELINES.md#1-gdpr一般データ保護規則対応)
- [金融庁ガイドライン対応](./compliance/GUIDELINES.md#2-金融庁ガイドライン対応)
- [医療情報システム対応](./compliance/GUIDELINES.md#3-医療情報システムの安全管理ガイドライン対応)

### 運用関連
- [セットアップ](./operations/RUNBOOK.md#1-セットアップ)
- [バックアップ・リストア](./operations/RUNBOOK.md#3-バックアップリストア)
- [トラブルシューティング](./operations/RUNBOOK.md#5-トラブルシューティング)

---

## 🔄 最終更新

| ドキュメント | 最終更新日 | バージョン |
|------------|-----------|----------|
| ハイブリッドアーキテクチャ設計書 | 2026-03-15 | 1.0 |
| 実装計画 | 2026-03-15 | 1.0 |
| セキュリティホワイトペーパー | 2026-03-15 | 1.0 |
| コンプライアンスガイドライン | 2026-03-15 | 1.0 |
| 運用ガイド | 2026-03-15 | 1.0 |

---

## 📞 サポート

### 技術サポート
- **Email**: support@tumiki.io
- **対応時間**: 平日 9:00-18:00 JST

### セキュリティインシデント
- **Email**: security@tumiki.io
- **緊急連絡先**: +81-XX-XXXX-XXXX（24時間対応）

### コンプライアンス相談
- **Email**: compliance@tumiki.io
- **対応時間**: 平日 9:00-18:00 JST
