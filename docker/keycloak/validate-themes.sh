#!/usr/bin/env bash
set -euo pipefail

themes_dir="${KEYCLOAK_THEMES_DIR:-${KEYCLOAK_DIR:-$HOME/keycloak}/themes}"

required_theme_files=(
  # Keep this list aligned with install-themes.sh and docker/keycloak/themes.
  "tumiki/login/theme.properties"
  "tumiki/login/resources/css/tumiki.css"
  "keywind/login/theme.properties"
  "keywind/login/resources/dist/index.css"
  "keywind/login/resources/dist/index.js"
)

for theme_file in "${required_theme_files[@]}"; do
  if [[ ! -f "${themes_dir}/${theme_file}" ]]; then
    echo "Missing Keycloak theme file: ${theme_file}" >&2
    exit 1
  fi
done

echo "Keycloak theme files are present"
