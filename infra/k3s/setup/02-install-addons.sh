#!/bin/bash
# アドオンインストールスクリプト
# Infisical Kubernetes Operator + Reloader
# ※ TLSはCloudflare Tunnelが担うため cert-manager は不要
# 前提条件: k3s が起動済み、helm がインストール済み

set -euo pipefail

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

INFISICAL_OPERATOR_VERSION="0.10.32"
RELOADER_VERSION="1.3.0"

# ----------------------------------------
# helm インストール（未インストールの場合）
# ----------------------------------------
if ! command -v helm &>/dev/null; then
  echo "=== helm インストール ==="
  HELM_VERSION="3.20.2"
  HELM_SHA256="258e830a9e613c8a7a302d6059b4bb3b9758f2f3e1bb8ea0d707ce10a9a72fea"
  curl -fsSL "https://get.helm.sh/helm-v${HELM_VERSION}-linux-amd64.tar.gz" -o /tmp/helm.tar.gz
  echo "${HELM_SHA256}  /tmp/helm.tar.gz" | sha256sum -c -
  tar -zxf /tmp/helm.tar.gz -C /tmp linux-amd64/helm
  sudo mv /tmp/linux-amd64/helm /usr/local/bin/helm
  rm -rf /tmp/linux-amd64 /tmp/helm.tar.gz
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
  --version "${RELOADER_VERSION}" \
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
