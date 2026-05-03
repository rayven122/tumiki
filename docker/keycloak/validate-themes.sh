#!/usr/bin/env bash
set -euo pipefail

themes_dir="${KEYCLOAK_THEMES_DIR:-${KEYCLOAK_DIR:-$HOME/keycloak}/themes}"

required_theme_files=(
  # install-themes.sh および docker/keycloak/themes と同期して更新すること。
  # account_theme は keycloak.v3 ビルトインを使うため、ここでは独自 account ファイルを検証しない。
  "tumiki/login/theme.properties"
  "tumiki/login/resources/css/tumiki.css"
  "keywind/login/theme.properties"
  "keywind/login/resources/dist/index.css"
  "keywind/login/resources/dist/index.js"
)

echo "Validating Keycloak theme files in: ${themes_dir}"
missing=0
for theme_file in "${required_theme_files[@]}"; do
  if [[ ! -f "${themes_dir}/${theme_file}" ]]; then
    echo "Missing Keycloak theme file: ${theme_file}" >&2
    missing=1
  fi
done

if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi

echo "Keycloak theme files are present in: ${themes_dir}"
