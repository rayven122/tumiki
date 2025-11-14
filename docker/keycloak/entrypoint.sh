#!/bin/bash
# Keycloak カスタムエントリーポイント
# Keycloakを起動し、起動完了後にsetup-keycloak.shを実行します

set -e

echo "Starting Keycloak..."

# Keycloakをバックグラウンドで起動（start-dev モード）
/opt/keycloak/bin/kc.sh start-dev \
  --import-realm \
  --http-enabled=true \
  --hostname-strict=false \
  --health-enabled=true &

KEYCLOAK_PID=$!

# Keycloakの起動を待機（最大60秒）
echo "Waiting for Keycloak to be ready..."
# RETRIES=30
# until { exec 3<>/dev/tcp/localhost/9000 && printf 'GET /health/ready HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' >&3 && grep -q 'HTTP/1.1 200' <&3; exec 3>&-; } 2>/dev/null; do
#   RETRIES=$((RETRIES - 1))
#   if [ $RETRIES -eq 0 ]; then
#     echo "ERROR: Keycloak failed to start within timeout"
#     kill $KEYCLOAK_PID 2>/dev/null || true
#     exit 1
#   fi
#   echo "Waiting for Keycloak... ($RETRIES attempts remaining)"
#   sleep 2
# done

echo "Keycloak health check passed. Waiting for Admin API to be ready..."

# ポート8080の管理APIが応答するまで待機
RETRIES=30
until { exec 3<>/dev/tcp/localhost/8080 && printf 'GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' >&3 && grep -q 'HTTP/1.1' <&3; exec 3>&-; } 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ $RETRIES -eq 0 ]; then
    echo "ERROR: Keycloak Admin API failed to respond within timeout"
    kill $KEYCLOAK_PID 2>/dev/null || true
    exit 1
  fi
  echo "Waiting for Admin API... ($RETRIES attempts remaining)"
  sleep 2
done

echo "Admin API is ready. Running setup script..."

# セットアップスクリプトを実行
if [ -f /opt/keycloak/setup-keycloak.sh ]; then
  if bash /opt/keycloak/setup-keycloak.sh; then
    echo "Setup script completed successfully"
  else
    echo "WARNING: Setup script failed, but Keycloak will continue running"
  fi
else
  echo "WARNING: setup-keycloak.sh not found, skipping setup"
fi

echo "Keycloak setup completed. Keycloak is running."

# フォアグラウンドプロセスとして待機
wait $KEYCLOAK_PID
