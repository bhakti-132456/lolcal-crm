#!/bin/bash
# AXON CRM: Sovereign Launcher v2.7
# OPERATION: METADATA EXORCISM

# Setup correct working directory (crucial for macOS double-clicks)
cd "$(dirname "$0")" || exit

# Attempt to load nvm or user path so npm can be found in non-interactive shell
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
if [ -s "$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="$HOME/.nvm"
    \. "$NVM_DIR/nvm.sh"
elif [ -f "$HOME/.zshrc" ]; then
    source "$HOME/.zshrc" 2>/dev/null || true
fi

echo "AXON: PURGING macOS METADATA JUNK (AppleDouble files)..."
# Recursive nuclear purge to prevent PocketBase migration crashes
find . -name "._*" -delete 2>/dev/null
sync && sleep 1

echo "AXON: EXPLODING VITE CACHE..."
# Force a clean re-bundle to resolve white screen issues
rm -rf node_modules/.vite

echo "AXON: Initiating Aggressive Ghost Hunter..."
# Target the specific ports and anyone named pocketbase
lsof -ti:1420,8091,9081,11435 | xargs kill -9 2>/dev/null
pkill -9 -f pocketbase 2>/dev/null
pkill -9 -f llama-server 2>/dev/null
pkill -9 -f axon 2>/dev/null
sleep 2

echo "AXON: Backing up current Vault state..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p vault_backups

# DATA PERSISTENCE: Safe auto-backup (copy instead of move)
if [ -d "AXON_VAULT" ]; then cp -R AXON_VAULT "vault_backups/AXON_VAULT_$TIMESTAMP"; fi

# Cleanup old legacy folders if they exist
if [ -d "pb_data" ]; then mv pb_data "vault_backups/pb_data_root_$TIMESTAMP"; fi

echo "AXON: Launching STABILIZED CORE on Port 9081..."
# Start the dev environment
npm run tauri dev
