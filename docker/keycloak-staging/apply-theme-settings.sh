#!/usr/bin/env bash
set -euo pipefail

cleanup_kcadm_config() {
  rm -f "${HOME}/.keycloak/kcadm.config"
}

trap cleanup_kcadm_config EXIT

/opt/keycloak/bin/kcadm.sh config credentials \
  --server http://localhost:8080 \
  --realm master \
  --user "${KEYCLOAK_ADMIN}" \
  --password "${KEYCLOAK_ADMIN_PASSWORD}" >/dev/null

/opt/keycloak/bin/kcadm.sh update realms/tumiki \
  -s loginTheme=tumiki \
  -s accountTheme=keycloak.v3

realm_config=$(/opt/keycloak/bin/kcadm.sh get realms/tumiki --fields loginTheme,accountTheme)

if ! echo "${realm_config}" | grep -Eq '"loginTheme"[[:space:]]*:[[:space:]]*"tumiki"'; then
  echo "Failed to apply loginTheme=tumiki. Actual realm config: ${realm_config}" >&2
  exit 1
fi

if ! echo "${realm_config}" | grep -Eq '"accountTheme"[[:space:]]*:[[:space:]]*"keycloak.v3"'; then
  echo "Failed to apply accountTheme=keycloak.v3. Actual realm config: ${realm_config}" >&2
  exit 1
fi

echo "Keycloak staging theme settings are applied"
