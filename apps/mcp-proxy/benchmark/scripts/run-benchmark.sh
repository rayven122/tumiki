#!/usr/bin/env bash
#
# Tumiki MCP プロキシ vs Context7 直接接続 - ベンチマーク実行スクリプト
#
# 使用方法:
#   cd apps/mcp-proxy
#   bash benchmark/scripts/run-benchmark.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# プロジェクトルートに移動（Vegeta がボディファイルを見つけられるようにする）
cd "${PROJECT_ROOT}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Tumiki MCP プロキシ ベンチマーク"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================
# セットアップ
# ============================================

echo "🔧 セットアップ中..."

# 1. Vegeta インストール確認
if ! command -v vegeta &> /dev/null; then
    echo "❌ Vegeta がインストールされていません"
    echo "インストール方法: brew install vegeta"
    exit 1
fi
echo "   ✅ Vegeta $(vegeta --version) が検出されました"

# 2. jq インストール確認
if ! command -v jq &> /dev/null; then
    echo "❌ jq がインストールされていません"
    echo "インストール方法: brew install jq"
    exit 1
fi
echo "   ✅ jq $(jq --version) が検出されました"

# 3. 環境変数読み込み
if [ -f "${PROJECT_ROOT}/benchmark/config/.env.benchmark" ]; then
    source "${PROJECT_ROOT}/benchmark/config/.env.benchmark"
    echo "   ✅ 環境変数を読み込みました"
else
    echo "❌ benchmark/config/.env.benchmark が見つかりません"
    exit 1
fi

# 4. 結果ディレクトリ作成
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULT_OUTPUT_DIR="${RESULTS_DIR}/${TIMESTAMP}"
mkdir -p "${RESULT_OUTPUT_DIR}"/{tumiki-proxy,context7-direct}/{warmup,load}

echo "   ✅ 結果出力先: ${RESULT_OUTPUT_DIR}"
echo ""

# ============================================
# Tumiki プロキシのベンチマーク
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Phase 1: Tumiki プロキシのベンチマーク"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ウォームアップ
echo "🔥 ウォームアップ (${WARMUP_DURATION} @ ${WARMUP_RATE} req/s)..."
echo "   tools/list:"
echo "POST ${TUMIKI_PROXY_URL}
Content-Type: application/json
Accept: application/json, text/event-stream
Tumiki-API-Key: ${TUMIKI_API_KEY}
" | vegeta attack \
  -body="${PROJECT_ROOT}/benchmark/payloads/tools-list.json" \
  -duration="${WARMUP_DURATION}" \
  -rate="${WARMUP_RATE}" \
  -timeout="${REQUEST_TIMEOUT}" \
  -output="${RESULT_OUTPUT_DIR}/tumiki-proxy/warmup/tools-list.bin"
echo "      ✅ 完了"

echo "   tools/call:"
echo "POST ${TUMIKI_PROXY_URL}
Content-Type: application/json
Accept: application/json, text/event-stream
Tumiki-API-Key: ${TUMIKI_API_KEY}
" | vegeta attack \
  -body="${PROJECT_ROOT}/benchmark/payloads/tools-call-tumiki.json" \
  -duration="${WARMUP_DURATION}" \
  -rate="${WARMUP_RATE}" \
  -timeout="${REQUEST_TIMEOUT}" \
  -output="${RESULT_OUTPUT_DIR}/tumiki-proxy/warmup/tools-call.bin"
echo "      ✅ 完了"

# クールダウン
echo "⏱️  クールダウン（5秒）..."
sleep 5

