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
├── Namespace: tumiki-system（RAYVEN 管理の共有サービス）
│   └── tumiki-cloud-api Pod × 2（証明書発行・ライセンス検証 / mTLS）
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

> **Note**: k3s には NetworkPolicy コントローラー（kube-router ベース）が標準搭載されており、
> NetworkPolicy CRD は別途 CNI を導入しなくても機能する。確認は以下:
> ```bash
> kubectl get pods -n kube-system | grep -E "network-policy|kube-router"
> ```

## tumiki-cloud-api（証明書発行サービス）

全テナント Namespace + セルフホスト顧客から参照される共有サービス。
mTLS / Bootstrap Token JWT で認証し、Infisical PKI で X.509 クライアント証明書を発行する。

**ネットワーク経路:**
- 外部（セルフホスト顧客）: Sakura Cloud LoadBalancer (TCP 443) → `tumiki-system/tumiki-cloud-api` Pod（mTLS pass-through）
- クラスター内（k3s silo テナント）: `tumiki-cloud-api-internal.tumiki-system.svc.cluster.local:8443`

**Cloudflare Tunnel は経由しない**: Tunnel は TLS を終端してしまうため mTLS が成立しない。Sakura Cloud LB で TCP pass-through する。

## セットアップ手順

### 1. さくらのクラウドで VM を作成

- スペック: 8GB RAM / 4vCPU / 200GB SSD
- OS: Ubuntu 22.04 LTS
- tumiki プライベートゾーン（192.168.0.x）に接続
- グローバル IP は kubectl 管理用に付与（HTTP/HTTPS の受信は不要）

### 2. リポジトリを VM に配置

```bash
ssh user@<VM-IP>
git clone https://github.com/rayven122/tumiki.git
cd tumiki
```

### 3. k3s インストール

```bash
chmod +x infra/k3s/setup/01-install-k3s.sh
# パブリックIPは環境変数で明示指定（必須）
PUBLIC_IP=<VM-PUBLIC-IP> ./infra/k3s/setup/01-install-k3s.sh
```

### 4. GHCR (プライベートイメージ) の pull 認証

`tumiki-internal-manager` イメージがプライベート公開の場合、k3s containerd に GHCR 認証を設定する。
public 公開の場合はスキップ可。

```bash
# GitHub Personal Access Token (read:packages 権限) を取得
sudo tee /etc/rancher/k3s/registries.yaml > /dev/null <<EOF
configs:
  "ghcr.io":
    auth:
      username: <GITHUB_USERNAME>
      password: <GITHUB_PAT>
EOF
sudo systemctl restart k3s
```

### 5. アドオンインストール

```bash
./infra/k3s/setup/02-install-addons.sh
```

### 6. Cloudflare Tunnel セットアップ

tumiki-main で稼働中の既存トンネル（tumiki-sakura-prod）を共用する。
k3s 内への cloudflared デプロイは不要。

**設定済み内容（Cloudflare API で適用済み）:**
- DNS: `*.tumiki.cloud` CNAME → `b8966794-798c-46ff-af2d-d474eedbc43e.cfargotunnel.com`
- Tunnel ingress: `*.tumiki.cloud` → `http://192.168.0.20:30080`（Traefik NodePort）

**テナント URL 形式:** `{slug}-manager.tumiki.cloud`（例: `company-a-manager.tumiki.cloud`）

### 7. tenant-console のデプロイ

```bash
# Namespace を作成（Helm chart は事前に Namespace が存在することを前提とする）
kubectl apply -f infra/k3s/manifests/tenant-console/namespace.yaml

# Infisical Machine Identity の認証情報を Secret として事前作成
kubectl create secret generic infisical-machine-identity \
  --namespace tenant-console \
  --from-literal=clientId=<INFISICAL_CLIENT_ID> \
  --from-literal=clientSecret=<INFISICAL_CLIENT_SECRET>

# tenant-console を Helm でデプロイ
helm install tenant-console ./infra/k3s/helm/tenant-console \
  --namespace tenant-console \
  --set image.tag=<IMAGE_TAG> \
  --set infisical.projectSlug=tenant-console \
  --set infisical.environment=prod

# Cloudflare Tunnel の ingress に `tenant-console.tumiki.cloud` →
# `http://192.168.0.20:30080` を追加すれば外部からアクセス可能になる

# 状態確認
kubectl get all -n tenant-console
```

**Infisical シークレット（`/tenant-console` パス配下）:**

| キー | 説明 |
|------|------|
| `TENANT_DATABASE_URL` | `postgresql://app:<PW>@postgresql.tenant-console.svc.cluster.local:5432/tenant_console` |
| `POSTGRES_PASSWORD` | PostgreSQL パスワード |
| `AUTH_SECRET` | NextAuth シークレット |

## テナント手動デプロイ（動作確認用）

実運用では `tenant-console` が以下と同等の処理を tRPC 経由で自動実行する。

