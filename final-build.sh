#!/bin/bash
# Final automated build - runs once Tailscale GUI is authenticated

set -e

LAPTOP_IP="100.118.22.117"
PROJECT_DIR="$HOME/Desktop/Sinapse/frontend/iOS"

echo "🚀 Final iOS Build"
echo "=================="

# Wait for Tailscale (check both CLI and GUI)
echo "⏳ Checking Tailscale connection..."
for i in {1..60}; do
    # Try CLI first
    if tailscale status &>/dev/null 2>&1; then
        REMOTE_IP=$(tailscale ip -4 2>/dev/null || echo "")
        echo "✅ Tailscale connected via CLI: $REMOTE_IP"
        break
    fi
    # Check if GUI app is running
    if ps aux | grep -i "Tailscale.app" | grep -v grep &>/dev/null; then
        echo "⏳ Tailscale GUI running, waiting for authentication..."
    fi
    sleep 1
done

# Test connectivity to laptop
echo "🔍 Testing connection to laptop ($LAPTOP_IP)..."
if ping -c 1 -W 2 $LAPTOP_IP &>/dev/null 2>&1; then
    echo "✅ Laptop reachable"
else
    echo "⚠️  Cannot ping laptop - may still work via SSH tunnel"
fi

# Start iPhone tunnel if we can reach laptop
echo "📱 Setting up iPhone tunnel..."
/tmp/iphone-tunnel.sh $LAPTOP_IP 2>&1 &
TUNNEL_PID=$!
sleep 3
echo "Tunnel PID: $TUNNEL_PID"

# Refresh devices
echo "🔄 Refreshing Xcode devices..."
sudo launchctl stop com.apple.usbmuxd 2>/dev/null || true
sleep 1
sudo launchctl start com.apple.usbmuxd 2>/dev/null || true
sleep 2

# Check for iPhone
echo "📱 Checking for iPhone..."
xcrun xctrace list devices 2>/dev/null | grep -i iphone || echo "iPhone not detected - will build generic archive"

# Build
cd "$PROJECT_DIR"
echo ""
echo "📦 Building Sinapse..."
echo "======================"

# Clean
xcodebuild clean -scheme Sinapse -configuration Release 2>&1 | grep -E "(Clean|error|warning)" || true

# Archive
xcodebuild -scheme Sinapse \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath build/Sinapse.xcarchive \
    archive 2>&1 | tee /tmp/build.log | grep -E "(error|warning|succeeded|Archive)" | tail -20

# Check result
if [ -d "build/Sinapse.xcarchive" ]; then
    echo ""
    echo "✅ Build successful!"
    echo "Archive: build/Sinapse.xcarchive"
    
    # Try export if ExportOptions exists
    if [ -f "ExportOptions.plist" ]; then
        echo ""
        echo "📤 Exporting IPA..."
        xcodebuild -exportArchive \
            -archivePath build/Sinapse.xcarchive \
            -exportOptionsPlist ExportOptions.plist \
            -exportPath build/ 2>&1 | tail -15
        
        if [ -f "build/Sinapse.ipa" ]; then
            echo ""
            echo "✅ IPA ready: build/Sinapse.ipa"
            echo ""
            echo "📱 Upload to TestFlight:"
            echo "   open -a Transporter build/Sinapse.ipa"
        fi
    else
        echo ""
        echo "⚠️  ExportOptions.plist not found"
        echo "   Archive created: build/Sinapse.xcarchive"
        echo "   Create ExportOptions.plist to export IPA"
    fi
else
    echo ""
    echo "❌ Build failed. Check /tmp/build.log"
    exit 1
fi

echo ""
echo "Tunnel running (PID: $TUNNEL_PID)"
echo "To stop: kill $TUNNEL_PID"


