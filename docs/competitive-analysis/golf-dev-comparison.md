# Golf DEV vs Tumiki 機能比較レポート

> 作成日: 2026-01-28
> 目的: 競合サービス Golf DEV の機能分析と Tumiki の差分整理

## 1. Golf DEV 概要

### 1.1 サービス概要

**Golf** は、AIエージェント向けの **MCPサーバーセキュリティゲートウェイ** を提供するスタートアップ。

- **設立**: 2025年
- **資金調達**: Y Combinator X25 ($500,000)
- **拠点**: サンフランシスコ
- **GitHub Stars**: 800+
- **ライセンス**: Apache-2.0

### 1.2 製品ラインナップ

| 製品 | 概要 | 価格 |
|-----|------|-----|
| **GolfMCP** | オープンソースのMCPサーバー構築フレームワーク（Python） | 無料 |
| **Golf Firewall** | エンタープライズ向けセキュリティゲートウェイ | 要問合せ |

### 1.3 ビジネスモデル

```
[オープンソース GolfMCP] → 開発者獲得 → [本番環境移行時] → Golf Firewall契約
```

**ターゲット顧客:**
- データプラットフォーム企業（MCPを製品機能として提供、マルチテナント分離が必要）
- SaaS企業（顧客データ・金融データに触れるAIワークフローを構築中）
- 開発者ツール企業（Claude Code、Cursor、ChatGPTなどのコーディングエージェントと統合）

---

## 2. Golf DEV 機能詳細

### 2.1 GolfMCP（オープンソースフレームワーク）

#### プロジェクト構造
```
your-project/
├── tools/           # ツール実装（自動検出）
├── resources/       # リソース実装
├── prompts/         # プロンプトテンプレート
├── auth.py          # 認証設定
└── golf.json        # メイン設定
```

#### 認証機能
| 認証方式 | 用途 | 詳細 |
|---------|-----|------|
| JWT認証 | 本番環境 | JWKS URI、発行者、オーディエンス設定、スコープ定義可能 |
| OAuth Server | 本番環境 | Golf自体がOAuth 2.0サーバーとして機能 |
| Static Token | 開発環境 | 開発・テスト用途限定 |
| API Key | 汎用 | 基本的なAPI認証 |

#### テレメトリ機能
- OpenTelemetry統合
- `OTEL_TRACES_EXPORTER="otlp_http"` で有効化
- 詳細トレーシングオプション（入出力キャプチャ）

#### トランスポート
- SSE
- streamable-HTTP
- stdio

### 2.2 Golf Firewall（エンタープライズ製品）

#### プロンプトインジェクション検知
- ファインチューニングしたLLMでリアルタイム分類
- 間接的プロンプトインジェクション（ツール呼び出しや取得データに埋め込まれた悪意ある指示）を検知
- 入力/出力のリアルタイムスキャン

#### アクセス制御・認証
- **Okta/Azure AD統合**: エージェントインタラクションを特定の人間のアイデンティティにマッピング
- **ツール単位のRBAC**: ユーザー×ツール単位での厳格な権限管理

#### MCP専用レートリミット
- ツール呼び出しシーケンスの追跡
- コンテキストウィンドウ使用量の監視
- セッションパターン分析

#### 監査・可観測性
- Microsoft Sentinel/Splunkへの構造化ログストリーミング
- 完全な操作履歴（SOC 2コンプライアンス対応）
- セッションリプレイ検知

#### デプロイメント
- VPC/オンプレミスデプロイ対応
- 顧客インフラ内で完結
- データは外部送信されない

---

## 3. Tumiki 現在の機能

### 3.1 実装済み機能

| 機能カテゴリ | 実装状況 | 詳細 |
|------------|---------|------|
| **認証** | ✅ 実装済み | JWT (Keycloak), API Key |
| **PIIマスキング** | ✅ 実装済み | GCP DLP統合（EMAIL, PHONE, クレジットカード, マイナンバー等） |
| **監査ログ** | ✅ 実装済み | Pub/Sub → BigQueryストリーミング |
| **暗号化** | ✅ 実装済み | フィールドレベル暗号化（API Key, トークン） |
| **Dynamic Search** | ✅ 実装済み | AIベースのツール検索/実行（独自機能） |
| **マルチテナント** | ✅ 実装済み | 組織単位の分離 |
| **OAuth 2.0サーバー** | ✅ 実装済み | MCP OAuth 2.0仕様準拠 |

### 3.2 PIIマスキング詳細（Tumikiの強み）

GCP DLPを使用した包括的なPII検出・マスキング:

```typescript
// 検出対象InfoTypes
const DEFAULT_INFO_TYPES = [
  // 基本的なPII
  "EMAIL_ADDRESS", "PHONE_NUMBER", "CREDIT_CARD_NUMBER", "IP_ADDRESS",

  // 認証関連
  "AUTH_TOKEN", "GCP_API_KEY", "AWS_CREDENTIALS", "AZURE_AUTH_TOKEN",
  "JSON_WEB_TOKEN", "PASSWORD", "OAUTH_CLIENT_SECRET",

  // 個人情報
  "PERSON_NAME", "STREET_ADDRESS", "DATE_OF_BIRTH",

  // 日本固有のPII
  "JAPAN_INDIVIDUAL_NUMBER", // マイナンバー
  "JAPAN_PASSPORT",
  "JAPAN_DRIVERS_LICENSE_NUMBER",
];
```

