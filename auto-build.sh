#!/bin/bash
# Fully automated build - runs once Tailscale is authenticated

set -e

LAPTOP_IP="100.118.22.117"
PROJECT_DIR="$HOME/Desktop/Sinapse/frontend/iOS"

echo "🚀 Automated iOS Build"
echo "======================"

# Wait for Tailscale (max 30 seconds)
echo "⏳ Waiting for Tailscale..."
for i in {1..30}; do
    if tailscale status &>/dev/null; then
        REMOTE_IP=$(tailscale ip -4)
        echo "✅ Tailscale connected: $REMOTE_IP"
        break
    fi
    sleep 1
done

if ! tailscale status &>/dev/null; then
    echo "❌ Tailscale not authenticated. Run: sudo tailscale up"
    exit 1
fi

# Start iPhone tunnel
echo "📱 Starting iPhone tunnel to $LAPTOP_IP..."
/tmp/iphone-tunnel.sh $LAPTOP_IP &
TUNNEL_PID=$!
sleep 3

# Refresh devices
echo "🔄 Refreshing devices..."
sudo launchctl stop com.apple.usbmuxd 2>/dev/null || true
sleep 1
sudo launchctl start com.apple.usbmuxd 2>/dev/null || true
sleep 2

# Build
cd "$PROJECT_DIR"
echo "📦 Building Sinapse..."
xcodebuild clean -scheme Sinapse -configuration Release 2>&1 | grep -E "(Clean|error)" || true

xcodebuild -scheme Sinapse \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath build/Sinapse.xcarchive \
    archive 2>&1 | tee /tmp/build.log | tail -20

if [ -f "build/Sinapse.xcarchive" ]; then
    echo ""
    echo "✅ Build successful!"
    echo "Archive: build/Sinapse.xcarchive"
    
    # Try to export if ExportOptions exists
    if [ -f "ExportOptions.plist" ]; then
        echo "📤 Exporting IPA..."
        xcodebuild -exportArchive \
            -archivePath build/Sinapse.xcarchive \
            -exportOptionsPlist ExportOptions.plist \
            -exportPath build/ 2>&1 | tail -10
        
        if [ -f "build/Sinapse.ipa" ]; then
            echo "✅ IPA ready: build/Sinapse.ipa"
            echo ""
            echo "📱 Upload to TestFlight:"
            echo "   open -a Transporter build/Sinapse.ipa"
        fi
    fi
else
    echo "❌ Build failed. Check /tmp/build.log"
    exit 1
fi

echo ""
echo "Tunnel still running (PID: $TUNNEL_PID)"
echo "To stop: kill $TUNNEL_PID"
