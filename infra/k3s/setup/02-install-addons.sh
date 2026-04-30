#!/bin/bash
# アドオンインストールスクリプト
# Infisical Kubernetes Operator + Reloader
# ※ TLSはCloudflare Tunnelが担うため cert-manager は不要
# 前提条件: k3s が起動済み、helm がインストール済み

set -euo pipefail

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

INFISICAL_OPERATOR_VERSION="0.10.32"

# ----------------------------------------
# helm インストール（未インストールの場合）
# ----------------------------------------
if ! command -v helm &>/dev/null; then
  echo "=== helm インストール ==="
  curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
fi

# ----------------------------------------
# Infisical Kubernetes Operator
# ----------------------------------------
echo "=== Infisical Kubernetes Operator インストール (${INFISICAL_OPERATOR_VERSION}) ==="
helm repo add infisical-helm-charts 'https://dl.cloudsmith.io/public/infisical/helm-charts/helm/charts/'
helm repo update

helm upgrade --install infisical-operator infisical-helm-charts/secrets-operator \
  --version "${INFISICAL_OPERATOR_VERSION}" \
  --namespace infisical-operator \
  --create-namespace \
  --wait

echo "  Infisical Operator インストール完了"

# ----------------------------------------
# Reloader（Secret変更時にPodを自動再起動）
# ----------------------------------------
echo "=== Reloader インストール ==="
helm repo add stakater https://stakater.github.io/stakater-charts
helm repo update

helm upgrade --install reloader stakater/reloader \
  --namespace reloader \
  --create-namespace \
  --wait

echo "  Reloader インストール完了"

echo ""
echo "=== 全アドオンのインストール完了 ==="
echo "次のステップ:"
echo "  1. Cloudflare Zero Trust でトンネルを作成しトークンを取得"
echo "  2. infra/k3s/manifests/cloudflare-tunnel/ のマニフェストを適用"
echo "  3. infra/k3s/manifests/hosting-console/namespace.yaml を適用"
