#!/bin/bash
# Build script - works once Tailscale is authenticated

set -e

LAPTOP_IP="100.118.22.117"

echo "🚀 Remote iOS Build"
echo "==================="
echo ""

# Check Tailscale
if ! tailscale status &>/dev/null; then
    echo "❌ Tailscale not authenticated"
    echo "Run: sudo tailscale up"
    exit 1
fi

REMOTE_IP=$(tailscale ip -4)
echo "Remote Tailscale IP: $REMOTE_IP"
echo "Laptop Tailscale IP: $LAPTOP_IP"
echo ""

# Test connectivity
echo "🔍 Testing connectivity..."
if ping -c 1 -W 2 $LAPTOP_IP &>/dev/null; then
    echo "✅ Laptop reachable"
else
    echo "⚠️  Cannot ping laptop (may still work via SSH)"
fi

# Start tunnel
echo "📱 Starting iPhone tunnel..."
/tmp/iphone-tunnel.sh $LAPTOP_IP &
TUNNEL_PID=$!
sleep 2
echo "Tunnel running (PID: $TUNNEL_PID)"
echo ""

# Refresh devices (may need sudo)
echo "🔄 Refreshing devices..."
sudo launchctl stop com.apple.usbmuxd 2>/dev/null || true
sleep 1
sudo launchctl start com.apple.usbmuxd 2>/dev/null || true
sleep 2

# Check devices
echo "📱 Checking for iPhone..."
xcrun xctrace list devices 2>/dev/null | grep -i iphone || echo "iPhone not detected yet"

# Navigate to project
cd ~/Desktop/Sinapse/frontend/iOS 2>/dev/null || cd ~/Sinapse/frontend/iOS 2>/dev/null || {
    echo "❌ Project directory not found"
    exit 1
}

# Build
echo ""
echo "📦 Building Sinapse..."
xcodebuild clean -scheme Sinapse -configuration Release 2>&1 | grep -E "(error|warning|Clean Succeeded)" || true

xcodebuild -scheme Sinapse \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath build/Sinapse.xcarchive \
    archive 2>&1 | tail -10

echo ""
echo "✅ Build complete!"
echo "Archive: build/Sinapse.xcarchive"
echo ""
echo "To export IPA, ensure ExportOptions.plist exists, then:"
echo "xcodebuild -exportArchive -archivePath build/Sinapse.xcarchive -exportOptionsPlist ExportOptions.plist -exportPath build/"


