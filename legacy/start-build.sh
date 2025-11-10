#!/bin/bash
# Complete automated build process

set -e

LAPTOP_IP="100.118.22.117"
REMOTE_IP=$(tailscale ip -4 2>&1 || echo "")

echo "🚀 Starting remote iOS build..."
echo "Laptop IP: $LAPTOP_IP"
echo "Remote IP: $REMOTE_IP"
echo ""

# Check if we can reach laptop
if ping -c 1 -W 1 $LAPTOP_IP &>/dev/null; then
    echo "✅ Laptop reachable via Tailscale"
else
    echo "⚠️  Cannot reach laptop. Make sure:"
    echo "   1. Tailscale is running on both machines"
    echo "   2. Both machines are authenticated"
    echo "   3. Laptop is running: ./laptop-iphone-tunnel.sh"
    exit 1
fi

# Start iPhone tunnel in background
echo "📱 Setting up iPhone tunnel..."
/tmp/iphone-tunnel.sh $LAPTOP_IP &
TUNNEL_PID=$!
sleep 3

# Refresh devices
echo "🔄 Refreshing Xcode devices..."
/tmp/refresh-devices.sh 2>&1 || echo "Note: May need sudo for device refresh"
sleep 2

# Check for iPhone
echo "🔍 Checking for iPhone..."
if xcrun xctrace list devices 2>/dev/null | grep -i iphone; then
    echo "✅ iPhone detected!"
else
    echo "⚠️  iPhone not detected yet"
    echo "   Make sure laptop is running: ./laptop-iphone-tunnel.sh"
fi

# Build
echo "📦 Building Sinapse..."
cd ~/Desktop/Sinapse/frontend/iOS || cd ~/Sinapse/frontend/iOS
/tmp/build-sinapse.sh

# Keep tunnel running
echo ""
echo "✅ Build complete!"
echo "Tunnel PID: $TUNNEL_PID (keep running)"
echo "To stop tunnel: kill $TUNNEL_PID"


