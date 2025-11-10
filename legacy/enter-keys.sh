#!/bin/bash

set -euo pipefail

ENV_FILE=".env"

echo "This script will ask for secrets one at a time and write them to $ENV_FILE (kept local)."
echo "Input will be visible as you type."
echo "Press Ctrl+C to abort at any time."

read -p "Proceed? [y/N] " proceed

proceed=$(echo "$proceed" | tr '[:upper:]' '[:lower:]')

if [ "$proceed" != "y" ]; then
  echo "Aborted."
  exit 0
fi

# Prompt with clear text input and validate non-empty
prompt_secret() {
  local varname="$1"
  local prompt_text="$2"
  local val=""
  while true; do
    read -p "$prompt_text: " val
    if [ -z "$val" ]; then
      echo "Value cannot be empty. Try again."
    else
      read -p "Confirm $varname entered (y/N)? " conf
      conf=$(echo "$conf" | tr '[:upper:]' '[:lower:]')
      if [ "$conf" = "y" ]; then
        printf '%s\n' "$val"
        return 0
      else
        echo "Let's re-enter $varname."
      fi
    fi
  done
}

# Collect secrets
DEEPSEEK_API_KEY="$(prompt_secret DEEPSEEK_API_KEY 'Enter DEEPSEEK API KEY')"
LIVEKIT_API_KEY="$(prompt_secret LIVEKIT_API_KEY 'Enter LIVEKIT API KEY')"
LIVEKIT_API_SECRET="$(prompt_secret LIVEKIT_API_SECRET 'Enter LIVEKIT API SECRET')"
read -p "Enter LIVEKIT URL (example: wss://sinapse-xxxx.livekit.cloud): " LIVEKIT_URL

if [ -z "$LIVEKIT_URL" ]; then
  echo "LIVEKIT_URL cannot be empty. Exiting."
  exit 1
fi

# Write .env (overwrite) with safe permissions
cat > "$ENV_FILE" <<EOF
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
LIVEKIT_URL=${LIVEKIT_URL}
EOF

chmod 600 "$ENV_FILE"
echo "✅ $ENV_FILE written (permissions 600)."

# Offer to run lockdown.sh now
if [ -f "./lockdown.sh" ]; then
  read -p "Run ./lockdown.sh now? [y/N] " runnow
  runnow=$(echo "$runnow" | tr '[:upper:]' '[:lower:]')
  if [ "$runnow" = "y" ]; then
    echo "Running lockdown.sh..."
    ./lockdown.sh
  else
    echo "You can run ./lockdown.sh later. Done."
  fi
else
  echo "No lockdown.sh found in current directory. Create it first or move this script to the project root."
fi

