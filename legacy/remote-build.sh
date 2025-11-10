#!/bin/bash
# Remote iOS Build & TestFlight Submission Script
# Run this on the remote server via SSH

set -e

PROJECT_DIR="$HOME/Sinapse/frontend/iOS"
SCHEME="Sinapse"
CONFIGURATION="Release"

echo "🚀 Starting remote iOS build..."

# Navigate to project
cd "$PROJECT_DIR" || {
    echo "❌ Project directory not found: $PROJECT_DIR"
    exit 1
}

# Clean build folder
echo "🧹 Cleaning build folder..."
rm -rf build/
mkdir -p build/

# Archive
echo "📦 Creating archive..."
xcodebuild -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -destination 'generic/platform=iOS' \
    -archivePath build/Sinapse.xcarchive \
    archive || {
    echo "❌ Archive failed"
    exit 1
}

# Check for ExportOptions.plist
if [ ! -f "ExportOptions.plist" ]; then
    echo "⚠️  ExportOptions.plist not found. Creating default..."
    cat > ExportOptions.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
</dict>
</plist>
EOF
    echo "⚠️  Please edit ExportOptions.plist with your Team ID before exporting"
fi

# Export IPA
echo "📤 Exporting IPA..."
xcodebuild -exportArchive \
    -archivePath build/Sinapse.xcarchive \
    -exportOptionsPlist ExportOptions.plist \
    -exportPath build/ || {
    echo "❌ Export failed"
    exit 1
}

echo "✅ Build complete: build/Sinapse.ipa"
echo ""
echo "📱 Next: Upload to TestFlight"
echo "   xcrun altool --upload-app --file build/Sinapse.ipa --type ios --apiKey YOUR_API_KEY --apiIssuer YOUR_ISSUER_ID"

