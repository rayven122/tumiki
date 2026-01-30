#!/bin/bash
# Keycloak Keywindテーマのセットアップ
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KEYWIND_DIR="$PROJECT_ROOT/docker/keycloak/themes/keywind"

# 既に存在する場合はスキップ
if [ -d "$KEYWIND_DIR" ]; then
  echo "✓ Keywindテーマは既に存在します"
  exit 0
fi

echo "Keywindテーマをダウンロード中..."

# クローンしてビルド
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

git clone --depth 1 https://github.com/lukin/keywind "$TEMP_DIR/keywind"
cd "$TEMP_DIR/keywind"
pnpm install
npx vite build 2>/dev/null || true

# テーマをコピー
mkdir -p "$(dirname "$KEYWIND_DIR")"
cp -r theme/keywind "$KEYWIND_DIR"
echo "✓ Keywindテーマをインストールしました"
