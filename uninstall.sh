#!/usr/bin/env bash
set -e

APP_NAME="SkillDuck"
APP_PATH="/Applications/${APP_NAME}.app"

TARGETS=(
  "${HOME}/.skillduck"
  "${HOME}/Library/Application Support/com.skillduck.app"
  "${HOME}/Library/Application Support/skillduck"
  "${HOME}/Library/Preferences/com.skillduck.app.plist"
  "${HOME}/Library/Preferences/skillduck.plist"
  "${HOME}/Library/Caches/com.skillduck.app"
  "${HOME}/Library/Caches/skillduck"
  "${HOME}/Library/WebKit/com.skillduck.app"
  "${HOME}/Library/WebKit/skillduck"
)

# Colors
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

success() { echo -e "${GREEN}✓ $1${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $1${RESET}"; }

echo ""
echo -e "${BOLD}SkillDuck Uninstaller${RESET}"
echo "This will remove:"
echo "  • ${APP_PATH}"
for t in "${TARGETS[@]}"; do
  echo "  • ${t}"
done
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

for t in "${TARGETS[@]}"; do
  if [[ -e "$t" ]]; then
    rm -rf "$t"
    success "Removed ${t}"
  fi
done

echo ""
echo -e "${BOLD}SkillDuck has been uninstalled.${RESET}"