# 負荷テスト
echo "📊 負荷テスト (${LOAD_DURATION} @ ${LOAD_RATE} req/s)..."
echo "   tools/list:"
echo "POST ${TUMIKI_PROXY_URL}
Content-Type: application/json
Accept: application/json, text/event-stream
Tumiki-API-Key: ${TUMIKI_API_KEY}
" | vegeta attack \
  -body="${PROJECT_ROOT}/benchmark/payloads/tools-list.json" \
  -duration="${LOAD_DURATION}" \
  -rate="${LOAD_RATE}" \
  -timeout="${REQUEST_TIMEOUT}" \
  -output="${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-list.bin"

# レポート生成
vegeta report -type=text "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-list.bin" > "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-list-report.txt"
vegeta report -type=json "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-list.bin" > "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-list-report.json"
vegeta report -type=hist[0,10ms,50ms,100ms,200ms,500ms,1s,2s,5s] "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-list.bin" > "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-list-hist.txt"
echo "      ✅ 完了"

echo "   tools/call:"
echo "POST ${TUMIKI_PROXY_URL}
Content-Type: application/json
Accept: application/json, text/event-stream
Tumiki-API-Key: ${TUMIKI_API_KEY}
" | vegeta attack \
  -body="${PROJECT_ROOT}/benchmark/payloads/tools-call-tumiki.json" \
  -duration="${LOAD_DURATION}" \
  -rate="${LOAD_RATE}" \
  -timeout="${REQUEST_TIMEOUT}" \
  -output="${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-call.bin"

# レポート生成
vegeta report -type=text "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-call.bin" > "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-call-report.txt"
vegeta report -type=json "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-call.bin" > "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-call-report.json"
vegeta report -type=hist[0,10ms,50ms,100ms,200ms,500ms,1s,2s,5s] "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-call.bin" > "${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-call-hist.txt"
echo "      ✅ 完了"

echo ""

# ============================================
# クールダウン
# ============================================

echo "⏱️  クールダウン（10秒）..."
sleep 10

# ============================================
# Context7 直接接続のベンチマーク
# ============================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Phase 2: Context7 直接接続のベンチマーク"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ウォームアップ
echo "🔥 ウォームアップ (${WARMUP_DURATION} @ ${WARMUP_RATE} req/s)..."
echo "   tools/list:"
echo "POST ${CONTEXT7_URL}
Content-Type: application/json
Accept: application/json, text/event-stream
" | vegeta attack \
  -body="${PROJECT_ROOT}/benchmark/payloads/tools-list.json" \
  -duration="${WARMUP_DURATION}" \
  -rate="${WARMUP_RATE}" \
  -timeout="${REQUEST_TIMEOUT}" \
  -output="${RESULT_OUTPUT_DIR}/context7-direct/warmup/tools-list.bin"
echo "      ✅ 完了"

echo "   tools/call:"
echo "POST ${CONTEXT7_URL}
Content-Type: application/json
Accept: application/json, text/event-stream
" | vegeta attack \
  -body="${PROJECT_ROOT}/benchmark/payloads/tools-call-context7.json" \
  -duration="${WARMUP_DURATION}" \
  -rate="${WARMUP_RATE}" \
  -timeout="${REQUEST_TIMEOUT}" \
  -output="${RESULT_OUTPUT_DIR}/context7-direct/warmup/tools-call.bin"
echo "      ✅ 完了"

# クールダウン
echo "⏱️  クールダウン（5秒）..."
sleep 5

# 負荷テスト
echo "📊 負荷テスト (${LOAD_DURATION} @ ${LOAD_RATE} req/s)..."
echo "   tools/list:"
echo "POST ${CONTEXT7_URL}
Content-Type: application/json
Accept: application/json, text/event-stream
" | vegeta attack \
  -body="${PROJECT_ROOT}/benchmark/payloads/tools-list.json" \
  -duration="${LOAD_DURATION}" \
  -rate="${LOAD_RATE}" \
  -timeout="${REQUEST_TIMEOUT}" \
  -output="${RESULT_OUTPUT_DIR}/context7-direct/load/tools-list.bin"

# レポート生成
vegeta report -type=text "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-list.bin" > "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-list-report.txt"
vegeta report -type=json "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-list.bin" > "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-list-report.json"
vegeta report -type=hist[0,10ms,50ms,100ms,200ms,500ms,1s,2s,5s] "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-list.bin" > "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-list-hist.txt"
echo "      ✅ 完了"

echo "   tools/call:"
echo "POST ${CONTEXT7_URL}
Content-Type: application/json
Accept: application/json, text/event-stream
" | vegeta attack \
  -body="${PROJECT_ROOT}/benchmark/payloads/tools-call-context7.json" \
  -duration="${LOAD_DURATION}" \
  -rate="${LOAD_RATE}" \
  -timeout="${REQUEST_TIMEOUT}" \
  -output="${RESULT_OUTPUT_DIR}/context7-direct/load/tools-call.bin"

# レポート生成
vegeta report -type=text "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-call.bin" > "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-call-report.txt"
vegeta report -type=json "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-call.bin" > "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-call-report.json"
vegeta report -type=hist[0,10ms,50ms,100ms,200ms,500ms,1s,2s,5s] "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-call.bin" > "${RESULT_OUTPUT_DIR}/context7-direct/load/tools-call-hist.txt"
echo "      ✅ 完了"

echo ""

# ============================================
# 比較レポート生成
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📈 比較レポート生成中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# JSON レポートから主要メトリクスを抽出
TUMIKI_LIST_JSON="${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-list-report.json"
TUMIKI_CALL_JSON="${RESULT_OUTPUT_DIR}/tumiki-proxy/load/tools-call-report.json"
CONTEXT7_LIST_JSON="${RESULT_OUTPUT_DIR}/context7-direct/load/tools-list-report.json"
CONTEXT7_CALL_JSON="${RESULT_OUTPUT_DIR}/context7-direct/load/tools-call-report.json"

# ナノ秒をミリ秒に変換する関数
ns_to_ms() {
    echo "scale=2; $1 / 1000000" | bc
}

# パーセンテージを計算する関数
calc_percent() {
    local tumiki=$1
    local context7=$2
    if [ "$context7" != "0" ]; then
        echo "scale=2; (($tumiki - $context7) / $context7) * 100" | bc
    else
        echo "N/A"
    fi
}

# ms単位の差分を計算する関数
calc_ms_diff() {
    local tumiki_ms=$1
    local context7_ms=$2
    echo "scale=2; $tumiki_ms - $context7_ms" | bc
}

# tools/list メトリクス抽出
TUMIKI_LIST_MEAN=$(jq -r '.latencies.mean' "$TUMIKI_LIST_JSON")
TUMIKI_LIST_P50=$(jq -r '.latencies."50th"' "$TUMIKI_LIST_JSON")
TUMIKI_LIST_P95=$(jq -r '.latencies."95th"' "$TUMIKI_LIST_JSON")
TUMIKI_LIST_P99=$(jq -r '.latencies."99th"' "$TUMIKI_LIST_JSON")
TUMIKI_LIST_THROUGHPUT=$(jq -r '.throughput' "$TUMIKI_LIST_JSON")
TUMIKI_LIST_SUCCESS=$(jq -r '.success * 100' "$TUMIKI_LIST_JSON")

CONTEXT7_LIST_MEAN=$(jq -r '.latencies.mean' "$CONTEXT7_LIST_JSON")
CONTEXT7_LIST_P50=$(jq -r '.latencies."50th"' "$CONTEXT7_LIST_JSON")
CONTEXT7_LIST_P95=$(jq -r '.latencies."95th"' "$CONTEXT7_LIST_JSON")
CONTEXT7_LIST_P99=$(jq -r '.latencies."99th"' "$CONTEXT7_LIST_JSON")
CONTEXT7_LIST_THROUGHPUT=$(jq -r '.throughput' "$CONTEXT7_LIST_JSON")
CONTEXT7_LIST_SUCCESS=$(jq -r '.success * 100' "$CONTEXT7_LIST_JSON")

# tools/call メトリクス抽出
TUMIKI_CALL_MEAN=$(jq -r '.latencies.mean' "$TUMIKI_CALL_JSON")
TUMIKI_CALL_P50=$(jq -r '.latencies."50th"' "$TUMIKI_CALL_JSON")
TUMIKI_CALL_P95=$(jq -r '.latencies."95th"' "$TUMIKI_CALL_JSON")
TUMIKI_CALL_P99=$(jq -r '.latencies."99th"' "$TUMIKI_CALL_JSON")
TUMIKI_CALL_THROUGHPUT=$(jq -r '.throughput' "$TUMIKI_CALL_JSON")
TUMIKI_CALL_SUCCESS=$(jq -r '.success * 100' "$TUMIKI_CALL_JSON")

CONTEXT7_CALL_MEAN=$(jq -r '.latencies.mean' "$CONTEXT7_CALL_JSON")
CONTEXT7_CALL_P50=$(jq -r '.latencies."50th"' "$CONTEXT7_CALL_JSON")
CONTEXT7_CALL_P95=$(jq -r '.latencies."95th"' "$CONTEXT7_CALL_JSON")
CONTEXT7_CALL_P99=$(jq -r '.latencies."99th"' "$CONTEXT7_CALL_JSON")
CONTEXT7_CALL_THROUGHPUT=$(jq -r '.throughput' "$CONTEXT7_CALL_JSON")
CONTEXT7_CALL_SUCCESS=$(jq -r '.success * 100' "$CONTEXT7_CALL_JSON")

# ミリ秒に変換
TUMIKI_LIST_MEAN_MS=$(ns_to_ms "$TUMIKI_LIST_MEAN")
TUMIKI_LIST_P50_MS=$(ns_to_ms "$TUMIKI_LIST_P50")
TUMIKI_LIST_P95_MS=$(ns_to_ms "$TUMIKI_LIST_P95")
TUMIKI_LIST_P99_MS=$(ns_to_ms "$TUMIKI_LIST_P99")

CONTEXT7_LIST_MEAN_MS=$(ns_to_ms "$CONTEXT7_LIST_MEAN")
CONTEXT7_LIST_P50_MS=$(ns_to_ms "$CONTEXT7_LIST_P50")
CONTEXT7_LIST_P95_MS=$(ns_to_ms "$CONTEXT7_LIST_P95")
CONTEXT7_LIST_P99_MS=$(ns_to_ms "$CONTEXT7_LIST_P99")

TUMIKI_CALL_MEAN_MS=$(ns_to_ms "$TUMIKI_CALL_MEAN")
TUMIKI_CALL_P50_MS=$(ns_to_ms "$TUMIKI_CALL_P50")
TUMIKI_CALL_P95_MS=$(ns_to_ms "$TUMIKI_CALL_P95")
TUMIKI_CALL_P99_MS=$(ns_to_ms "$TUMIKI_CALL_P99")

CONTEXT7_CALL_MEAN_MS=$(ns_to_ms "$CONTEXT7_CALL_MEAN")
CONTEXT7_CALL_P50_MS=$(ns_to_ms "$CONTEXT7_CALL_P50")
CONTEXT7_CALL_P95_MS=$(ns_to_ms "$CONTEXT7_CALL_P95")
CONTEXT7_CALL_P99_MS=$(ns_to_ms "$CONTEXT7_CALL_P99")

# 差分計算（パーセント）
LIST_MEAN_DIFF_PCT=$(calc_percent "$TUMIKI_LIST_MEAN" "$CONTEXT7_LIST_MEAN")
LIST_P50_DIFF_PCT=$(calc_percent "$TUMIKI_LIST_P50" "$CONTEXT7_LIST_P50")
LIST_P95_DIFF_PCT=$(calc_percent "$TUMIKI_LIST_P95" "$CONTEXT7_LIST_P95")
LIST_P99_DIFF_PCT=$(calc_percent "$TUMIKI_LIST_P99" "$CONTEXT7_LIST_P99")

CALL_MEAN_DIFF_PCT=$(calc_percent "$TUMIKI_CALL_MEAN" "$CONTEXT7_CALL_MEAN")
CALL_P50_DIFF_PCT=$(calc_percent "$TUMIKI_CALL_P50" "$CONTEXT7_CALL_P50")
CALL_P95_DIFF_PCT=$(calc_percent "$TUMIKI_CALL_P95" "$CONTEXT7_CALL_P95")
CALL_P99_DIFF_PCT=$(calc_percent "$TUMIKI_CALL_P99" "$CONTEXT7_CALL_P99")

# 差分計算（ms）
LIST_MEAN_DIFF_MS=$(calc_ms_diff "$TUMIKI_LIST_MEAN_MS" "$CONTEXT7_LIST_MEAN_MS")
LIST_P50_DIFF_MS=$(calc_ms_diff "$TUMIKI_LIST_P50_MS" "$CONTEXT7_LIST_P50_MS")
LIST_P95_DIFF_MS=$(calc_ms_diff "$TUMIKI_LIST_P95_MS" "$CONTEXT7_LIST_P95_MS")
LIST_P99_DIFF_MS=$(calc_ms_diff "$TUMIKI_LIST_P99_MS" "$CONTEXT7_LIST_P99_MS")

CALL_MEAN_DIFF_MS=$(calc_ms_diff "$TUMIKI_CALL_MEAN_MS" "$CONTEXT7_CALL_MEAN_MS")
CALL_P50_DIFF_MS=$(calc_ms_diff "$TUMIKI_CALL_P50_MS" "$CONTEXT7_CALL_P50_MS")
CALL_P95_DIFF_MS=$(calc_ms_diff "$TUMIKI_CALL_P95_MS" "$CONTEXT7_CALL_P95_MS")
CALL_P99_DIFF_MS=$(calc_ms_diff "$TUMIKI_CALL_P99_MS" "$CONTEXT7_CALL_P99_MS")

# 比較サマリー生成
cat > "${RESULT_OUTPUT_DIR}/comparison-summary.txt" <<EOF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tumiki MCP プロキシ vs Context7 直接接続 - 比較結果
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
生成日時: $(date)
測定条件: ${LOAD_DURATION} @ ${LOAD_RATE} req/s

【tools/list】
                    Tumiki          Context7       差分 (ms)              差分 (%)
平均レイテンシ      ${TUMIKI_LIST_MEAN_MS} ms      ${CONTEXT7_LIST_MEAN_MS} ms         +${LIST_MEAN_DIFF_MS} ms          +${LIST_MEAN_DIFF_PCT}%
P50                ${TUMIKI_LIST_P50_MS} ms       ${CONTEXT7_LIST_P50_MS} ms          +${LIST_P50_DIFF_MS} ms           +${LIST_P50_DIFF_PCT}%
P95                ${TUMIKI_LIST_P95_MS} ms       ${CONTEXT7_LIST_P95_MS} ms          +${LIST_P95_DIFF_MS} ms           +${LIST_P95_DIFF_PCT}%
P99                ${TUMIKI_LIST_P99_MS} ms       ${CONTEXT7_LIST_P99_MS} ms          +${LIST_P99_DIFF_MS} ms           +${LIST_P99_DIFF_PCT}%
スループット        ${TUMIKI_LIST_THROUGHPUT} req/s    ${CONTEXT7_LIST_THROUGHPUT} req/s
成功率              ${TUMIKI_LIST_SUCCESS}%             ${CONTEXT7_LIST_SUCCESS}%

【tools/call】
                    Tumiki          Context7       差分 (ms)              差分 (%)
平均レイテンシ      ${TUMIKI_CALL_MEAN_MS} ms      ${CONTEXT7_CALL_MEAN_MS} ms         +${CALL_MEAN_DIFF_MS} ms          +${CALL_MEAN_DIFF_PCT}%
P50                ${TUMIKI_CALL_P50_MS} ms       ${CONTEXT7_CALL_P50_MS} ms          +${CALL_P50_DIFF_MS} ms           +${CALL_P50_DIFF_PCT}%
P95                ${TUMIKI_CALL_P95_MS} ms       ${CONTEXT7_CALL_P95_MS} ms          +${CALL_P95_DIFF_MS} ms           +${CALL_P95_DIFF_PCT}%
P99                ${TUMIKI_CALL_P99_MS} ms       ${CONTEXT7_CALL_P99_MS} ms          +${CALL_P99_DIFF_MS} ms           +${CALL_P99_DIFF_PCT}%
スループット        ${TUMIKI_CALL_THROUGHPUT} req/s    ${CONTEXT7_CALL_THROUGHPUT} req/s
成功率              ${TUMIKI_CALL_SUCCESS}%             ${CONTEXT7_CALL_SUCCESS}%

【結論】
プロキシオーバーヘッド (tools/list): +${LIST_MEAN_DIFF_MS} ms (+${LIST_MEAN_DIFF_PCT}%)
プロキシオーバーヘッド (tools/call): +${CALL_MEAN_DIFF_MS} ms (+${CALL_MEAN_DIFF_PCT}%)

【詳細レポート】
- Tumiki プロキシ: ${RESULT_OUTPUT_DIR}/tumiki-proxy/load/
- Context7 直接接続: ${RESULT_OUTPUT_DIR}/context7-direct/load/
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

# サマリー表示
cat "${RESULT_OUTPUT_DIR}/comparison-summary.txt"

echo ""
echo "✅ ベンチマーク完了！"
echo "結果: ${RESULT_OUTPUT_DIR}"
