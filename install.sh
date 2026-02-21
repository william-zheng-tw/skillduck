#!/usr/bin/env bash
set -e

REPO="william-zheng-tw/skillduck"
APP_NAME="SkillDuck"
INSTALL_DIR="/Applications"

# Colors
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
RED="\033[0;31m"
RESET="\033[0m"

info()    { echo -e "${BOLD}$1${RESET}"; }
success() { echo -e "${GREEN}✓ $1${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $1${RESET}"; }
error()   { echo -e "${RED}✗ $1${RESET}"; exit 1; }

# Check macOS
if [[ "$(uname)" != "Darwin" ]]; then
  error "SkillDuck is currently macOS only."
fi

# Check architecture
ARCH=$(uname -m)
if [[ "$ARCH" != "arm64" ]]; then
  warn "SkillDuck currently supports Apple Silicon (arm64) only. Detected: $ARCH"
  exit 1
fi

info "Fetching latest SkillDuck release..."

# Resolve latest version — try multiple strategies to avoid API rate limits
VERSION=""

# 1. Use gh CLI if available (authenticated, no rate limit)
if command -v gh &>/dev/null; then
  VERSION=$(gh release view --repo "${REPO}" --json tagName -q '.tagName' 2>/dev/null | sed 's/^v//')
fi

# 2. Use GITHUB_TOKEN if set
if [[ -z "$VERSION" && -n "${GITHUB_TOKEN}" ]]; then
  VERSION=$(curl -fsSL \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep '"tag_name"' \
    | sed 's/.*"v\([^"]*\)".*/\1/')
fi

# 3. Follow the /releases/latest redirect to extract version from the URL
if [[ -z "$VERSION" ]]; then
  VERSION=$(curl -fsSI "https://github.com/${REPO}/releases/latest" \
    | grep -i "^location:" \
    | sed 's|.*/releases/tag/v||' \
    | tr -d '[:space:]')
fi

if [[ -z "$VERSION" ]]; then
  error "Could not fetch latest version. Check your internet connection."
fi

DMG="${APP_NAME}_${VERSION}_aarch64.dmg"
URL="https://github.com/${REPO}/releases/download/v${VERSION}/${DMG}"
TMP_DMG="/tmp/${DMG}"
MOUNT_POINT="/Volumes/${APP_NAME}"

info "Downloading SkillDuck v${VERSION}..."
curl -fsSL --progress-bar "$URL" -o "$TMP_DMG"
success "Downloaded ${DMG}"

info "Installing to ${INSTALL_DIR}..."

# Detach if already mounted
if [[ -d "$MOUNT_POINT" ]]; then
  hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
fi

hdiutil attach "$TMP_DMG" -mountpoint "$MOUNT_POINT" -quiet -nobrowse

# Remove existing installation
if [[ -d "${INSTALL_DIR}/${APP_NAME}.app" ]]; then
  rm -rf "${INSTALL_DIR}/${APP_NAME}.app"
fi

cp -R "${MOUNT_POINT}/${APP_NAME}.app" "${INSTALL_DIR}/"
hdiutil detach "$MOUNT_POINT" -quiet
rm "$TMP_DMG"
success "Installed ${APP_NAME}.app to ${INSTALL_DIR}"

info "Removing macOS quarantine attribute..."
xattr -dr com.apple.quarantine "${INSTALL_DIR}/${APP_NAME}.app"
success "Quarantine removed — app is ready to open"

echo ""
echo -e "${BOLD}SkillDuck v${VERSION} installed successfully.${RESET}"
echo "Open it from /Applications or run: open /Applications/SkillDuck.app"
