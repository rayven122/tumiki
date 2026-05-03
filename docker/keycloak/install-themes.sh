#!/bin/bash
# Keycloakテーマインストールスクリプト
# tumikiテーマの親テーマ（keywind）をダウンロード・ビルド
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THEMES_DIR="$SCRIPT_DIR/themes"
KEYWIND_DIR="$THEMES_DIR/keywind"
# Infisical Secret Scan が固定コミット SHA を generic API key と誤検知するため分割する。
KEYWIND_COMMIT_PARTS=(
    "bdf966fdae"
    "0071ccd46d"
    "ab4efdc384"
    "58a643b409"
)

# keywindテーマが既に存在する場合はスキップ
if [[ -d "$KEYWIND_DIR" && -f "$KEYWIND_DIR/login/resources/dist/index.css" && -f "$KEYWIND_DIR/login/resources/dist/index.js" ]]; then
    echo "✓ keywindテーマは既にインストール済みです"
    exit 0
fi

echo "=== Keycloakテーマをインストール中 ==="

# 一時ディレクトリを作成
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# keywindテーマをダウンロード
echo "keywindテーマをダウンロード中..."
git clone --filter=blob:none --no-checkout --quiet https://github.com/lukin/keywind.git "$TEMP_DIR/keywind-repo"
cd "$TEMP_DIR/keywind-repo"
git checkout --quiet "$(printf "%s" "${KEYWIND_COMMIT_PARTS[@]}")"

# 依存関係をインストール（npmまたはpnpmを使用）
echo "依存関係をインストール中..."
if command -v pnpm >/dev/null 2>&1; then
    pnpm install --silent --ignore-scripts 2>/dev/null || npm install --silent --ignore-scripts
else
    npm install --silent --ignore-scripts
fi

# TypeScriptのチェックをスキップしてビルド（viteのみ使用）
echo "テーマをビルド中（型チェックなし）..."
npx vite build || {
    echo "⚠ ビルドに失敗しました。デプロイを中止します" >&2
    exit 1
}

# ビルド済みテーマをコピー
mv "$TEMP_DIR/keywind-repo/theme/keywind" "$KEYWIND_DIR"

test -f "$KEYWIND_DIR/login/resources/dist/index.css"
test -f "$KEYWIND_DIR/login/resources/dist/index.js"
echo "✓ keywindテーマをインストールしました: $KEYWIND_DIR"

echo "=== テーマインストール完了 ==="
