#!/bin/bash

# スクリプトのディレクトリに移動
cd "$(dirname "$0")"

# ログディレクトリの作成
mkdir -p logs

# ビルドが必要か確認
if [ ! -d "build" ]; then
    echo "ビルドディレクトリが見つかりません。ビルドを実行します..."
    pnpm build
fi

# PM2のインストール確認
if ! command -v pm2 &> /dev/null; then
    echo "PM2がインストールされていません。インストールします..."
    pnpm add -g pm2
fi

# 既存のプロセスを停止
pm2 delete tumiki-proxy-server 2>/dev/null || true

# 環境変数を読み込んでプロセスを開始
pnpm with-env pm2 start ecosystem.config.mjs

# PM2の起動設定（システム再起動時の自動起動）
# 注意: sudoが必要な場合があります
# pm2 startup
# pm2 save

echo "Tumiki Proxy Server が PM2 で起動しました"
echo ""
echo "便利なコマンド:"
echo "  ログを確認: pnpm pm2:logs"
echo "  ステータス確認: pnpm pm2:status"
echo "  再起動: pnpm pm2:restart"
echo ""
echo "システム起動時の自動起動を設定するには:"
echo "  pm2 startup"
echo "  pm2 save"