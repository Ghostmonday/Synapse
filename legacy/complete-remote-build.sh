#!/bin/bash
# Complete Remote Build Automation
# Run this on REMOTE MAC after Tailscale is set up

set -e

# Get laptop IP from user
read -p "Enter your laptop's Tailscale IP: " LAPTOP_IP

if [ -z "$LAPTOP_IP" ]; then
    echo "❌ Laptop IP required"
    exit 1
fi

echo "🚀 Starting complete remote build process..."

# 1. Start iPhone tunnel in background
echo "📱 Setting up iPhone tunnel..."
/usr/local/bin/iphone-tunnel.sh "$LAPTOP_IP" &
TUNNEL_PID=$!
sleep 3

# 2. Refresh Xcode devices
echo "🔄 Refreshing Xcode devices..."
/usr/local/bin/refresh-xcode-devices.sh
sleep 2

# 3. Verify iPhone appears
echo "🔍 Checking for iPhone..."
if xcrun xctrace list devices 2>/dev/null | grep -i iphone; then
    echo "✅ iPhone detected!"
else
    echo "⚠️  iPhone not detected yet. Make sure:"
    echo "   1. iPhone is connected to laptop via USB"
    echo "   2. Laptop is running: ./laptop-iphone-tunnel.sh"
    echo "   3. iPhone is unlocked and trusted"
fi

# 4. Build
echo "📦 Building Sinapse..."
~/build-sinapse.sh

# 5. Cleanup
kill $TUNNEL_PID 2>/dev/null || true

echo ""
echo "✅ Build complete!"


