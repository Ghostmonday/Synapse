#!/bin/bash

echo "🚀 Starting Tailscale..."
echo ""

# Try to start Tailscale daemon
echo "Starting Tailscale daemon (requires sudo)..."
sudo /opt/homebrew/opt/tailscale/bin/tailscaled 2>&1 &
sleep 2

# Check if it's running
if tailscale status &>/dev/null; then
    echo "✅ Tailscale is running!"
    echo ""
    echo "Now authenticate with:"
    echo "  sudo tailscale up"
    echo ""
    echo "Or with auth key:"
    echo "  sudo tailscale up --authkey=YOUR_KEY"
else
    echo "⚠️  Tailscale daemon may need manual start"
    echo ""
    echo "Try running in Terminal:"
    echo "  sudo /opt/homebrew/opt/tailscale/bin/tailscaled"
    echo ""
    echo "Then in another terminal:"
    echo "  sudo tailscale up"
fi


