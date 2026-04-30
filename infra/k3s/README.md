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
# パブリックIPは環境変数で明示指定（必須）
PUBLIC_IP=<VM-PUBLIC-IP> ./infra/k3s/setup/01-install-k3s.sh
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

実運用では `tenant-console` が以下と同等の処理を tRPC 経由で自動実行する。

```bash
# 1. Infisical でテナント用プロジェクトを作成しシークレットを登録
#    キー: OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET,
#          INTERNAL_DATABASE_URL, POSTGRES_PASSWORD, AUTH_SECRET, NEXTAUTH_URL

# 2. テナント Namespace を事前作成（Helm install 前に必要）
kubectl create namespace tenant-company-a

# 3. Infisical Machine Identity の認証情報を k8s Secret として事前作成
#    （--set 経由だと Helm リリース値に保存されるため、Secret を経由する設計）
kubectl create secret generic infisical-machine-identity \
  --namespace tenant-company-a \
  --from-literal=clientId=<INFISICAL_CLIENT_ID> \
  --from-literal=clientSecret=<INFISICAL_CLIENT_SECRET>

# 4. Helm install
helm install company-a ./infra/k3s/helm/internal-manager \
  --set tenant.slug=company-a \
  --set tenant.domain=company-a-manager.tumiki.cloud \
  --set infisical.projectSlug=tenant-company-a \
  --set image.tag=<IMAGE_TAG>

# 5. 状態確認
kubectl get all -n tenant-company-a
```

## テナント削除手順

`templates/namespace.yaml` に `helm.sh/resource-policy: keep` アノテーションを付与しているため、
`helm uninstall` だけでは Namespace と PVC は残る。完全削除には以下を実行する。

```bash
# 1. Helm リリース削除（Deployment / Service / Ingress 等を削除）
helm uninstall company-a -n tenant-company-a

# 2. Namespace 削除（PVC・Secret 等の残留リソースも一括削除）
kubectl delete namespace tenant-company-a
```

> **Note**: Namespace 削除はテナントの DB データを完全消去する破壊的操作。
> バックアップを取得した上で実行すること。

## Infisical プロジェクト構成

テナントごとに Infisical プロジェクト（`tenant-{slug}`）を作成し、以下を登録:

| キー | 説明 |
|------|------|
| `OIDC_ISSUER` | OIDCプロバイダーのIssuer URL |
| `OIDC_CLIENT_ID` | OIDCクライアントID |
| `OIDC_CLIENT_SECRET` | OIDCクライアントシークレット |
| `INTERNAL_DATABASE_URL` | `postgresql://app:<PW>@postgresql.tenant-{slug}.svc.cluster.local:5432/internal_manager` |
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
