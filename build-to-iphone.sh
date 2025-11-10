#!/bin/bash
# Build and deploy directly to iPhone

set -e

PROJECT_DIR="$HOME/Desktop/Sinapse/frontend/iOS"
LAPTOP_IP="100.118.22.117"

echo "📱 Building Sinapse directly to iPhone"
echo "======================================"

cd "$PROJECT_DIR"

# Check if iPhone tunnel is needed
echo "🔍 Checking for iPhone..."
DEVICES=$(xcrun xctrace list devices 2>&1 | grep -i iphone || echo "")

if [ -z "$DEVICES" ]; then
    echo "⚠️  No iPhone detected"
    echo "Setting up tunnel to laptop ($LAPTOP_IP)..."
    
    # Start tunnel in background
    /tmp/iphone-tunnel.sh $LAPTOP_IP &
    TUNNEL_PID=$!
    sleep 5
    
    # Refresh devices
    sudo launchctl stop com.apple.usbmuxd 2>/dev/null || true
    sleep 1
    sudo launchctl start com.apple.usbmuxd 2>/dev/null || true
    sleep 3
    
    DEVICES=$(xcrun xctrace list devices 2>&1 | grep -i iphone || echo "")
fi

if [ -z "$DEVICES" ]; then
    echo "❌ iPhone still not detected"
    echo ""
    echo "Make sure:"
    echo "1. iPhone is connected to Windows laptop via USB"
    echo "2. On Windows laptop, run: iproxy 2222 22"
    echo "3. iPhone is unlocked and trusted"
    exit 1
fi

echo "✅ iPhone detected:"
echo "$DEVICES"

# Get device UDID
DEVICE_UDID=$(echo "$DEVICES" | head -1 | grep -oE '[a-f0-9]{40}' | head -1)

if [ -z "$DEVICE_UDID" ]; then
    echo "⚠️  Could not parse device UDID, trying generic build..."
    DESTINATION="generic/platform=iOS"
else
    echo "📱 Building for device: $DEVICE_UDID"
    DESTINATION="id=$DEVICE_UDID"
fi

# Build and install
echo ""
echo "📦 Building and installing..."
xcodebuild -scheme Sinapse \
    -configuration Debug \
    -destination "$DESTINATION" \
    -derivedDataPath build/DerivedData \
    build 2>&1 | tee /tmp/iphone-build.log | grep -E "(error|warning|succeeded|BUILD)" | tail -20

# Check result
if grep -q "BUILD SUCCEEDED" /tmp/iphone-build.log; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "Installing to iPhone..."
    xcodebuild -scheme Sinapse \
        -configuration Debug \
        -destination "$DESTINATION" \
        -derivedDataPath build/DerivedData \
        install 2>&1 | tail -10
    
    echo ""
    echo "✅ App installed on iPhone!"
else
    echo ""
    echo "❌ Build failed. Check /tmp/iphone-build.log"
    exit 1
fi


