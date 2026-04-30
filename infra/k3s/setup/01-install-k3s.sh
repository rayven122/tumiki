#!/bin/bash
# k3s インストールスクリプト
# 実行対象: tumiki-k3s VM (さくらのクラウド)
# 前提条件: Ubuntu 22.04 LTS, sudo権限あり

set -euo pipefail

PUBLIC_IP=$(curl -s ifconfig.me)

echo "=== k3s インストール開始 ==="
echo "パブリックIP: ${PUBLIC_IP}"

curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="server \
  --write-kubeconfig-mode=644 \
  --disable=servicelb \
  --tls-san=${PUBLIC_IP}" sh -

echo "=== k3s 起動待機中 ==="
until kubectl get nodes 2>/dev/null | grep -q " Ready"; do
  echo "  待機中..."
  sleep 5
done

echo "=== k3s インストール完了 ==="
kubectl get nodes

# kubeconfig をホームディレクトリにコピー
mkdir -p ~/.kube
cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sed -i "s/127.0.0.1/${PUBLIC_IP}/g" ~/.kube/config
chmod 600 ~/.kube/config

echo ""
echo "ローカルからの接続用 kubeconfig:"
echo "  scp user@${PUBLIC_IP}:~/.kube/config ~/.kube/tumiki-k3s.yaml"
echo "  export KUBECONFIG=~/.kube/tumiki-k3s.yaml"
