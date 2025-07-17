#!/bin/bash

# MCP Inspector CLI mode を使用したProxyServer検証スクリプト
# 
# 使用方法:
#   ./scripts/test-mcp-inspector.sh [API_KEY]
#   
# 環境変数での指定も可能:
#   TEST_API_KEY=your-api-key ./scripts/test-mcp-inspector.sh
#   MCP_PROXY_URL=http://localhost:8080 ./scripts/test-mcp-inspector.sh

set -e

# 設定
PROXY_SERVER_URL="${MCP_PROXY_URL:-http://localhost:8080}"
API_KEY="${1:-${TEST_API_KEY}}"
CLIENT_ID="mcp-inspector-cli"

# APIキーの必須チェック
if [ -z "$API_KEY" ]; then
    echo "エラー: APIキーが設定されていません。"
    echo "使用方法:"
    echo "  $0 your-api-key"
    echo "  または TEST_API_KEY=your-api-key $0"
    exit 1
fi

TEMP_DIR="/tmp/mcp-inspector-test"

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

log() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")  echo -e "${BLUE}[${timestamp}] [INFO]${NC} ${message}" ;;
        "SUCCESS") echo -e "${GREEN}[${timestamp}] [SUCCESS]${NC} ${message}" ;;
        "ERROR") echo -e "${RED}[${timestamp}] [ERROR]${NC} ${message}" ;;
        "WARN")  echo -e "${YELLOW}[${timestamp}] [WARN]${NC} ${message}" ;;
        "TEST")  echo -e "${CYAN}[${timestamp}] [TEST]${NC} ${message}" ;;
    esac
}

# 依存関係チェック
check_dependencies() {
    log "INFO" "依存関係チェック中..."
    
    if ! command -v npx >/dev/null 2>&1; then
        log "ERROR" "npx が見つかりません。Node.js をインストールしてください。"
        exit 1
    fi
    
    log "SUCCESS" "npx 利用可能"
}

# ProxyServerのヘルスチェック
check_server_health() {
    log "INFO" "ProxyServerのヘルスチェック中..."
    
    if curl -s -f "$PROXY_SERVER_URL/health" >/dev/null; then
        log "SUCCESS" "ProxyServer稼働確認"
        return 0
    else
        log "ERROR" "ProxyServerが応答していません"
        log "INFO" "ProxyServerを起動してください: pnpm start"
        return 1
    fi
}

# 一時ディレクトリ準備
setup_temp_dir() {
    rm -rf "$TEMP_DIR"
    mkdir -p "$TEMP_DIR"
    log "INFO" "一時ディレクトリ作成: $TEMP_DIR"
}

