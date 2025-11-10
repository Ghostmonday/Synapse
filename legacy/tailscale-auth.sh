#!/bin/bash

# Security: Exit on error, undefined vars, pipe failures
set -euo pipefail

echo "🔐 Tailscale Authentication"
echo "=========================="
echo ""
echo "I've opened the Tailscale admin page in your browser."
echo "Follow these steps:"
echo ""
echo "1. Sign in to Tailscale"
echo "2. Go to Settings → Keys"
echo "3. Click 'Generate auth key'"
echo "4. Copy the key (starts with 'tskey-')"
echo ""
read -p "Paste your Tailscale auth key here: " AUTH_KEY

if [ -z "$AUTH_KEY" ]; then
    echo "❌ No key provided"
    exit 1
fi

# Validate auth key format (starts with 'tskey-')
if [[ ! "$AUTH_KEY" =~ ^tskey- ]]; then
    echo "❌ Invalid auth key format (should start with 'tskey-')"
    exit 1
fi

echo ""
echo "🔗 Authenticating Tailscale..."
# Use --authkey with proper quoting to prevent injection
sudo tailscale up --authkey="$AUTH_KEY"

echo ""
echo "✅ Checking status..."
tailscale status

echo ""
echo "🌐 Your Tailscale IP:"
tailscale ip -4

echo ""
echo "✅ Tailscale is ready!"

