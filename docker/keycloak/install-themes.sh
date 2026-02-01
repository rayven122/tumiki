#!/bin/bash
# Keycloakテーマインストールスクリプト
# tumikiテーマの親テーマ（keywind）をダウンロード
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THEMES_DIR="$SCRIPT_DIR/themes"
KEYWIND_DIR="$THEMES_DIR/keywind"

# keywindテーマが既に存在する場合はスキップ
if [[ -d "$KEYWIND_DIR" ]]; then
    echo "✓ keywindテーマは既にインストール済みです"
    exit 0
fi

echo "=== Keycloakテーマをインストール中 ==="

# keywindテーマをダウンロード
echo "keywindテーマをダウンロード中..."
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

git clone --depth 1 --quiet https://github.com/lukin/keywind.git "$TEMP_DIR/keywind-repo"
mv "$TEMP_DIR/keywind-repo/theme/keywind" "$KEYWIND_DIR"

echo "✓ keywindテーマをインストールしました: $KEYWIND_DIR"
echo "=== テーマインストール完了 ==="