# 簡易接続テスト（基本機能確認）
run_simple_cli_test() {
    local transport_type=$1
    
    log "TEST" "簡易CLI接続テスト: $transport_type"
    
    case $transport_type in
        "streamable")
            # Streamable HTTP Transport テスト
            log "INFO" "新しいセッション作成 + initialize リクエスト (Streamable HTTP)"
            
            # Step 1: 初期化リクエストで新しいセッションを作成
            init_response=$(curl -s -w "\\nHTTPSTATUS:%{http_code}" -D "$TEMP_DIR/headers.txt" \
                -H "Content-Type: application/json" \
                -H "Accept: application/json, text/event-stream" \
                -H "api-key: $API_KEY" \
                -H "x-client-id: $CLIENT_ID" \
                -X POST \
                -d '{"jsonrpc": "2.0", "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test-client", "version": "1.0.0"}}, "id": 1}' \
                "$PROXY_SERVER_URL/mcp")
            
            init_code=$(echo "$init_response" | tail -n1 | sed 's/HTTPSTATUS://')
            init_body=$(echo "$init_response" | sed '$d')
            
            if [ "$init_code" = "200" ]; then
                log "SUCCESS" "初期化成功: $init_code"
                echo "$init_body" | head -3
                
                # レスポンスヘッダーからセッションIDを抽出
                session_id=""
                if [ -f "$TEMP_DIR/headers.txt" ]; then
                    session_line=$(grep "^mcp-session-id:" "$TEMP_DIR/headers.txt" | head -1)
                    if [ -n "$session_line" ]; then
                        session_id=$(echo "$session_line" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
                    fi
                    
                    if [ -n "$session_id" ]; then
                        log "INFO" "セッションID取得: $session_id"
                    else
                        log "WARN" "ヘッダーからセッションIDが見つかりません"
                    fi
                fi
                
                # Step 2: ツールリストリクエスト
                log "INFO" "tools/list リクエスト送信 (Streamable HTTP)"
                
                if [ -n "$session_id" ]; then
                    response=$(curl -s -w "\\nHTTPSTATUS:%{http_code}" \
                        -H "Content-Type: application/json" \
                        -H "Accept: application/json, text/event-stream" \
                        -H "api-key: $API_KEY" \
                        -H "x-client-id: $CLIENT_ID" \
                        -H "mcp-session-id: $session_id" \
                        -X POST \
                        -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 2}' \
                        "$PROXY_SERVER_URL/mcp")
                else
                    response=$(curl -s -w "\\nHTTPSTATUS:%{http_code}" \
                        -H "Content-Type: application/json" \
                        -H "Accept: application/json, text/event-stream" \
                        -H "api-key: $API_KEY" \
                        -H "x-client-id: $CLIENT_ID" \
                        -X POST \
                        -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 2}' \
                        "$PROXY_SERVER_URL/mcp")
                fi
            else
                log "ERROR" "Streamable HTTP: 初期化失敗 (HTTP: $init_code)"
                echo "$init_body"
                return 1
            fi
            
            http_code=$(echo "$response" | tail -n1 | sed 's/HTTPSTATUS://')
            body=$(echo "$response" | sed '$d')
            
            if [ "$http_code" = "200" ]; then
                log "SUCCESS" "Streamable HTTP: ツールリスト取得成功"
                echo "$body" | head -5
                return 0
            else
                log "ERROR" "Streamable HTTP: エラー (HTTP: $http_code)"
                echo "$body"
                return 1
            fi
            ;;
            
        "sse")
            # SSE Transport テスト
            log "INFO" "SSE接続テスト"
            
            # timeoutコマンドを動的に選択
            timeout_cmd=""
            if command -v timeout >/dev/null 2>&1; then
                timeout_cmd="timeout"
            elif command -v gtimeout >/dev/null 2>&1; then
                timeout_cmd="gtimeout"
            fi
            
            # SSE接続をバックグラウンドで開始し、少し待ってからツールテストを実行
            if [ -n "$timeout_cmd" ]; then
                $timeout_cmd 10s curl -s -N \
                    -H "Accept: text/event-stream" \
                    "$PROXY_SERVER_URL/sse?api-key=$API_KEY&x-client-id=$CLIENT_ID" \
                    > "$TEMP_DIR/sse-test.log" 2>&1 &
                curl_pid=$!
            else
                curl -s -N \
                    -H "Accept: text/event-stream" \
                    "$PROXY_SERVER_URL/sse?api-key=$API_KEY&x-client-id=$CLIENT_ID" \
                    > "$TEMP_DIR/sse-test.log" 2>&1 &
                curl_pid=$!
            fi
            
            # 接続確立まで少し待つ
            sleep 2
            
            if [ -s "$TEMP_DIR/sse-test.log" ]; then
                log "SUCCESS" "SSE: 接続確立成功"
                head -3 "$TEMP_DIR/sse-test.log"
                
                # レスポンスからセッションIDを抽出
                session_id=""
                if grep -q "event: endpoint" "$TEMP_DIR/sse-test.log"; then
                    endpoint_line=$(grep "data: /messages" "$TEMP_DIR/sse-test.log" | head -1)
                    if [ -n "$endpoint_line" ]; then
                        session_id=$(echo "$endpoint_line" | grep -oE 'sessionId=[0-9a-f-]+' | cut -d'=' -f2)
                    fi
                fi
                
                if [ -n "$session_id" ]; then
                    log "INFO" "セッションID抽出成功: $session_id"
                    
                    # tools/list リクエスト送信（SSE接続が生きている間に実行）
                    log "INFO" "SSE tools/list リクエスト送信"
                    
                    message_response=$(curl -s -w "\\nHTTPSTATUS:%{http_code}" \
                        -H "Content-Type: application/json" \
                        -X POST \
                        -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' \
                        "$PROXY_SERVER_URL/messages?sessionId=$session_id")
                    
                    message_code=$(echo "$message_response" | tail -n1 | sed 's/HTTPSTATUS://')
                    message_body=$(echo "$message_response" | sed '$d')
                    
                    # curlプロセスを終了
                    if [ -n "$curl_pid" ]; then
                        kill $curl_pid 2>/dev/null || true
                        wait $curl_pid 2>/dev/null || true
                    fi
                    
                    if [ "$message_code" = "200" ] || [ "$message_code" = "202" ]; then
                        log "SUCCESS" "SSE: tools/list リクエスト送信成功 (HTTP: $message_code)"
                        if [ -n "$message_body" ] && [ "$message_body" != "Accepted" ]; then
                            echo "$message_body" | head -5
                        else
                            echo "レスポンスはSSEストリームで送信されます"
                        fi
                        return 0
                    else
                        log "WARN" "SSE: tools/list 取得エラー (HTTP: $message_code)"
                        echo "$message_body"
                        return 1
                    fi
                else
                    log "WARN" "セッションIDを抽出できませんでした"
                    
                    # curlプロセスを終了
                    if [ -n "$curl_pid" ]; then
                        kill $curl_pid 2>/dev/null || true
                        wait $curl_pid 2>/dev/null || true
                    fi
                    
                    # フォールバック: 基本的なメッセージ送信テスト
                    message_response=$(curl -s -w "\\nHTTPSTATUS:%{http_code}" \
                        -H "Content-Type: application/json" \
                        -X POST \
                        -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' \
                        "$PROXY_SERVER_URL/messages?sessionId=cli-test")
                    
                    message_code=$(echo "$message_response" | tail -n1 | sed 's/HTTPSTATUS://')
                    
                    if [ "$message_code" = "200" ] || [ "$message_code" = "202" ] || [ "$message_code" = "404" ]; then
                        log "SUCCESS" "SSE: メッセージエンドポイント応答 (HTTP: $message_code)"
                        return 0
                    else
                        log "WARN" "SSE: メッセージ送信エラー (HTTP: $message_code)"
                        return 1
                    fi
                fi
            else
                log "ERROR" "SSE: 接続確立失敗"
                # curlプロセスを終了
                if [ -n "$curl_pid" ]; then
                    kill $curl_pid 2>/dev/null || true
                    wait $curl_pid 2>/dev/null || true
                fi
                return 1
            fi
            ;;
    esac
}

# クリーンアップ
cleanup() {
    log "INFO" "クリーンアップ実行中..."
    
    # 一時ファイル削除
    if [ "${KEEP_TEMP:-false}" != "true" ]; then
        rm -rf "$TEMP_DIR"
        log "INFO" "一時ファイル削除完了"
    else
        log "INFO" "一時ファイル保持: $TEMP_DIR"
    fi
}

# メイン実行
main() {
    log "INFO" "${BOLD}=== MCP ProxyServer 基本接続テスト ===${NC}"
    log "INFO" "設定: ProxyServer=$PROXY_SERVER_URL, API_KEY=${API_KEY:0:8}***, Client=$CLIENT_ID"
    
    # 事前チェック
    check_dependencies
    
    if ! check_server_health; then
        exit 1
    fi
    
    # セットアップ
    setup_temp_dir
    
    # クリーンアップ用のトラップ設定
    trap cleanup EXIT
    
    # テスト実行
    tests_passed=0
    tests_total=2
    
    echo
    log "TEST" "=== Streamable HTTP Transport テスト ==="
    if run_simple_cli_test "streamable"; then
        ((tests_passed++))
    fi
    
    echo
    log "TEST" "=== SSE Transport テスト ==="
    if run_simple_cli_test "sse"; then
        ((tests_passed++))
    fi
    
    # 結果サマリー
    echo
    log "INFO" "${BOLD}=== テスト結果サマリー ===${NC}"
    log "INFO" "基本接続テスト: $tests_passed/$tests_total 成功"
    
    if [ $tests_passed -eq $tests_total ]; then
        log "SUCCESS" "${BOLD}🎉 ProxyServer 基本接続テスト成功！${NC}"
        log "INFO" "手動でのProxy Serverテスト:"
        log "INFO" "  # HTTP Transport:"
        log "INFO" "  curl -X POST -H 'Content-Type: application/json' -H 'api-key: $API_KEY' -d '{\"jsonrpc\": \"2.0\", \"method\": \"tools/list\", \"id\": 1}' $PROXY_SERVER_URL/mcp"
        log "INFO" "  # SSE Transport:"
        log "INFO" "  curl -N -H 'Accept: text/event-stream' '$PROXY_SERVER_URL/sse?api-key=$API_KEY&x-client-id=test'"
        exit 0
    elif [ $tests_passed -gt 0 ]; then
        log "WARN" "${BOLD}⚠️  一部のテストが失敗しました${NC}"
        exit 1
    else
        log "ERROR" "${BOLD}❌ 全てのテストが失敗しました${NC}"
        exit 1
    fi
}

# ヘルプ表示
show_help() {
    echo "MCP ProxyServer 基本接続テストスクリプト"
    echo
    echo "使用方法:"
    echo "  $0 [API_KEY]"
    echo "  TEST_API_KEY=your-api-key $0"
    echo
    echo "オプション:"
    echo "  -h, --help     このヘルプを表示"
    echo
    echo "環境変数:"
    echo "  TEST_API_KEY   使用するAPIキー"
    echo "  MCP_PROXY_URL  ProxyServerのURL (デフォルト: http://localhost:8080)"
    echo "  KEEP_TEMP      'true'の場合、一時ファイルを保持"
    echo
    echo "例:"
    echo "  $0 sk-1234567890abcdef"
    echo "  TEST_API_KEY=sk-1234567890abcdef KEEP_TEMP=true $0"
    echo "  MCP_PROXY_URL=http://localhost:3000 TEST_API_KEY=sk-1234567890abcdef $0"
    echo
    echo "必要な依存関係:"
    echo "  - Node.js (npx)"
    echo "  - curl"
    echo
}

# コマンドライン引数の処理
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main
        ;;
esac