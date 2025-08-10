# メンテナンスモード運用ガイド

## 概要

本ドキュメントでは、Tumikiのメンテナンスモード機能の使用方法について説明します。
メンテナンスモードは、データベースマイグレーションやシステム更新時に、サービスを一時的に停止する際に使用します。

## メンテナンスモードの機能

### 主な機能
- **環境変数による制御**: 再デプロイ時に自動的にメンテナンスモードが適用
- **IPホワイトリスト**: 管理者のIPアドレスからは通常通りアクセス可能
- **カウントダウン表示**: 終了予定時刻までの残り時間を表示
- **自動リロード**: 5分ごとにメンテナンス状態をチェック
- **503レスポンス**: ProxyServerも適切なHTTPステータスコードを返却

### 対象システム
- Manager（Next.jsアプリケーション）
- ProxyServer（Express API）

## 環境変数の設定

### 必要な環境変数

```bash
# メンテナンスモードの有効/無効
MAINTENANCE_MODE=true

# アクセスを許可するIPアドレス（カンマ区切り）
MAINTENANCE_ALLOWED_IPS="192.168.1.1,10.0.0.1"

# メンテナンス終了予定時刻（ISO8601形式）
MAINTENANCE_END_TIME="2025-01-11T03:00:00Z"

# Next.js用の公開環境変数（カウントダウン表示用）
NEXT_PUBLIC_MAINTENANCE_END_TIME="2025-01-11T03:00:00Z"
```

### 環境変数の説明

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `MAINTENANCE_MODE` | メンテナンスモードのON/OFF | `true` または `false` |
| `MAINTENANCE_ALLOWED_IPS` | 許可するIPアドレスのリスト | `"192.168.1.1,10.0.0.1"` |
| `MAINTENANCE_END_TIME` | メンテナンス終了予定時刻 | `"2025-01-11T03:00:00Z"` |
| `NEXT_PUBLIC_MAINTENANCE_END_TIME` | クライアント側で使用する終了時刻 | 同上 |

## メンテナンスモードの開始手順

### 1. 事前準備

```bash
# 現在の環境変数をバックアップ
cp .env .env.backup

# 管理者のIPアドレスを確認
curl ifconfig.me
```

### 2. 環境変数の設定

`.env`ファイルを編集：

```bash
# メンテナンスモード設定
MAINTENANCE_MODE=true
MAINTENANCE_ALLOWED_IPS="あなたのIPアドレス"
MAINTENANCE_END_TIME="2025-01-11T03:00:00Z"
NEXT_PUBLIC_MAINTENANCE_END_TIME="2025-01-11T03:00:00Z"
```

### 3. Vercel環境変数の更新（Manager用）

```bash
# 環境変数を設定
vercel env add MAINTENANCE_MODE production
# 値: true

vercel env add MAINTENANCE_ALLOWED_IPS production
# 値: 管理者のIPアドレス（カンマ区切り）

vercel env add MAINTENANCE_END_TIME production
# 値: 2025-01-11T03:00:00Z

vercel env add NEXT_PUBLIC_MAINTENANCE_END_TIME production
# 値: 2025-01-11T03:00:00Z
```

### 4. デプロイ実行

```bash
# Vercelへデプロイ（Manager）
vercel --prod

# GCEへデプロイ（ProxyServer）
./apps/proxyServer/deploy-to-gce.sh
```

### 5. メンテナンスモードの確認

1. 一般ユーザーとしてアクセス → メンテナンスページが表示される
2. 管理者IPからアクセス → 通常通りアクセス可能
3. APIエンドポイントへアクセス → 503エラーが返される

## データベースマイグレーションの実施

メンテナンスモードが有効になったら、データベースマイグレーションを実施：

```bash
# データベースマイグレーション実行
cd packages/db
pnpm db:deploy

# マイグレーション状態の確認
pnpm prisma migrate status
```

## メンテナンスモードの終了手順

### 1. 環境変数の無効化

`.env`ファイルを編集：

```bash
# メンテナンスモードを無効化
MAINTENANCE_MODE=false
```

### 2. Vercel環境変数の削除

```bash
# 環境変数を削除
vercel env rm MAINTENANCE_MODE production
vercel env rm MAINTENANCE_ALLOWED_IPS production
vercel env rm MAINTENANCE_END_TIME production
vercel env rm NEXT_PUBLIC_MAINTENANCE_END_TIME production
```

### 3. 再デプロイ

