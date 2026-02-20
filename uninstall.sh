#!/bin/bash
set -e

APP_NAME="SkillDuck"
APP_PATH="/Applications/${APP_NAME}.app"
APP_DATA="${HOME}/Library/Application Support/com.skillduck.app"

# Colors
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

info()    { echo -e "${BOLD}$1${RESET}"; }
success() { echo -e "${GREEN}✓ $1${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $1${RESET}"; }

echo ""
echo -e "${BOLD}SkillDuck Uninstaller${RESET}"
echo "This will remove:"
echo "  • ${APP_PATH}"
echo "  • ${APP_DATA} (settings and app data)"
echo ""
read -r -p "Continue? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""

if [[ -d "$APP_PATH" ]]; then
  rm -rf "$APP_PATH"
  success "Removed ${APP_PATH}"
else
  warn "${APP_PATH} not found, skipping"
fi

if [[ -d "$APP_DATA" ]]; then
  rm -rf "$APP_DATA"
  success "Removed app data"
else
  warn "App data not found, skipping"
fi

echo ""
echo -e "${BOLD}SkillDuck has been uninstalled.${RESET}"
