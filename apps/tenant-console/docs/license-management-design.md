# ライセンス管理機能 設計ドキュメント

## 📋 概要

`apps/tenant-console` に **Tumiki Cloud API のライセンス JWT 発行・管理機能** を統合する設計仕様。

現状、ライセンス JWT は `scripts/issue-license.ts` の CLI でのみ発行可能で、発行履歴の追跡や失効ができない。これを tenant-console の管理 UI に統合し、発行業務を効率化・トレーサブル化する。

### 設計目標

1. **発行業務の UI 化**: CLI から GUI へ移行し、運用ミスを削減
2. **発行履歴の永続化**: 誰にいつ何を発行したかを DB に記録
3. **失効機構**: 漏洩時の即時失効を可能にする
4. **個人/法人の両対応**: PERSONAL / TENANT 両モードを 1 画面で扱う
5. **既存 CLI との共存**: 緊急時用に CLI スクリプトは残存させる

### スコープ外（別 PR で対応）

- desktop からの自動取得（連携モード Phase 2）
- internal-manager 経由の短命 JWT 発行
- Stripe 等課金システムとの自動連動
- ライセンスの自動更新通知

---

## 🎯 アーキテクチャ全体像

```
                    ┌────────────────────────────────────┐
                    │ RAYVEN 運用者                       │
                    │ （tenant-console.tumiki.cloud にログイン）│
                    └──────────────┬─────────────────────┘
                                   │ ① ライセンス発行リクエスト
                                   │   - type: PERSONAL | TENANT
                                   │   - subject: email | tenantId
                                   │   - features: [...]
                                   │   - ttl: 期間
                                   ▼
        ┌─────────────────────────────────────────────────┐
        │ tenant-console (Next.js + tRPC)                  │
        │  ┌──────────────────────────────────────────┐   │
        │  │ /licenses 管理画面                         │   │
        │  └──────────────────────────────────────────┘   │
        │  ┌──────────────────────────────────────────┐   │
        │  │ tRPC: license.issue / list / revoke       │   │
        │  └──────────────────┬────────────────────────┘   │
        │                     │ ② JWT 署名 + DB 保存       │
        │  ┌──────────────────┴────────────────────────┐   │
        │  │ License 永続化                             │   │
        │  │ - PostgreSQL: License テーブル             │   │
        │  │ - Infisical: LICENSE_SIGNING_PRIVATE_KEY   │   │
        │  └──────────────────────────────────────────┘   │
        └─────────────────────┬────────────────────────────┘
                              │ ③ JWT を発行担当者にコピー表示
                              ▼
                    ┌─────────────────────────┐
                    │ 顧客 (個人 Pro / 法人)    │
                    │ - メール等で受領         │
                    │ - desktop / mcp-proxy に  │
                    │   投入して利用           │
                    └─────────────┬───────────┘
                                  │ ④ Bearer 認証
                                  ▼
                    ┌─────────────────────────┐
                    │ api.tumiki.cloud         │
                    │ (tumiki-cloud-api)       │
                    │ - JWT 検証（公開鍵）     │
                    │ - features チェック      │
                    │ - LLM プロキシ           │
                    └─────────────────────────┘
```

---

## 🗄️ データモデル設計

### License テーブル

`apps/tenant-console/prisma/schema/license.prisma`

```prisma
/// ライセンス発行履歴
/// Tumiki Cloud API の JWT を発行・管理する
model License {
  id            String        @id @default(cuid())

  /// ライセンスタイプ（個人/テナント）
  type          LicenseType

  /// 識別子
  /// - PERSONAL: 顧客のメールアドレス
  /// - TENANT:   tenantId と同じ値
  subject       String

  /// テナント紐付け（type=TENANT の場合のみ）
  tenantId      String?
  tenant        Tenant?       @relation(fields: [tenantId], references: [id], onDelete: SetNull)

  /// 有効な EE 機能
  /// 例: ["dynamic-search"]
  /// 注: Postgres String[] を使う（カンマ区切り文字列ではない）
  features      String[]

  /// プラン種別（任意・表示用ラベル）
  /// 例: "pro", "enterprise"
  plan          String?

  /// JWT の jti クレーム（失効リスト用の一意 ID）
  jti           String        @unique @default(cuid())

  /// 発行日時 / 有効期限
  issuedAt      DateTime      @default(now())
  expiresAt     DateTime

  /// ステータス
  status        LicenseStatus @default(ACTIVE)
  revokedAt     DateTime?
  revokedReason String?

  /// 発行時のメモ（顧客名、契約番号など）
  notes         String?

  /// 発行操作者（将来 Auth が入った時用、null 許容で先行追加）
  issuedByEmail String?

  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([tenantId])
  @@index([status, expiresAt])
  @@index([type, status])
  @@index([subject])
}

enum LicenseType {
  PERSONAL  // 個人 Pro ユーザー
  TENANT    // 法人テナント
}

enum LicenseStatus {
  ACTIVE   // 有効
  EXPIRED  // 期限切れ（バッチ等で更新）
  REVOKED  // 失効済み
}
```

