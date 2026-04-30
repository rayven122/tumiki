# k3s インフラ構成

tumiki internal-manager のマルチテナントホスティング環境。

## トラフィックフロー

```
インターネット
      ↓ HTTPS（Cloudflare EdgeがTLS終端）
Cloudflare Edge
      ↓ Cloudflare Tunnel（アウトバウンド接続、暗号化済み）
cloudflared Pod（k3s内）
      ↓ HTTP（クラスター内）
Traefik Ingress
      ↓ ホスト名でルーティング
各テナントの internal-manager Pod
```

## 構成図

```
tumiki-k3s VM（さくらのクラウド / 8GB RAM / 4vCPU / 200GB SSD）
├── Namespace: cloudflare-tunnel
│   └── cloudflared Pod × 2（Cloudflare Tunnelコネクタ）
│
├── Namespace: kube-system
│   └── Traefik Ingress Controller（k3s built-in）
│
├── Infisical Kubernetes Operator（全Namespace監視・シークレット同期）
├── Reloader（Secret更新時にPodを自動再起動）
│
├── Namespace: tenant-console（コントロールパネル）
│   ├── tenant-console Pod
│   └── PostgreSQL（テナントメタデータ）
│
└── Namespace: tenant-{slug}（テナントごと）
    ├── InfisicalSecret CRD → k8s Secret（Infisicalから自動同期）
    ├── internal-manager Pod（envFromでSecretを参照）
    └── PostgreSQL StatefulSet（テナント専用DB）
```

## セットアップ手順

### 1. さくらのクラウドで VM を作成

- スペック: 8GB RAM / 4vCPU / 200GB SSD
- OS: Ubuntu 22.04 LTS
- tumiki プライベートゾーン（192.168.0.x）に接続
- グローバル IP は kubectl 管理用に付与（HTTP/HTTPS の受信は不要）

### 2. k3s インストール

```bash
ssh user@<VM-IP>
chmod +x infra/k3s/setup/01-install-k3s.sh
./infra/k3s/setup/01-install-k3s.sh
```

### 3. アドオンインストール

```bash
./infra/k3s/setup/02-install-addons.sh
```

### 4. Cloudflare Tunnel セットアップ

tumiki-main で稼働中の既存トンネル（tumiki-sakura-prod）を共用する。
k3s 内への cloudflared デプロイは不要。

**設定済み内容（Cloudflare API で適用済み）:**
- DNS: `*.tumiki.cloud` CNAME → `b8966794-798c-46ff-af2d-d474eedbc43e.cfargotunnel.com`
- Tunnel ingress: `*.tumiki.cloud` → `http://192.168.0.20:30080`（Traefik NodePort）

**テナント URL 形式:** `{slug}-manager.tumiki.cloud`（例: `company-a-manager.tumiki.cloud`）

### 5. tenant-console Namespace 作成

```bash
kubectl apply -f infra/k3s/manifests/tenant-console/namespace.yaml
```

## テナント手動デプロイ（動作確認用）

```bash
# 1. Infisical でテナント用プロジェクトを作成しシークレットを登録
#    キー: OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET,
#          INTERNAL_DATABASE_URL, POSTGRES_PASSWORD, AUTH_SECRET, NEXTAUTH_URL

# 2. Helm install（Machine Identity 認証情報を --set で渡す）
helm install company-a ./infra/k3s/helm/internal-manager \
  --set tenant.slug=company-a \
  --set tenant.domain=company-a-manager.tumiki.cloud \
  --set infisical.projectSlug=tenant-company-a \
  --set infisical.clientId=<INFISICAL_CLIENT_ID> \
  --set infisical.clientSecret=<INFISICAL_CLIENT_SECRET> \
  --set image.tag=<IMAGE_TAG>

# 4. 状態確認
kubectl get all -n tenant-company-a
```

## Infisical プロジェクト構成

テナントごとに Infisical プロジェクト（`tenant-{slug}`）を作成し、以下を登録:

| キー | 説明 |
|------|------|
| `OIDC_ISSUER` | OIDCプロバイダーのIssuer URL |
| `OIDC_CLIENT_ID` | OIDCクライアントID |
| `OIDC_CLIENT_SECRET` | OIDCクライアントシークレット |
| `INTERNAL_DATABASE_URL` | `postgresql://postgres:<PW>@postgresql.tenant-{slug}.svc.cluster.local:5432/internal_manager` |
| `POSTGRES_PASSWORD` | PostgreSQLパスワード（`openssl rand -base64 32` で生成） |
| `AUTH_SECRET` | NextAuthシークレット（`openssl rand -base64 32` で生成） |
| `NEXTAUTH_URL` | 例: `https://company-a.manager.example.com` |

## ディレクトリ構成

```
infra/k3s/
├── README.md
├── setup/
│   ├── 01-install-k3s.sh               # k3s インストール
│   └── 02-install-addons.sh            # Infisical Operator + Reloader
├── manifests/
│   └── tenant-console/
│       └── namespace.yaml
└── helm/
    └── internal-manager/               # テナント単位の Helm チャート
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
            ├── _helpers.tpl
            ├── namespace.yaml
            ├── resource-quota.yaml
            ├── infisical-secret.yaml   # Infisical → k8s Secret 自動同期
            ├── postgresql-statefulset.yaml
            ├── postgresql-service.yaml
            ├── deployment.yaml         # Reloaderアノテーション付き
            ├── service.yaml
            └── ingress.yaml            # TLSなし（Cloudflare Tunnelが担当）
```
