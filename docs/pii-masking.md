# PIIマスキング機能

MCPサーバーのリクエスト・レスポンスに含まれる個人情報（PII: Personally Identifiable Information）を自動的にマスキングする機能です。

## 概要

- **マスキングエンジン**: Google Cloud DLP（Data Loss Prevention）API
- **適用タイミング**: リアルタイム通信時とログ保存時の両方
- **設定単位**: MCPサーバーごとに有効/無効を設定可能

## 検出対象PII

以下のPIIタイプを検出・マスキングします：

### 基本的なPII
- `EMAIL_ADDRESS` - メールアドレス
- `PHONE_NUMBER` - 電話番号
- `CREDIT_CARD_NUMBER` - クレジットカード番号
- `IP_ADDRESS` - IPアドレス
- `IBAN_CODE` - 銀行口座番号（IBAN）

### 認証関連
- `AUTH_TOKEN` - 認証トークン
- `GCP_API_KEY` - GCP APIキー
- `AWS_CREDENTIALS` - AWS認証情報
- `AZURE_AUTH_TOKEN` - Azure認証トークン
- `ENCRYPTION_KEY` - 暗号化キー
- `JSON_WEB_TOKEN` - JWTトークン
- `HTTP_COOKIE` - HTTPクッキー
- `OAUTH_CLIENT_SECRET` - OAuthクライアントシークレット
- `PASSWORD` - パスワード
- `XSRF_TOKEN` - XSRFトークン

### 個人情報
- `PERSON_NAME` - 個人名
- `STREET_ADDRESS` - 住所
- `DATE_OF_BIRTH` - 生年月日

### 日本固有のPII
- `JAPAN_INDIVIDUAL_NUMBER` - マイナンバー
- `JAPAN_PASSPORT` - パスポート番号
- `JAPAN_DRIVERS_LICENSE_NUMBER` - 運転免許証番号

## 環境変数設定

mcp-proxyサーバーで以下の環境変数を設定します：

```bash
# GCP認証情報（サービスアカウントキー）
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

プロジェクトIDは `GOOGLE_APPLICATION_CREDENTIALS` から自動検出されます。

## GCP DLP APIの有効化

1. [GCPコンソール](https://console.cloud.google.com/)にアクセス
2. プロジェクトを選択
3. 「APIとサービス」→「ライブラリ」
4. 「Cloud Data Loss Prevention (DLP) API」を検索
5. 「有効にする」をクリック

## サービスアカウント設定

PIIマスキング機能を使用するには、以下の権限を持つサービスアカウントが必要です：

- `roles/dlp.deidentifyTemplatesEditor` または
- `roles/dlp.user`

### サービスアカウントの作成

```bash
# サービスアカウントを作成
gcloud iam service-accounts create tumiki-dlp \
  --display-name="Tumiki DLP Service Account"

# DLP権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:tumiki-dlp@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/dlp.user"

# キーファイルを作成
gcloud iam service-accounts keys create ./service-account-key.json \
  --iam-account=tumiki-dlp@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Manager UIでの設定

1. MCPサーバー詳細ページにアクセス
2. 「概要」タブを選択
3. 「セキュリティ設定」カードを確認
4. 「PIIマスキング」トグルを有効化

有効化すると、以下の処理が行われます：

1. **リクエスト受信時**: リクエストボディ内のPIIを検出・マスキング
2. **レスポンス送信時**: レスポンスボディ内のPIIを検出・マスキング
3. **ログ保存時**: マスキング済みデータをPostgreSQL/BigQueryに保存

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────┐
│                    さくらのクラウド VM                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      mcp-proxy (Hono)                        │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │          PII Masking Middleware                       │   │   │
│  │  │                                                        │   │   │
│  │  │   1. authContext.piiMaskingEnabled を確認              │   │   │
│  │  │   2. GCP認証情報を確認（GOOGLE_APPLICATION_CREDENTIALS）│   │   │
│  │  │   3. 有効なら GCP DLP API 呼び出し                      │   │   │
│  │  │   4. マスキング済みデータを次のミドルウェアへ            │   │   │
│  │  │                                                        │   │   │
│  │  └────────────────────────────────────────────────────────┘   │   │
│  └───────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ (piiMaskingEnabled=true の場合のみ)
                                              ▼
                                     ┌─────────────────┐
                                     │   GCP DLP API   │
                                     │  (外部サービス)   │
                                     └─────────────────┘
```

## パフォーマンス

- **レイテンシー**: 50-100ms（DLP API呼び出し）
- **コスト**: $1-3/GB（従量課金）

## エラーハンドリング

PIIマスキング機能はフェイルオープン方式を採用しています：

- GCP認証情報が設定されていない場合、PIIマスキングは自動的にスキップ
- DLP API呼び出しが失敗した場合、元のテキストをそのまま使用
- 処理の中断やエラーの伝播は行わない
- エラーはログに記録される

## 関連ファイル

### mcp-proxy
- `apps/mcp-proxy/src/libs/piiMasking/` - GCP DLPクライアント実装
- `apps/mcp-proxy/src/middleware/piiMasking/` - PIIマスキングミドルウェア
- `apps/mcp-proxy/src/middleware/requestLogging/` - ログ記録時のマスキング

### Manager
- `apps/manager/src/app/[orgSlug]/mcps/[id]/_components/OverviewTab/SecuritySettings.tsx` - UI コンポーネント
- `apps/manager/src/server/api/routers/v2/userMcpServer/updatePiiMasking.ts` - tRPC mutation

### Database
- `packages/db/prisma/schema/userMcpServer.prisma` - `piiMaskingEnabled` フィールド

## 参考リンク

- [Google Cloud DLP ドキュメント](https://cloud.google.com/sensitive-data-protection/docs)
- [Google Cloud DLP 料金](https://cloud.google.com/sensitive-data-protection/pricing)
- [@google-cloud/dlp npm パッケージ](https://www.npmjs.com/package/@google-cloud/dlp)
- [非識別化の実装ガイド](https://cloud.google.com/sensitive-data-protection/docs/deidentify-sensitive-data)
