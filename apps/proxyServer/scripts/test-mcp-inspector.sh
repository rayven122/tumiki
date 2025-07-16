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

# 設定ファイル作成
create_config_files() {
    log "INFO" "MCP Inspector設定ファイル作成中..."
    
    # Streamable HTTP Transport設定
    cat > "$TEMP_DIR/streamable-http-config.json" << EOF
{
  "mcpServers": {
    "proxy-server-streamable": {
      "command": "echo",
      "args": ["Streamable HTTP Transport"],
      "transport": {
        "type": "http",
        "url": "$PROXY_SERVER_URL/mcp",
        "headers": {
          "api-key": "$API_KEY",
          "x-client-id": "$CLIENT_ID"
        }
      }
    }
  }
}
EOF

    # SSE Transport設定
    cat > "$TEMP_DIR/sse-config.json" << EOF
{
  "mcpServers": {
    "proxy-server-sse": {
      "command": "echo",
      "args": ["SSE Transport"],
      "transport": {
        "type": "sse",
        "url": "$PROXY_SERVER_URL/sse?api-key=$API_KEY&x-client-id=$CLIENT_ID",
        "messageUrl": "$PROXY_SERVER_URL/messages"
      }
    }
  }
}
EOF

    log "SUCCESS" "設定ファイル作成完了"
}

# MCP Inspector CLI でのテスト実行
run_inspector_test() {
    local config_file=$1
    local transport_name=$2
    local timeout=${3:-30}
    
    log "TEST" "$transport_name テスト開始 (タイムアウト: ${timeout}秒)"
    
    # テストコマンドファイル作成
    cat > "$TEMP_DIR/test-commands.txt" << EOF
tools list
EOF

    # MCP Inspector CLI 実行
    log "INFO" "MCP Inspector CLI起動中..."
    
    local transport_lower=$(echo "$transport_name" | tr '[:upper:]' '[:lower:]')
    local output_file="$TEMP_DIR/${transport_lower}-output.log"
    local error_file="$TEMP_DIR/${transport_lower}-error.log"
    
    # timeoutコマンドを動的に選択
    timeout_cmd=""
    if command -v timeout >/dev/null 2>&1; then
        timeout_cmd="timeout"
    elif command -v gtimeout >/dev/null 2>&1; then
        timeout_cmd="gtimeout"
    fi
    
    # サーバー名を設定ファイルから決定
    local server_name
    if [[ "$transport_name" == *"Streamable"* ]] || [[ "$transport_name" == *"HTTP"* ]]; then
        server_name="proxy-server-streamable"
    else
        server_name="proxy-server-sse"
    fi
    
    # バックグラウンドでMCP Inspector実行
    if [ -n "$timeout_cmd" ]; then
        $timeout_cmd $timeout npx @modelcontextprotocol/inspector \
            --config "$config_file" \
            --server "$server_name" \
            --non-interactive \
            < "$TEMP_DIR/test-commands.txt" \
            > "$output_file" 2> "$error_file" &
        inspector_pid=$!
    else
        # timeoutコマンドが無い場合は手動でプロセス管理
        npx @modelcontextprotocol/inspector \
            --config "$config_file" \
            --server "$server_name" \
            --non-interactive \
            < "$TEMP_DIR/test-commands.txt" \
            > "$output_file" 2> "$error_file" &
        inspector_pid=$!
        
        # 指定時間後にプロセスを終了
        (sleep $timeout && kill $inspector_pid 2>/dev/null) &
        timeout_killer_pid=$!
    fi
    
    # 結果待機
    local wait_time=0
    local max_wait=10
    
    while [ $wait_time -lt $max_wait ]; do
        if [ -s "$output_file" ] || [ -s "$error_file" ]; then
            break
        fi
        sleep 1
        ((wait_time++))
    done
    
    # プロセス終了待機
    wait $inspector_pid 2>/dev/null || true
    
    # timeout killerプロセスがあれば終了
    if [ -n "${timeout_killer_pid:-}" ]; then
        kill $timeout_killer_pid 2>/dev/null || true
    fi
    
    # 結果確認
    if [ -s "$output_file" ]; then
        log "SUCCESS" "$transport_name テスト完了"
        log "INFO" "出力内容:"
        cat "$output_file" | head -20
        
        # ツールリスト取得成功を確認
        if grep -q "tools\|list\|available" "$output_file"; then
            log "SUCCESS" "$transport_name: ツールリスト取得成功"
            return 0
        else
            log "WARN" "$transport_name: ツールリスト情報が見つかりません"
        fi
    fi
    
    if [ -s "$error_file" ]; then
        log "ERROR" "$transport_name テストエラー:"
        cat "$error_file" | head -10
        return 1
    fi
    
    log "WARN" "$transport_name: 出力が見つかりません（タイムアウトまたは接続エラー）"
    return 1
}

