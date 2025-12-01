# Keycloak セットアップガイド

Proxmox環境でのKeycloak設定

---

## 📋 概要

- **Keycloak URL**: https://keycloak.rayven.cloud
- **Realm**: tumiki
- **Client**: tumiki-manager
- **URL管理**: ワイルドカードパターン使用

### 環境別URL

| 環境       | Manager                        | MCP Proxy                                     |
| ---------- | ------------------------------ | --------------------------------------------- |
| Local      | `http://localhost:3000`        | `http://localhost:8080`                       |
| Staging    | `https://stg.tumiki.cloud`     | (DNS設定中)                                   |
| Preview    | `https://tumiki-*.vercel.app`  | `https://tumiki-mcp-proxy-pr-*-*-*.a.run.app` |
| Production | `https://manager.tumiki.cloud` | `https://mcp.tumiki.cloud`                    |

---

## 🚀 セットアップ

### 自動セットアップ

#### 通常セットアップ

```bash
bash scripts/setup-keycloak.sh
```

**実行内容**:

1. **Realm作成** (`tumiki`)
   - 既に存在する場合はスキップ
2. **Client作成** (`tumiki-manager`)
   - ワイルドカードパターンで全環境に対応
3. **ロール作成** (`admin`, `user`, `viewer`)
4. **テストユーザー作成** (`admin@tumiki.cloud`)
5. **カスタムJWTクレーム設定**
   - `tumiki.org_id`: 組織ID
   - `tumiki.is_org_admin`: 組織管理者フラグ
   - `tumiki.user_db_id`: データベース上のユーザーID

**使用タイミング**:

- 初回セットアップ
- 設定を追加したい場合

---

#### リセット＆再セットアップ

```bash
bash scripts/setup-keycloak.sh --reset
```

**⚠️ 注意**: このコマンドは全データを削除します。

**実行内容**:

1. **確認プロンプト** (`yes`で続行)
2. **Keycloak停止**
3. **データベース削除** (全Realm、全ユーザー、全設定)
4. **データベース再作成**
5. **Keycloak起動** (Bootstrap Admin `tmpadm` 自動作成)
6. **30秒待機** (初期化完了待ち)
7. **通常セットアップ実行**

**使用タイミング**:

- 完全にやり直したい場合
- Bootstrap Adminを復活させたい場合
- 設定がおかしくなった場合

**⚠️ 警告**: 本番環境では絶対に使用しないこと

### 環境変数

`.env`ファイルに以下を設定：

```bash
# Keycloak Client
KEYCLOAK_ISSUER="https://keycloak.rayven.cloud/realms/tumiki"
KEYCLOAK_CLIENT_ID="tumiki-manager"
KEYCLOAK_CLIENT_SECRET="<管理コンソールから取得>"

# Auth.js
AUTH_SECRET="<openssl rand -base64 32で生成>"
AUTH_URL="https://local.tumiki.cloud:3000"
AUTH_TRUST_HOST="true"

# Google Identity Provider（任意）
GOOGLE_IDP_CLIENT_ID="<Google Cloud Consoleから取得>.apps.googleusercontent.com"
GOOGLE_IDP_CLIENT_SECRET="<Google Cloud Consoleから取得>"
```

**Client Secretの取得**:

1. https://keycloak.rayven.cloud/admin/ にアクセス
2. Clients → tumiki-manager → Credentials タブ
3. Client Secretをコピー

---

### Google認証の設定（任意）

Google Identity Providerを有効にする場合：

#### 1. Google Cloud Console でOAuth 2.0クライアントを作成

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) にアクセス
2. 「認証情報を作成」→「OAuth 2.0 クライアントID」
3. アプリケーションの種類: **ウェブアプリケーション**
4. 承認済みのリダイレクトURIに追加:
   ```
   https://keycloak.rayven.cloud/realms/tumiki/broker/google/endpoint
   ```
5. Client IDとClient Secretを取得

#### 2. 環境変数を設定

`.env`に追加：

```bash
GOOGLE_IDP_CLIENT_ID="123456789-xxxxx.apps.googleusercontent.com"
GOOGLE_IDP_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxx"
```