### Tenant モデルへの追加（既存）

```prisma
model Tenant {
  // ... 既存フィールド
  licenses  License[]   // 追加: テナント紐付けライセンス
}
```

### スキーマ設計の判断ポイント

| 項目 | 採用案 | 理由 |
|------|--------|------|
| JWT 本体の保存 | **保存しない** | 漏洩リスクが高い。検証は公開鍵側でできるので不要 |
| `jti` の扱い | DB 主キーとは別に保持（`@unique`） | 失効リストのキー、JWT の jti クレームとして埋め込む |
| `tenantId` の null 許容 | 許容 | PERSONAL ライセンスでは紐付け先がない |
| tenant 削除時の挙動 | `SetNull` | テナント削除しても発行履歴は残す（監査目的） |
| `features` の型 | `String[]`（Postgres array） | カンマ区切りより安全、検索もしやすい |
| `revokedAt` / `revokedReason` | カラム追加 | 失効履歴の追跡 |
| `issuedByEmail` | カラム追加（null 許容） | 将来 Auth 導入時の履歴用 |

---

## 🔌 tRPC API 設計

`apps/tenant-console/src/features/licenses/api/`

```
features/licenses/
├── api/
│   ├── router.ts            # ルーター
│   ├── schemas.ts           # Zod 入力スキーマ
│   ├── issueLicense.ts      # 発行
│   ├── listLicenses.ts      # 一覧
│   ├── getLicense.ts        # 詳細
│   ├── revokeLicense.ts     # 失効
│   ├── checkRevocation.ts   # CRL（tumiki-cloud-api 用）
│   └── constants.ts
├── components/
│   ├── IssueLicenseForm.tsx
│   ├── LicenseTable.tsx
│   ├── LicenseDetailDrawer.tsx
│   └── LicenseDisplayModal.tsx  # 発行直後の JWT 表示
```

### エンドポイント詳細

#### `license.issue` (mutation)

入力:
```ts
{
  type: "PERSONAL" | "TENANT",
  subject: string,                  // PERSONAL: email, TENANT: tenantId
  features: ("dynamic-search" | "pii-dashboard" | ...)[],
  ttlDays: number,                  // 1〜730
  plan?: string,                    // "pro" 等
  notes?: string,
  tenantId?: string,                // type=TENANT のとき必須
}
```

出力:
```ts
{
  license: License,                 // DB レコード
  token: string,                    // "tumiki_lic_<JWT>" 形式（一度だけ返す）
}
```

処理フロー:
```
1. 入力バリデーション（Zod）
2. type=TENANT の場合は tenantId が DB に存在するか検証
3. 同一 subject + 有効ライセンスが既にないかチェック（任意・警告のみ）
4. Infisical から LICENSE_SIGNING_PRIVATE_KEY を取得
5. jti を生成（cuid）
6. JWT 署名:
   payload: {
     iss: "tumiki-license",
     aud: "tumiki-cloud-api",
     sub: subject,
     type, features, plan, tenant?, jti,
     iat, exp
   }
7. DB に License 保存（status: ACTIVE）
8. token + license レコードを返却
```

#### `license.list` (query)

入力:
```ts
{
  type?: "PERSONAL" | "TENANT",
  status?: "ACTIVE" | "EXPIRED" | "REVOKED",
  tenantId?: string,
  search?: string,                  // subject や notes で部分一致
  cursor?: string,
  limit?: number,                   // default 20, max 100
}
```

出力:
```ts
{
  items: License[],
  nextCursor?: string,
  total: number,
}
```

#### `license.get` (query)

入力: `{ id: string }` → `License`

#### `license.revoke` (mutation)

入力: `{ id: string, reason?: string }` → `License`

処理:
```
1. License を取得（既に REVOKED なら 409 Conflict）
2. status: REVOKED, revokedAt: now, revokedReason: input.reason に更新
3. 監査ログとして notes に追記（任意）
```

#### `license.checkRevocation` (query, 公開エンドポイント)

> tumiki-cloud-api が CRL チェック用に呼び出す（将来）

入力: `{ jti: string }`

出力: `{ revoked: boolean, revokedAt?: DateTime }`

注: 認証はネットワーク層で制限（k8s 内部 Service 経由のみ）

---

## 🔐 Infisical 統合

### 必要なシークレット

`tenant-console` プロジェクト（`/`）に追加:

| キー | 値 | 用途 |
|------|---|------|
| `LICENSE_SIGNING_PRIVATE_KEY` | RS256 PKCS#8 PEM | JWT 署名 |

