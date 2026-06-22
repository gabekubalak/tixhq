#!/usr/bin/env bash
# Install KrattOS for a specific site profile.
#
# Copies the repo into /opt/kratt, installs the services, sets KRATT_PROFILE,
# and enables the matching systemd target. Idempotent: re-running upgrades.
#
# Usage:
#   sudo bash scripts/install_profile.sh greenhouse-v1
#   sudo bash scripts/install_profile.sh cabinet-v1
#   sudo bash scripts/install_profile.sh shelf-mini-v1

set -euo pipefail

PROFILE="${1:-cabinet-v1}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DEST="/opt/kratt"

case "$PROFILE" in
  greenhouse-v1) TARGET="kratt-greenhouse.target" ;;
  shelf-mini-v1) TARGET="kratt-lite.target" ;;
  cabinet-v1)    TARGET="kratt.target" ;;
  *) echo "unknown profile: $PROFILE" >&2; exit 2 ;;
esac

if [ ! -f "$SRC/profiles/$PROFILE.yaml" ]; then
  echo "profile not found: $SRC/profiles/$PROFILE.yaml" >&2
  exit 2
fi

echo "==> Installing KrattOS to $DEST (profile: $PROFILE)"

# 1. Stage files. Skip node_modules/target/.git.
sudo mkdir -p "$DEST"
sudo rsync -a --delete \
  --exclude .git --exclude node_modules --exclude target \
  --exclude __pycache__ --exclude .svelte-kit --exclude build \
  "$SRC"/ "$DEST"/

# 2. User and dirs.
id -u kratt >/dev/null 2>&1 || sudo useradd --system --shell /usr/sbin/nologin kratt
sudo install -d -o kratt -g kratt /var/lib/kratt /var/log/kratt

# 3. systemd units.
sudo install -m 644 "$DEST"/infra/systemd/kratt*.service /etc/systemd/system/
sudo install -m 644 "$DEST"/infra/systemd/kratt*.target  /etc/systemd/system/

# 4. Profile selection.
echo "KRATT_PROFILE=$PROFILE"            | sudo tee  /etc/default/kratt >/dev/null
echo "KRATT_PROFILE_DIR=$DEST/profiles" | sudo tee -a /etc/default/kratt >/dev/null
echo "KRATT_PROFILE_SCHEMA=$DEST/schemas/kratt.site.profile.schema.json" | sudo tee -a /etc/default/kratt >/dev/null

# 5. Reload + enable target.
sudo systemctl daemon-reload
sudo systemctl enable --now "$TARGET"

echo "==> Done. Status:"
sudo systemctl --no-pager status "$TARGET" | head -8