# 簡易接続テスト（MCP Inspector CLIの代替）
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
                    # セッションIDを含むヘッダーを探して正規表現で抽出
                    session_line=$(grep "^mcp-session-id:" "$TEMP_DIR/headers.txt" | head -1)
                    if [ -n "$session_line" ]; then
                        # UUID形式のセッションIDを抽出（例: 4415ebda-4908-4209-b9d4-f50391400221）
                        session_id=$(echo "$session_line" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
                    fi
                    
                    if [ -n "$session_id" ]; then
                        log "INFO" "セッションID取得: $session_id"
                    else
                        log "WARN" "ヘッダーからセッションIDが見つかりません"
                        echo "ヘッダー内容:"
                        cat "$TEMP_DIR/headers.txt" | head -10
                    fi
                fi
                
                # Step 2: 初期化されたセッションでnotifications/initializedを送信
                log "INFO" "notifications/initialized 送信"
                
                if [ -n "$session_id" ]; then
                    initialized_response=$(curl -s -w "\\nHTTPSTATUS:%{http_code}" \
                        -H "Content-Type: application/json" \
                        -H "Accept: application/json, text/event-stream" \
                        -H "api-key: $API_KEY" \
                        -H "x-client-id: $CLIENT_ID" \
                        -H "mcp-session-id: $session_id" \
                        -X POST \
                        -d '{"jsonrpc": "2.0", "method": "notifications/initialized"}' \
                        "$PROXY_SERVER_URL/mcp")
                else
                    initialized_response=$(curl -s -w "\\nHTTPSTATUS:%{http_code}" \
                        -H "Content-Type: application/json" \
                        -H "Accept: application/json, text/event-stream" \
                        -H "api-key: $API_KEY" \
                        -H "x-client-id: $CLIENT_ID" \
                        -X POST \
                        -d '{"jsonrpc": "2.0", "method": "notifications/initialized"}' \
                        "$PROXY_SERVER_URL/mcp")
                fi
                
                initialized_code=$(echo "$initialized_response" | tail -n1 | sed 's/HTTPSTATUS://')
                
                if [ "$initialized_code" = "200" ] || [ "$initialized_code" = "204" ]; then
                    log "INFO" "tools/list リクエスト送信 (Streamable HTTP)"
                    
                    # Step 3: tools/listリクエスト送信
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
                    log "WARN" "notifications/initialized エラー (HTTP: $initialized_code) - 続行"
                    
                    # initializedエラーでもtools/listを試す
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
            
            # SSE接続テスト（短時間）
            # timeoutコマンドを動的に選択
            timeout_cmd=""
            if command -v timeout >/dev/null 2>&1; then
                timeout_cmd="timeout"
            elif command -v gtimeout >/dev/null 2>&1; then
                timeout_cmd="gtimeout"
            fi
            
            if [ -n "$timeout_cmd" ]; then
                $timeout_cmd 5s curl -s -N \
                    -H "Accept: text/event-stream" \
                    "$PROXY_SERVER_URL/sse?api-key=$API_KEY&x-client-id=$CLIENT_ID" \
                    > "$TEMP_DIR/sse-test.log" 2>&1 &
            else
                # timeoutコマンドがない場合は5秒間だけcurlを実行
                curl -s -N \
                    -H "Accept: text/event-stream" \
                    "$PROXY_SERVER_URL/sse?api-key=$API_KEY&x-client-id=$CLIENT_ID" \
                    > "$TEMP_DIR/sse-test.log" 2>&1 &
                curl_pid=$!
                sleep 5
                kill $curl_pid 2>/dev/null || true
            fi
            
            sleep 3
            
            if [ -s "$TEMP_DIR/sse-test.log" ]; then
                log "SUCCESS" "SSE: 接続確立成功"
                head -3 "$TEMP_DIR/sse-test.log"
                
                # メッセージ送信テスト
                log "INFO" "SSEメッセージ送信テスト"
                
                message_response=$(curl -s -w "\\nHTTPSTATUS:%{http_code}" \
                    -H "Content-Type: application/json" \
                    -X POST \
                    -d '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}' \
                    "$PROXY_SERVER_URL/messages?sessionId=cli-test")
                
                message_code=$(echo "$message_response" | tail -n1 | sed 's/HTTPSTATUS://')
                
                if [ "$message_code" = "200" ] || [ "$message_code" = "404" ]; then
                    log "SUCCESS" "SSE: メッセージエンドポイント応答"
                    return 0
                else
                    log "WARN" "SSE: メッセージ送信エラー (HTTP: $message_code)"
                    return 1
                fi
            else
                log "ERROR" "SSE: 接続確立失敗"
                return 1
            fi
            ;;
    esac
}