### 取得方法

`rayven-license-signer/prod` プロジェクトから値をコピー（既存）。

```bash
# 値を取得
TOKEN=$(infisical user get token --plain)
PRIVATE_KEY=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://secrets.rayven.cloud/api/v3/secrets/raw/LICENSE_SIGNING_PRIVATE_KEY?workspaceId=fe22917e-a624-43be-a8ca-0ff6e90851b6&environment=prod" \
  | jq -r '.secret.secretValue')

# tenant-console プロジェクトに投入
curl -sX POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://secrets.rayven.cloud/api/v3/secrets/raw/LICENSE_SIGNING_PRIVATE_KEY" \
  -d "{
    \"workspaceId\":\"<tenant-console-project-id>\",
    \"environment\":\"prod\",
    \"type\":\"shared\",
    \"secretValue\":\"$PRIVATE_KEY\"
  }"
```

### Helm chart 側の対応

`infra/k3s/helm/tenant-console/values.yaml` の Infisical secretsPath / project は変更不要（既存パスに `LICENSE_SIGNING_PRIVATE_KEY` を追加するのみ）。

InfisicalSecret CRD が同期する k8s Secret に `LICENSE_SIGNING_PRIVATE_KEY` キーが含まれるようになる。Deployment 側は `envFrom: secretRef` で全キーを env に投入するため、コード変更不要。

---

## 🖥️ UI 設計

### ページ構成

```
/                        … 既存ホーム
/tenants                 … 既存テナント一覧
/tenants/[id]            … テナント詳細（ライセンス一覧タブ追加）
/tenants/new             … 既存テナント作成
/licenses                … 新規 ライセンス一覧（PERSONAL + TENANT 両方）
/licenses/new            … 新規 ライセンス発行フォーム
```

### `/licenses` 一覧画面

- **タブ**: `すべて` / `個人` / `テナント` / `失効済み`
- **検索**: subject / notes で部分一致
- **テーブル列**:
  - subject（メール or テナント名）
  - type（PERSONAL/TENANT バッジ）
  - features（コンマ区切り）
  - 状態（ACTIVE/EXPIRED/REVOKED バッジ + 期限残日数）
  - 発行日 / 有効期限
  - アクション（詳細表示 / 失効）
- **「ライセンス発行」ボタン** → `/licenses/new`

### `/licenses/new` 発行フォーム

```
┌──────────────────────────────────────┐
│ ライセンス発行                          │
├──────────────────────────────────────┤
│ ◯ 個人ライセンス                        │
│ ◯ テナントライセンス                    │
│                                       │
│ [type=個人の場合]                      │
│   メールアドレス: [_______________]    │
│                                       │
│ [type=テナントの場合]                  │
│   テナント: [プルダウン: tenant 一覧]  │
│                                       │
│ 機能（複数選択可）:                    │
│   ☑ dynamic-search                    │
│   ☐ pii-dashboard                     │
│   ☐ ...                               │
│                                       │
│ プラン（任意）: [_______________]      │
│ 有効期限: [90 日 ▼] (1〜730)          │
│ メモ: [____________________________]  │
│                                       │
│   [キャンセル]   [発行する]            │
└──────────────────────────────────────┘
```

### 発行直後の JWT 表示モーダル

```
┌──────────────────────────────────────┐
│ ✅ ライセンスを発行しました              │
├──────────────────────────────────────┤
│ ⚠️  このキーは今だけ表示されます         │
│    再表示はできません。安全な経路で      │
│    顧客に送付してください。              │
│                                       │
│ ┌─────────────────────────────────┐ │
│ │ tumiki_lic_eyJhbGciOi...         │ │
│ └─────────────────────────────────┘ │
│                                       │
│   [📋 コピー]   [✕ 閉じる]            │
└──────────────────────────────────────┘
```

設計上の注意:
- 閉じる前に確実にコピーさせるため、コピー前は閉じれない（or 警告 confirm）
- DB には JWT 本体は保存しないため、再表示は本当に不可能（仕様明示）

### `/tenants/[id]` 詳細ページへの追加

既存のテナント詳細にタブ追加:

```
[基本情報] [ライセンス] [操作履歴]
              ↑
          ここを追加
```

「ライセンス」タブ:
- 当該テナント紐付けライセンスのみ表示（`?tenantId=xxx`）
- 「このテナント用に発行」ボタン → `/licenses/new?tenantId=xxx&type=TENANT`

---

## 🛡️ セキュリティ考慮事項

### 1. 認証・認可（後追い）

現状 tenant-console には認証がない（PoC 段階）。本機能を実装する際、以下を検討:

