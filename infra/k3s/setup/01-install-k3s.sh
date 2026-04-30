#!/bin/bash
# k3s インストールスクリプト
# 実行対象: tumiki-k3s VM (さくらのクラウド)
# 前提条件: Ubuntu 22.04 LTS, sudo権限あり

set -euo pipefail

# k3s バージョン固定（公式インストーラの INSTALL_K3S_VERSION を使用）
# https://github.com/k3s-io/k3s/releases から選定
K3S_VERSION="${K3S_VERSION:-v1.31.4+k3s1}"

# パブリックIPは環境変数で必須指定（curl ifconfig.me 等の外部IP取得サービスへの依存と MITM リスクを回避）
: "${PUBLIC_IP:?環境変数 PUBLIC_IP を設定してください（例: PUBLIC_IP=203.0.113.10 ./01-install-k3s.sh）}"

# 起動待機の上限秒数（既定: 120秒）
K3S_READY_TIMEOUT="${K3S_READY_TIMEOUT:-120}"

echo "=== k3s インストール開始 ==="
echo "k3s バージョン: ${K3S_VERSION}"
echo "パブリックIP: ${PUBLIC_IP}"

curl -sfL https://get.k3s.io | \
  INSTALL_K3S_VERSION="${K3S_VERSION}" \
  INSTALL_K3S_EXEC="server \
  --write-kubeconfig-mode=600 \
  --disable=servicelb \
  --tls-san=${PUBLIC_IP}" sh -

echo "=== k3s 起動待機中（タイムアウト ${K3S_READY_TIMEOUT}秒）==="
elapsed=0
until kubectl get nodes 2>/dev/null | grep -q " Ready"; do
  if [ "${elapsed}" -ge "${K3S_READY_TIMEOUT}" ]; then
    echo "ERROR: k3s が ${K3S_READY_TIMEOUT}秒以内に Ready になりませんでした" >&2
    kubectl get nodes 2>&1 || true
    exit 1
  fi
  echo "  待機中... (${elapsed}s)"
  sleep 5
  elapsed=$((elapsed + 5))
done

echo "=== k3s インストール完了 ==="
kubectl get nodes

# kubeconfig をホームディレクトリにコピー
mkdir -p ~/.kube
cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sed -i "s|https://127.0.0.1:6443|https://${PUBLIC_IP}:6443|g" ~/.kube/config
chmod 600 ~/.kube/config

echo ""
echo "ローカルからの接続用 kubeconfig:"
echo "  scp user@${PUBLIC_IP}:~/.kube/config ~/.kube/tumiki-k3s.yaml"
echo "  export KUBECONFIG=~/.kube/tumiki-k3s.yaml"
