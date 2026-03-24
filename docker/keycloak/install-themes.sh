#!/bin/bash
# Keycloakテーマインストールスクリプト
# tumikiテーマの親テーマ（keywind）をダウンロード・ビルド
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THEMES_DIR="$SCRIPT_DIR/themes"
KEYWIND_DIR="$THEMES_DIR/keywind"

# keywindテーマが既に存在する場合はスキップ
if [[ -d "$KEYWIND_DIR" && -f "$KEYWIND_DIR/login/dist/index.css" ]]; then
    echo "✓ keywindテーマは既にインストール済みです"
    exit 0
fi

echo "=== Keycloakテーマをインストール中 ==="

# 一時ディレクトリを作成
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# keywindテーマをダウンロード
echo "keywindテーマをダウンロード中..."
git clone --depth 1 --quiet https://github.com/lukin/keywind.git "$TEMP_DIR/keywind-repo"
cd "$TEMP_DIR/keywind-repo"

# 依存関係をインストール（npmまたはpnpmを使用）
echo "依存関係をインストール中..."
if command -v pnpm >/dev/null 2>&1; then
    pnpm install --silent --ignore-scripts 2>/dev/null || npm install --silent --ignore-scripts
else
    npm install --silent --ignore-scripts
fi

# TypeScriptのチェックをスキップしてビルド（viteのみ使用）
echo "テーマをビルド中（型チェックなし）..."
npx vite build 2>/dev/null || {
    echo "⚠ ビルドに失敗しましたが、既存のファイルをコピーします"
}

# ビルド済みテーマをコピー
mv "$TEMP_DIR/keywind-repo/theme/keywind" "$KEYWIND_DIR"

# dist ディレクトリが存在しない場合は警告
if [[ ! -d "$KEYWIND_DIR/login/dist" ]]; then
    echo "⚠ 警告: dist ディレクトリが生成されませんでした"
    echo "   tumikiテーマは動作しない可能性があります"
else
    echo "✓ keywindテーマをインストールしました: $KEYWIND_DIR"
fi

echo "=== テーマインストール完了 ==="