---

## 4. 機能差分分析

### 4.1 Tumikiに不足している機能

#### 優先度: 高

| 機能 | Golf | Tumiki | 実装難易度 | 備考 |
|-----|------|--------|----------|------|
| **プロンプトインジェクション検知** | LLMベースのリアルタイム検知 | ❌ なし | 高 | セキュリティ上重要 |
| **MCP専用レートリミット** | ツール呼び出しパターン追跡 | ❌ なし | 中 | 悪用防止に必須 |
| **IdP統合 (Okta/Azure AD)** | ユーザー×ツール単位のRBAC | ⚠️ Keycloakのみ | 中 | エンタープライズ要件 |
| **セッションリプレイ検知** | 不審パターン検知 | ❌ なし | 中〜高 | 高度なセキュリティ |

#### 優先度: 中

| 機能 | Golf | Tumiki | 実装難易度 | 備考 |
|-----|------|--------|----------|------|
| **SIEM統合 (Sentinel/Splunk)** | 直接ストリーミング | ⚠️ BigQueryのみ | 低〜中 | 変換パイプライン必要 |
| **VPCデプロイオプション** | オンプレミス/VPC対応 | ⚠️ Cloud Run想定 | 中 | 大企業向け |
| **SOC 2コンプライアンス** | 対応済み | ❌ 未対応 | 高 | 認証プロセス必要 |

### 4.2 Tumikiが優れている点

| 機能 | 詳細 |
|-----|------|
| **PIIマスキング** | GCP DLPによる詳細な検出・マスキング（日本固有のマイナンバー等対応） |
| **監査ログ分析** | BigQuery統合による高度な分析機能 |
| **Dynamic Search** | AIベースツール検索（Golfにはない独自機能） |
| **日本市場最適化** | 日本語UI、国内法規制対応 |

### 4.3 Golfの弱点（Tumikiで活用可能）

> **原文**: "Golf.dev lacks the capability to detect sensitive data in MCP traffic and take specific enforcement actions, such as blocking the entire response, firing an alert, or masking/redacting the sensitive data."

> **和訳**: 「Golf.devは、MCPトラフィック内の機密データを検出し、レスポンス全体のブロック、アラート発火、機密データのマスキング/削除といった具体的な強制アクションを実行する機能を欠いている。」

**Tumikiはすでに GCP DLP で PII検出・マスキング機能を実装済み** であり、この弱点をマーケティング上の差別化ポイントとして活用可能。

---

## 5. 推奨アクションプラン

### Phase 1: セキュリティ基盤強化

#### 1.1 レートリミット実装
- MCP専用レートリミット（ツール呼び出し頻度、コンテキストサイズ）
- 組織/ユーザー/APIキー単位での制限
- Redisベースのカウンター実装

#### 1.2 プロンプトインジェクション検知（MVP）
- 既存のAI機能（Dynamic Search）を活用したルールベース検知
- 将来的にLLMベース検知に拡張

### Phase 2: エンタープライズ対応

#### 2.1 SIEM統合
- Splunk/Sentinel向けログフォーマット出力オプション
- BigQueryからの変換パイプライン or 直接送信

#### 2.2 細粒度RBAC
- ツール単位のアクセス制御
- Okta/Azure AD SCIM連携

### Phase 3: コンプライアンス

#### 3.1 SOC 2準備
- セキュリティポリシードキュメント整備
- 監査ログの完全性保証

---

## 6. 競合環境

| 企業 | 調達額 | 特徴 |
|-----|--------|-----|
| **Golf** | $500K (YC X25) | プロンプトインジェクション検知、VPCデプロイ |
| **Runlayer** | $1,100万 (Khosla, Felicis) | 8社のユニコーン顧客（Gusto, Instacart等） |
| **MintMCP** | - | 初のSOC 2 Type II認証MCPプラットフォーム |
| **SGNL** | $3,000万 (Series A) | アイデンティティファーストのアクセス制御 |

---

## 7. 参考資料

- [Golf GitHub Repository](https://github.com/golf-mcp/golf)
- [Golf Firewall Blog](https://golf.dev/blog/golf-firewall)
- [MCP Security Tools Comparison](https://mcpmanager.ai/blog/mcp-security-tools/)
- [MCP Gateway Overview](https://mcpmanager.ai/blog/mcp-gateway/)
- [MintMCP Enterprise AI Infrastructure](https://www.mintmcp.com/blog/enterprise-ai-infrastructure-mcp)

---

## 更新履歴

| 日付 | 更新内容 |
|-----|---------|
| 2026-01-28 | 初版作成 |