```bash
# 1. Infisical でテナント用プロジェクトを作成しシークレットを登録
#    キー: OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET,
#          INTERNAL_DATABASE_URL, POSTGRES_PASSWORD, AUTH_SECRET, NEXTAUTH_URL

# 2. Helm で Namespace を作成（templates/namespace.yaml が管理するため kubectl create は不要）
#    --create-namespace は使わずテンプレートに任せ、所有権を Helm で一元管理する
helm install company-a ./infra/k3s/helm/internal-manager \
  --set tenant.slug=company-a \
  --set tenant.domain=company-a-manager.tumiki.cloud \
  --set infisical.projectSlug=tenant-company-a \
  --set infisical.environment=prod \
  --set image.tag=<IMAGE_TAG>

# 3. Infisical Machine Identity の認証情報を k8s Secret として作成
#    Helm install 完了後（Namespace 作成後）に追加する
#    --set 経由だと Helm リリース値に保存されるため、Secret を経由する設計
kubectl create secret generic infisical-machine-identity \
  --namespace tenant-company-a \
  --from-literal=clientId=<INFISICAL_CLIENT_ID> \
  --from-literal=clientSecret=<INFISICAL_CLIENT_SECRET>

# 4. Reloader が Secret 変更を検知して internal-manager Pod を再起動

# 5. 状態確認
kubectl get all -n tenant-company-a
```

> **Note**: `tenant-console` (`apps/tenant-console`) は上記処理を tRPC 経由で実行する際、
> Helm install 前に Namespace を `kubectl create namespace` してから Infisical Secret を先に
> 投入し、その後 `helm install --replace` する設計になっている（Pod 起動時に Secret が必要なため）。

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
| `NEXTAUTH_URL` | 例: `https://company-a-manager.tumiki.cloud` |

## tumiki-cloud-api デプロイ手順

```bash
# 1. Infisical で tumiki-cloud-api 用プロジェクトを作成しシークレットを登録
#    キー: TLS_CERT, TLS_KEY, RAYVEN_CA_CERT,
#          BOOTSTRAP_TOKEN_PUBLIC_KEY,
#          INFISICAL_URL, INFISICAL_API_TOKEN, INFISICAL_CA_ID

# 2. Namespace を先に作成し infisical-machine-identity を事前投入
#    helm install 時点で tumiki-cloud-api-env Secret が存在しないと
#    Pod が CreateContainerConfigError になるため、Operator が認証して同期できる状態を先に整える
kubectl create namespace tumiki-system --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic infisical-machine-identity \
  --namespace tumiki-system \
  --from-literal=clientId=<INFISICAL_CLIENT_ID> \
  --from-literal=clientSecret=<INFISICAL_CLIENT_SECRET>

# 3. Helm で Deployment + Service を作成（Namespace は手順2で作成済み）
helm install tumiki-cloud-api ./infra/k3s/helm/tumiki-cloud-api \
  --set infisical.projectSlug=tumiki-cloud-api \
  --set infisical.environment=prod \
  --set image.tag=<IMAGE_TAG>

# 4. 状態確認
kubectl get all -n tumiki-system
kubectl get svc tumiki-cloud-api -n tumiki-system  # EXTERNAL-IP を確認
```

> **Note**: Helm install 前に Secret を投入することで Infisical Operator が `tumiki-cloud-api-env`
> Secret を即座に同期し、Pod が初回起動から成功する。投入順序を逆にすると Pod が
> `CreateContainerConfigError` になり、Secret 同期後に自動回復するまで数十秒の不整合状態になる。

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
    ├── internal-manager/               # テナント単位の Helm チャート
    │   ├── Chart.yaml
    │   ├── values.yaml
    │   └── templates/
    │       ├── _helpers.tpl
    │       ├── namespace.yaml
    │       ├── resource-quota.yaml
    │       ├── infisical-secret.yaml   # Infisical → k8s Secret 自動同期
    │       ├── postgresql-statefulset.yaml
    │       ├── postgresql-service.yaml
    │       ├── deployment.yaml         # Reloaderアノテーション付き
    │       ├── service.yaml
    │       └── ingress.yaml            # TLSなし（Cloudflare Tunnelが担当）
    ├── tenant-console/                 # テナント管理UI Helm チャート
    │   ├── Chart.yaml
    │   ├── values.yaml
    │   └── templates/
    │       ├── _helpers.tpl
    │       ├── serviceaccount.yaml     # tRPC API が helm/kubectl 実行する RBAC
    │       ├── deployment.yaml
    │       ├── service.yaml
    │       ├── ingress.yaml
    │       ├── postgresql-statefulset.yaml
    │       ├── postgresql-service.yaml
    │       └── infisical-secret.yaml
    └── tumiki-cloud-api/               # 全テナント共有の証明書発行サービス
        ├── Chart.yaml
        ├── values.yaml
        └── templates/
            ├── _helpers.tpl
            ├── namespace.yaml          # tumiki-system Namespace
            ├── infisical-secret.yaml
            ├── deployment.yaml         # HA: replicas + podAntiAffinity
            ├── service.yaml            # LoadBalancer + ClusterIP の二系統
            ├── network-policy.yaml     # egress: Infisical のみ
            ├── pdb.yaml                # PodDisruptionBudget
            └── hpa.yaml                # HorizontalPodAutoscaler
```