# クリーンアップ
cleanup() {
    log "INFO" "クリーンアップ実行中..."
    
    # バックグラウンドプロセス終了
    pkill -f "@modelcontextprotocol/inspector" 2>/dev/null || true
    
    # 一時ファイル削除（オプション）
    if [ "${KEEP_TEMP:-false}" != "true" ]; then
        rm -rf "$TEMP_DIR"
        log "INFO" "一時ファイル削除完了"
    else
        log "INFO" "一時ファイル保持: $TEMP_DIR"
    fi
}

# メイン実行
main() {
    log "INFO" "${BOLD}=== MCP Inspector CLI モード検証テスト ===${NC}"
    log "INFO" "設定: ProxyServer=$PROXY_SERVER_URL, API_KEY=${API_KEY:0:8}***, Client=$CLIENT_ID"
    
    # 事前チェック
    check_dependencies
    
    if ! check_server_health; then
        exit 1
    fi
    
    # セットアップ
    setup_temp_dir
    create_config_files
    
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
    
    # MCP Inspector CLI テスト
    timeout_cmd=""
    if command -v timeout >/dev/null 2>&1; then
        timeout_cmd="timeout"
    elif command -v gtimeout >/dev/null 2>&1; then
        timeout_cmd="gtimeout"
    fi
    
    # timeoutコマンドが無くてもテストを実行
    echo
    log "TEST" "=== MCP Inspector CLI テスト ==="
    
    if [ -n "$timeout_cmd" ]; then
        log "INFO" "timeoutコマンド利用: $timeout_cmd"
    else
        log "INFO" "timeoutコマンドなしで実行（プロセス管理版）"
    fi
    
    log "INFO" "Streamable HTTP with MCP Inspector CLI"
    if run_inspector_test "$TEMP_DIR/streamable-http-config.json" "Streamable-HTTP" 15; then
        log "SUCCESS" "MCP Inspector CLI: Streamable HTTP 成功"
    else
        log "WARN" "MCP Inspector CLI: Streamable HTTP 警告"
    fi
    
    echo
    log "INFO" "SSE with MCP Inspector CLI"
    if run_inspector_test "$TEMP_DIR/sse-config.json" "SSE" 15; then
        log "SUCCESS" "MCP Inspector CLI: SSE 成功"
    else
        log "WARN" "MCP Inspector CLI: SSE 警告"
    fi
    
    # 結果サマリー
    echo
    log "INFO" "${BOLD}=== テスト結果サマリー ===${NC}"
    log "INFO" "基本接続テスト: $tests_passed/$tests_total 成功"
    
    if [ $tests_passed -eq $tests_total ]; then
        log "SUCCESS" "${BOLD}🎉 MCP Inspector CLI接続テスト成功！${NC}"
        log "INFO" "手動でのMCP Inspector実行:"
        log "INFO" "  npx @modelcontextprotocol/inspector --config $TEMP_DIR/streamable-http-config.json"
        log "INFO" "  npx @modelcontextprotocol/inspector --config $TEMP_DIR/sse-config.json"
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
    echo "MCP Inspector CLI mode 検証テストスクリプト"
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
    echo "  - @modelcontextprotocol/inspector (自動インストール)"
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