- **PoC では Cloudflare Access 等の認証プロキシで保護**
- **将来的には NextAuth / Keycloak 連携**（既存 Tumiki Keycloak 流用）
- 発行操作は監査ログに記録（`License.issuedByEmail`）

### 2. JWT 秘密鍵の取り扱い

- `LICENSE_SIGNING_PRIVATE_KEY` は **Infisical のみで管理**（DB・コード・Git に保存しない）
- メモリ上で取得 → 署名 → 即座に解放
- ファイルシステム書き込みは原則禁止

### 3. JWT 本体の DB 保存禁止

- JWT 本体は発行直後の API レスポンスでのみ返す
- DB には `jti` のみ保存
- 発行担当者がコピーを失敗した場合は **「失効 + 再発行」** の運用

### 4. 失効リスト（CRL）の運用

- `license.revoke` で `status: REVOKED` に更新
- tumiki-cloud-api 側は CRL を持たない（現状）
- **失効を即時反映するには CRL エンドポイント実装が必要**（Phase 2）
- 現状の運用は「TTL 短め発行 + 漏洩時は次回更新時に拒否」で代替

### 5. Rate Limit

- 同一 subject に対する連続発行を 1 回/分に制限（任意）
- フォームの二重送信は React 側で防止（既存パターン）

### 6. ログ

- 発行・失効操作はアプリログに WARN レベルで記録
- 含める項目: subject, type, features, jti, 操作者
- **token 本体はログに出さない**

---

## 📦 実装スコープと PR 分割案

実装フェーズの提案（tenant-console の他作業と競合しないよう小さく分割）:

### PR 1: スキーマ + バックエンド（小〜中）

- `License` モデル追加（`schema/license.prisma`）
- Prisma マイグレーション
- tRPC: `issue` / `list` / `get` / `revoke`
- Infisical の `LICENSE_SIGNING_PRIVATE_KEY` 投入手順をドキュメント化
- ユニットテスト（vitest）

### PR 2: 一覧 + 発行フォーム UI（中）

- `/licenses` ページ
- `IssueLicenseForm.tsx`
- `LicenseTable.tsx`
- `LicenseDisplayModal.tsx`（発行後の JWT 表示）

### PR 3: テナント詳細統合（小）

- `/tenants/[id]` にライセンスタブ追加
- 「このテナント用に発行」ショートカット

### PR 4 (任意): CRL エンドポイント（小）

- `license.checkRevocation` クエリ
- tumiki-cloud-api 側に失効チェックミドルウェア追加（別 PR）

---

## 📊 推定工数

| PR | 内容 | 工数目安 |
|----|------|---------|
| 1 | スキーマ + tRPC + テスト | 4 時間 |
| 2 | 一覧 + 発行フォーム UI | 4 時間 |
| 3 | テナント詳細統合 | 1.5 時間 |
| 4 | CRL（任意） | 2 時間 |
| **合計** | | **約 9.5〜11.5 時間** |

---

## ❓ Open Questions

実装着手前に確定したい論点:

1. **認証の扱い**: tenant-console の認証ガードはこの PR の前提条件にするか、後追いで OK か
2. **発行者の特定**: `issuedByEmail` を必須にするか（認証導入のタイミングと連動）
3. **テナント側 internal-manager との関係**:
   - tenant-console で発行した TENANT ライセンスを、internal-manager から参照するインターフェース
   - 現状 tenant-console と internal-manager は DB が分離されている
   - 内部 API（mTLS or 専用エンドポイント）が必要か、それとも tenant-console から直接 internal-manager の DB に書き込むか
4. **PERSONAL ライセンスの将来**: tenant-console は本来「テナント管理」のためのアプリ。個人ライセンスを扱う UI を増やすか、別アプリにするか
5. **既存 CLI スクリプトの位置づけ**: 緊急時 fallback として残すか、UI 完成後に削除するか

---

## 🔗 関連ドキュメント・リソース

- [tumiki-cloud-api PR #1134](https://github.com/rayven122/tumiki/pull/1134) — JWT 検証側の実装
- [scripts/issue-license.ts](../../../scripts/issue-license.ts) — 既存 CLI 発行スクリプト
- [packages/license](../../../packages/license/) — ライセンス機能チェッカー
- [infra/k3s/README.md](../../../infra/k3s/README.md) — Infisical / k3s デプロイ手順
- Infisical projects:
  - `tenant-console` — tenant-console 本体の env
  - `tumiki-cloud-api` — JWT 検証用 `LICENSE_PUBLIC_KEY`
  - `rayven-license-signer` — JWT 署名用 `LICENSE_SIGNING_PRIVATE_KEY`（コピー元）

---

## 🗓️ 改訂履歴

| 日付 | バージョン | 内容 |
|------|----------|------|
| 2026-05-01 | 0.1 | 初版作成 |
