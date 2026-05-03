#!/usr/bin/env bash
set -euo pipefail

cd "${KEYCLOAK_DIR:-$HOME/keycloak}"

required_theme_files=(
  # Keep this list aligned with the files required by docker/keycloak/themes.
  "themes/tumiki/login/theme.properties"
  "themes/tumiki/login/resources/css/tumiki.css"
  "themes/keywind/login/theme.properties"
  "themes/keywind/login/resources/dist/index.css"
  "themes/keywind/login/resources/dist/index.js"
)

for theme_file in "${required_theme_files[@]}"; do
  if [[ ! -f "${theme_file}" ]]; then
    echo "Missing Keycloak theme file: ${theme_file}" >&2
    exit 1
  fi
done

echo "Keycloak theme files are present"
