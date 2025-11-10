#!/bin/bash
# Build directly to iPhone 13 (Serial: HW2T7K3953)

set -e

PROJECT_DIR="$HOME/Desktop/Sinapse/frontend/iOS"
SERIAL="HW2T7K3953"

echo "📱 Building Sinapse to iPhone 13 (Serial: $SERIAL)"
echo "=================================================="

cd "$PROJECT_DIR"

# Try to find device by serial
echo "🔍 Looking for iPhone 13..."

# List all devices
ALL_DEVICES=$(xcrun xctrace list devices 2>&1)
echo "$ALL_DEVICES"

# Try to get device info
DEVICE_INFO=$(system_profiler SPUSBDataType 2>&1 | grep -A 20 -i "iphone" | grep -i "serial\|udid" || echo "")

# For now, use generic iOS device destination
# Xcode will prompt to select device if multiple are available
echo ""
echo "📦 Building for iOS device..."

xcodebuild -scheme Sinapse \
    -configuration Debug \
    -destination 'generic/platform=iOS' \
    -derivedDataPath build/DerivedData \
    CODE_SIGN_IDENTITY="iPhone Developer" \
    DEVELOPMENT_TEAM="R7KX4HNBFY" \
    build 2>&1 | tee /tmp/iphone13-build.log | grep -E "(error|warning|succeeded|BUILD|CodeSign)" | tail -30

if grep -q "BUILD SUCCEEDED" /tmp/iphone13-build.log; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "To install on iPhone 13:"
    echo "1. Open Xcode"
    echo "2. Select your iPhone 13 as the build target"
    echo "3. Click Run (▶️) or press Cmd+R"
    echo ""
    echo "Or use: xcodebuild -scheme Sinapse -destination 'generic/platform=iOS' install"
else
    echo ""
    echo "❌ Build failed. Check /tmp/iphone13-build.log"
    exit 1
fi


