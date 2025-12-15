# Tumiki MCP プロキシ ベンチマーク

Tumiki MCP プロキシサーバーと Context7 直接接続のレスポンスタイムを Vegeta で測定し、パフォーマンスを比較します。

## 概要

本番環境で稼働している Tumiki MCP プロキシ経由の接続と、Context7 へ直接接続した場合のレスポンスタイムを測定し、プロキシオーバーヘッドを定量化します。

**測定対象:**

- Tumiki MCP プロキシ: `https://mcp.tumiki.cloud/mcp/cmioqjsvh0005jx04uce4t5a2`
- Context7 直接接続: `https://mcp.context7.com/mcp`

**測定メソッド:**

- `tools/list`: ツール一覧取得
- `tools/call`: ツール実行（resolve-library-id）

## 前提条件

### 必須ツール

```bash
# Vegeta インストール
brew install vegeta

# jq インストール（JSON レポート解析用）
brew install jq
```

### その他

- 本番環境への負荷テスト承認
- **注意**: Context7 は API キー不要（認証なし）

## 実行方法

### 完全比較ベンチマーク

```bash
cd apps/mcp-proxy
pnpm benchmark
```

このコマンドで以下が自動実行されます:

1. **Tumiki プロキシのベンチマーク**
   - ウォームアップ（10秒 @ 5 req/s）
   - 負荷テスト（30秒 @ 10 req/s）
   - tools/list, tools/call の両方を測定

2. **Context7 直接接続のベンチマーク**
   - ウォームアップ（10秒 @ 5 req/s）
   - 負荷テスト（30秒 @ 10 req/s）
   - tools/list, tools/call の両方を測定

3. **比較レポート生成**
   - Tumiki vs Context7 の並列比較表
   - プロキシオーバーヘッドの定量化

## 設定変更

`benchmark/config/.env.benchmark` を編集して負荷率やテスト時間を変更できます:

```bash
# 負荷設定
LOAD_RATE="10"          # req/s（デフォルト: 10）
LOAD_DURATION="30s"     # テスト時間（デフォルト: 30秒）

# ストレステスト設定
STRESS_RATE="20"        # req/s（デフォルト: 20）
STRESS_DURATION="60s"   # テスト時間（デフォルト: 60秒）
```

**注意**: 本番環境へのテストなので、過度な負荷は避けてください。

## 結果の確認

ベンチマーク実行後、結果は `benchmark/results/{timestamp}/` に保存されます:

```
results/20250114_120000/
├── comparison-summary.txt           # 比較サマリー（推奨）
├── tumiki-proxy/
│   └── load/
│       ├── tools-list-report.txt    # テキストレポート
│       ├── tools-list-report.json   # JSON レポート
│       ├── tools-list-hist.txt      # ヒストグラム
│       ├── tools-call-report.txt
│       ├── tools-call-report.json
│       └── tools-call-hist.txt
└── context7-direct/
    └── load/
        ├── tools-list-report.txt
        ├── tools-list-report.json
        ├── tools-list-hist.txt
        ├── tools-call-report.txt
        ├── tools-call-report.json
        └── tools-call-hist.txt
```

### 比較サマリーの見方

```bash
cat benchmark/results/{timestamp}/comparison-summary.txt
```

出力例:

```
【tools/list】
                    Tumiki          Context7       差分
平均レイテンシ      250.5 ms        200.3 ms       +25.1%
P50                 230.0 ms        180.0 ms       +27.8%
P95                 350.0 ms        300.0 ms       +16.7%
P99                 500.0 ms        450.0 ms       +11.1%
スループット        9.8 req/s       9.9 req/s
成功率              100%            100%

【結論】
プロキシオーバーヘッド (tools/list): 平均 +25.1%
プロキシオーバーヘッド (tools/call): 平均 +30.5%
```

### 主要メトリクス

- **平均レイテンシ**: すべてのリクエストの平均応答時間
- **P50 (中央値)**: 50%のリクエストがこの時間以下で完了
- **P95**: 95%のリクエストがこの時間以下で完了
- **P99**: 99%のリクエストがこの時間以下で完了
- **スループット**: 1秒あたりの処理リクエスト数
- **成功率**: エラーなく完了したリクエストの割合

## トラブルシューティング

### Vegeta がインストールされていない

```bash
brew install vegeta
```

### jq がインストールされていない

```bash
brew install jq
```

### エラー率が高い

本番環境への負荷が高すぎる可能性があります。`.env.benchmark` で以下を調整してください:

```bash
LOAD_RATE="5"   # より控えめに
```

### 本番環境への負荷に関する注意事項

**重要**: 本番環境に対する負荷テストなので、以下に注意してください:

1. **低トラフィック時間帯に実行**
   - 深夜や早朝など、ユーザー利用が少ない時間帯を推奨

2. **エラー率のモニタリング**
   - エラー率が上昇したら即座に中断
   - Cloud Run のメトリクスを並行監視

3. **事前通知**
   - 関係者に負荷テスト実行を事前に通知

4. **段階的な負荷増加**
   - 初回は少ない負荷（5 req/s）から開始
   - 問題がなければ段階的に増やす

## ベンチマークの仕組み

### Vegeta について

Vegeta は Go 言語で書かれた HTTP 負荷テストツールです。このベンチマークでは以下の機能を使用しています:

- **Attack モード**: 指定した負荷率（req/s）でリクエストを送信
- **レポート生成**: テキスト、JSON、ヒストグラムの3形式でレポート出力
- **タイムアウト設定**: 30秒（`REQUEST_TIMEOUT`）でタイムアウト

### ベンチマークフロー

```
1. セットアップ
   ├─ Vegeta インストール確認
   ├─ jq インストール確認
   ├─ 環境変数読み込み
   └─ 結果ディレクトリ作成

2. Tumiki プロキシのベンチマーク
   ├─ ウォームアップ
   │  ├─ tools/list (10秒 @ 5 req/s)
   │  └─ tools/call (10秒 @ 5 req/s)
   ├─ クールダウン (5秒)
   └─ 負荷テスト
      ├─ tools/list (30秒 @ 10 req/s)
      └─ tools/call (30秒 @ 10 req/s)

3. クールダウン (10秒)

4. Context7 直接接続のベンチマーク
   ├─ ウォームアップ
   │  ├─ tools/list (10秒 @ 5 req/s)
   │  └─ tools/call (10秒 @ 5 req/s)
   ├─ クールダウン (5秒)
   └─ 負荷テスト
      ├─ tools/list (30秒 @ 10 req/s)
      └─ tools/call (30秒 @ 10 req/s)

5. 比較レポート生成
   └─ jq で JSON レポートを解析し比較表を生成
```

### ウォームアップの重要性

ウォームアップは以下の理由で重要です:

- **JIT コンパイラの最適化**: JavaScript エンジンのコード最適化
- **キャッシュの準備**: プロキシサーバーのキャッシュ準備
- **コールドスタートの排除**: Cloud Run インスタンスのウォームアップ

## 参考リンク

- [Vegeta GitHub](https://github.com/tsenart/vegeta)
- [Vegeta Usage](https://github.com/tsenart/vegeta#usage)
- [Context7 MCP Server](https://mcp.context7.com/mcp)