#### 3. セットアップスクリプトを実行

```bash
bash scripts/setup-keycloak.sh
```

環境変数が設定されていれば、自動的にGoogle IdPが設定されます。

#### 4. 動作確認

1. https://keycloak.rayven.cloud/realms/tumiki/account にアクセス
2. ログイン画面に「Google」ボタンが表示される
3. Googleアカウントでログイン可能

---

## 🎯 ワイルドカードパターン

Keycloakはワイルドカードをサポートしているため、Preview環境のURL追加は不要です。

### 設定されているパターン

```
✅ Local
- http://localhost:3000/*
- https://local.tumiki.cloud:3000/*

✅ Staging/Production
- https://stg.tumiki.cloud/*
- https://manager.tumiki.cloud/*

✅ Preview（ワイルドカード）
- https://tumiki-*.vercel.app/*
- https://tumiki-mcp-proxy-pr-*-*-*.a.run.app/*
```

### セキュリティ

- ✅ チーム限定: Vercelの`rayven`チームデプロイのみ許可
- ✅ プレフィックス限定: `tumiki-`で始まるURLのみ
- ⚠️ ワイルドカード制限: Keycloak公式では末尾のみサポート（`https://example.com/*`）
  - ホスト名内のワイルドカード（`https://tumiki-*.vercel.app/*`）は非公式だが実装により動作
  - Keycloak 26.4.2では動作確認済み

**例**:

```
✅ https://tumiki-rmr2ktojo-rayven-38d708d3.vercel.app
✅ https://tumiki-jeq8r4h8i-rayven-38d708d3.vercel.app
✅ https://tumiki-abc123.vercel.app
✅ https://tumiki-test.vercel.app
✅ https://tumiki-mcp-proxy-pr-517-wsolw3wnva-an.a.run.app
❌ https://attacker-test.vercel.app (プレフィックス不一致)
```

---

## 📝 ワイルドカードパターンの技術詳細

### Keycloakのワイルドカード仕様

**公式サポート範囲**:

- ✅ パス部分: `https://example.com/*`
- ❌ ホスト名: `https://*.example.com/*`（公式非サポート）

**実際の動作**（Keycloak 26.4.2）:

- ✅ `https://tumiki-*.vercel.app/*` - 動作確認済み
- ✅ `https://tumiki-*-test-*.vercel.app/*` - 複数ワイルドカードも動作
- ⚠️ 実装依存のため、将来のバージョンで変更される可能性あり

**推奨される代替手段**:

1. CI/CDパイプラインでKeycloak Admin APIを使用してURIを動的追加
2. 固定のStaging環境URLを使用
3. 開発時のみ単一`*`ワイルドカード（セキュリティリスクあり）

### 参考リソース

- [Keycloak Discussion #9278](https://github.com/keycloak/keycloak/discussions/9278) - ワイルドカードポリシー
- [Stack Overflow: Vercel動的URL](https://stackoverflow.com/questions/65928311/keycloak-valid-redirect-uris-for-dynamic-urls-w-vercel)
- [Issue #14113](https://github.com/keycloak/keycloak/issues/14113) - ホスト名ワイルドカード要望

---

## 🔧 トラブルシューティング

### Preview環境でログインできない

URLパターンを確認：

```bash
ssh remote-proxmox "pct exec 105 -- \
  /opt/keycloak/bin/kcadm.sh get clients -r tumiki --fields redirectUris"
```

- Vercel: `tumiki-*.vercel.app`形式か
- Cloud Run: `tumiki-mcp-proxy-pr-*-*-*.a.run.app`形式か

### Keycloakにアクセスできない

```bash
# サービス状態確認
ssh remote-proxmox "pct exec 105 -- systemctl status keycloak"

# ログ確認
ssh remote-proxmox "pct exec 105 -- journalctl -u keycloak -n 100"
```

---

## 🔄 メンテナンス

### 設定のリセット

```bash
bash scripts/setup-keycloak.sh --reset
```

**注意**: 既存のユーザー、Realm設定が全て削除されます。

---

**最終更新**: 2025-12-01
