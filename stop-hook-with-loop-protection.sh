#!/bin/bash

# Stop hook with infinite loop protection
# このスクリプトは同じエラーが連続で発生した場合に終了します

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="$SCRIPT_DIR/.stop-hook-state"
MAX_RETRIES=3

# CI環境または skip ファイルが存在する場合はスキップ
if [ "$CI" = "true" ] || [ -f "$SCRIPT_DIR/.skip-stop-hook" ]; then
    echo "Stop hook skipped (CI or skip file detected)"
    exit 0
fi

# 前回の状態を読み込み
if [ -f "$STATE_FILE" ]; then
    source "$STATE_FILE"
else
    LAST_ERROR=""
    RETRY_COUNT=0
fi

echo "Running final lint check..."

# lint:fix を実行
if pnpm lint:fix 2>/dev/null; then
    echo "All lint checks passed!"
    # 成功した場合は状態をリセット
    rm -f "$STATE_FILE"
    exit 0
else
    # エラーが発生した場合
    echo "Lint errors detected. Continuing to fix..."
    
    # 現在のエラー出力を取得
    CURRENT_ERROR=$(pnpm lint 2>&1 | head -10)
    
    # 前回と同じエラーかチェック
    if [ "$CURRENT_ERROR" = "$LAST_ERROR" ]; then
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "Same error detected. Retry count: $RETRY_COUNT/$MAX_RETRIES"
        
        if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
            echo "Maximum retries reached. Stopping to prevent infinite loop."
            echo "Last error:"
            echo "$CURRENT_ERROR"
            
            # 状態をリセット
            rm -f "$STATE_FILE"
            exit 1
        fi
    else
        # 新しいエラーの場合はカウンターをリセット
        RETRY_COUNT=1
        echo "New error detected. Resetting retry count."
    fi
    
    # 状態を保存
    cat > "$STATE_FILE" << EOF
LAST_ERROR="$CURRENT_ERROR"
RETRY_COUNT=$RETRY_COUNT
EOF
    
    echo "Current error:"
    echo "$CURRENT_ERROR"
    exit 2
fi
