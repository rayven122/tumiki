#!/bin/bash
# BigQuery + Pub/Sub セットアップスクリプト
#
# 使用方法:
#   ./setup.sh <environment> <project_id>
#
# 例:
#   ./setup.sh dev tumiki-prod
#   ./setup.sh staging tumiki-prod
#   ./setup.sh prod tumiki-prod

set -e

ENVIRONMENT=$1
PROJECT_ID=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$PROJECT_ID" ]; then
  echo "Usage: $0 <environment> <project_id>"
  echo "  environment: dev | staging | prod"
  echo "  project_id: GCP project ID"
  exit 1
fi

# 環境に応じた設定
# dev/stagingは共通のDB・トピックを使用
case $ENVIRONMENT in
  dev|staging)
    TOPIC_NAME="mcp-request-logs-dev"
    DATASET_NAME="tumiki_logs_dev"
    SUBSCRIPTION_NAME="mcp-logs-to-bigquery-dev"
    ;;
  prod)
    TOPIC_NAME="mcp-request-logs"
    DATASET_NAME="tumiki_logs"
    SUBSCRIPTION_NAME="mcp-logs-to-bigquery"
    ;;
  *)
    echo "Invalid environment: $ENVIRONMENT"
    echo "Valid values: dev, staging, prod"
    exit 1
    ;;
esac

TABLE_NAME="mcp_requests"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCHEMA_FILE="$SCRIPT_DIR/mcp_requests_schema.json"

echo "========================================"
echo "BigQuery + Pub/Sub Setup"
echo "========================================"
echo "Environment:    $ENVIRONMENT"
echo "Project ID:     $PROJECT_ID"
echo "Topic:          $TOPIC_NAME"
echo "Dataset:        $DATASET_NAME"
echo "Table:          $TABLE_NAME"
echo "Subscription:   $SUBSCRIPTION_NAME"
echo "========================================"

# 1. Pub/Sub トピック作成
echo ""
echo "[1/4] Creating Pub/Sub topic..."
if gcloud pubsub topics describe "$TOPIC_NAME" --project="$PROJECT_ID" &>/dev/null; then
  echo "  Topic '$TOPIC_NAME' already exists. Skipping."
else
  gcloud pubsub topics create "$TOPIC_NAME" --project="$PROJECT_ID"
  echo "  Topic '$TOPIC_NAME' created."
fi

# 2. BigQuery データセット作成
echo ""
echo "[2/4] Creating BigQuery dataset..."
if bq show --project_id="$PROJECT_ID" "$DATASET_NAME" &>/dev/null; then
  echo "  Dataset '$DATASET_NAME' already exists. Skipping."
else
  bq mk --project_id="$PROJECT_ID" --dataset "$DATASET_NAME"
  echo "  Dataset '$DATASET_NAME' created."
fi

# 3. BigQuery テーブル作成
echo ""
echo "[3/4] Creating BigQuery table..."
FULL_TABLE_NAME="$PROJECT_ID:$DATASET_NAME.$TABLE_NAME"
if bq show "$FULL_TABLE_NAME" &>/dev/null; then
  echo "  Table '$TABLE_NAME' already exists. Skipping."
else
  bq mk \
    --table \
    --time_partitioning_field=publish_time \
    --time_partitioning_type=DAY \
    "$FULL_TABLE_NAME" \
    "$SCHEMA_FILE"
  echo "  Table '$TABLE_NAME' created with partitioning on publish_time."
fi

# 4. BigQuery Subscription 作成
echo ""
echo "[4/4] Creating BigQuery Subscription..."
if gcloud pubsub subscriptions describe "$SUBSCRIPTION_NAME" --project="$PROJECT_ID" &>/dev/null; then
  echo "  Subscription '$SUBSCRIPTION_NAME' already exists. Skipping."
else
  gcloud pubsub subscriptions create "$SUBSCRIPTION_NAME" \
    --project="$PROJECT_ID" \
    --topic="$TOPIC_NAME" \
    --bigquery-table="$FULL_TABLE_NAME" \
    --write-metadata
  echo "  Subscription '$SUBSCRIPTION_NAME' created."
fi

echo ""
echo "========================================"
echo "Setup completed successfully!"
echo "========================================"
echo ""
echo "Environment variable to set:"
echo "  PUBSUB_MCP_LOGS_TOPIC=$TOPIC_NAME"
echo ""