```bash
# Vercelへデプロイ（Manager）
vercel --prod

# GCEへデプロイ（ProxyServer）
./apps/proxyServer/deploy-to-gce.sh
```

### 4. サービス復旧の確認

1. 一般ユーザーとしてアクセス → 通常ページが表示される
2. APIエンドポイントへアクセス → 正常に動作する

## 運用スクリプト（オプション）

### メンテナンス開始スクリプト

`scripts/start-maintenance.sh`を作成：

```bash
#!/bin/bash

# 終了時刻を30分後に設定
END_TIME=$(date -u -d "+30 minutes" +"%Y-%m-%dT%H:%M:%SZ")

# 管理者IPを取得
ADMIN_IP=$(curl -s ifconfig.me)

echo "メンテナンスモードを開始します"
echo "管理者IP: $ADMIN_IP"
echo "終了予定: $END_TIME"

# Vercel環境変数設定
vercel env add MAINTENANCE_MODE production <<< "true"
vercel env add MAINTENANCE_ALLOWED_IPS production <<< "$ADMIN_IP"
vercel env add MAINTENANCE_END_TIME production <<< "$END_TIME"
vercel env add NEXT_PUBLIC_MAINTENANCE_END_TIME production <<< "$END_TIME"

# デプロイ
echo "Vercelへデプロイ中..."
vercel --prod

echo "ProxyServerへデプロイ中..."
./apps/proxyServer/deploy-to-gce.sh

echo "メンテナンスモードが有効になりました"
```

### メンテナンス終了スクリプト

`scripts/end-maintenance.sh`を作成：

```bash
#!/bin/bash

echo "メンテナンスモードを終了します"

# Vercel環境変数削除
vercel env rm MAINTENANCE_MODE production
vercel env rm MAINTENANCE_ALLOWED_IPS production
vercel env rm MAINTENANCE_END_TIME production
vercel env rm NEXT_PUBLIC_MAINTENANCE_END_TIME production

# デプロイ
echo "Vercelへデプロイ中..."
vercel --prod

echo "ProxyServerへデプロイ中..."
./apps/proxyServer/deploy-to-gce.sh

echo "メンテナンスモードが終了しました"
```

## トラブルシューティング

### 無限リダイレクトが発生する場合

middleware.tsの設定を確認：
- `isPublicPath`の判定が正しく`||`演算子を使用しているか
- メンテナンスページ自体へのアクセスが適切に処理されているか

### IPホワイトリストが機能しない場合

1. CloudflareやVercelのCDNを使用している場合、`x-forwarded-for`ヘッダーを確認
2. 環境変数の`MAINTENANCE_ALLOWED_IPS`が正しく設定されているか確認
3. IPアドレスの形式が正しいか確認（IPv4/IPv6）

### メンテナンスページが表示されない場合

1. 環境変数が正しくデプロイされているか確認：
   ```bash
   vercel env ls production
   ```

2. ビルドログを確認：
   ```bash
   vercel logs
   ```

3. ブラウザのキャッシュをクリア

### カウントダウンが表示されない場合

- `NEXT_PUBLIC_MAINTENANCE_END_TIME`が設定されているか確認
- ISO8601形式（`YYYY-MM-DDTHH:MM:SSZ`）で正しく設定されているか確認

## セキュリティ上の注意事項

1. **IPアドレスの管理**
   - 管理者のIPアドレスは機密情報として扱う
   - 動的IPの場合は、VPNの使用を推奨

2. **終了時刻の設定**
   - 余裕を持った終了時刻を設定する
   - 早期終了の場合は、環境変数を更新して再デプロイ

3. **ログの監視**
   - メンテナンス中もアクセスログを監視
   - 不正なアクセス試行を確認

## ベストプラクティス

1. **事前告知**
   - メンテナンス実施の24時間前には告知
   - メール、Slack、ウェブサイトで通知

2. **時間帯の選択**
   - トラフィックが最も少ない時間帯を選択
   - 日本時間の深夜2時〜5時を推奨

3. **バックアップ**
   - データベースのバックアップを事前に取得
   - 環境変数のバックアップを保存

4. **段階的な復旧**
   - 管理者IPで動作確認後、一般公開
   - 問題があれば即座にメンテナンスモードに戻す

5. **事後対応**
   - メンテナンス完了の告知
   - 影響を受けたユーザーへの対応

## 関連ドキュメント

- [ProxyServer デプロイガイド](./proxy-server-deployment.md)
- [データベース設計](../architecture/DB設計.md)
- [セキュリティガイド](../security/README.md)