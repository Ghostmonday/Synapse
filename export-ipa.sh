#!/bin/bash
# Export .ipa from Xcode archive for Windows transfer

set -e

ARCHIVE_PATH="$HOME/Desktop/Sinapse/frontend/iOS/build/Sinapse.xcarchive"
EXPORT_PATH="$HOME/Desktop/Sinapse"
TEAM_ID="R7KX4HNBFY"

echo "📦 Exporting .ipa from archive"
echo "=============================="

if [ ! -d "$ARCHIVE_PATH" ]; then
    echo "❌ Archive not found at: $ARCHIVE_PATH"
    exit 1
fi

echo "✅ Archive found: $ARCHIVE_PATH"
echo ""

# Create ExportOptions.plist for Development distribution
cat > "$EXPORT_PATH/ExportOptions-Dev.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>teamID</key>
    <string>$TEAM_ID</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>manageAppVersionAndBuildNumber</key>
    <true/>
</dict>
</plist>
EOF

echo "📤 Exporting .ipa (Development distribution)..."
cd "$HOME/Desktop/Sinapse/frontend/iOS"

xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportOptionsPlist "$EXPORT_PATH/ExportOptions-Dev.plist" \
    -exportPath "$EXPORT_PATH" \
    2>&1 | tee /tmp/export.log | tail -20

if [ -f "$EXPORT_PATH/Sinapse.ipa" ]; then
    echo ""
    echo "✅ .ipa exported successfully!"
    echo "Location: $EXPORT_PATH/Sinapse.ipa"
    echo ""
    echo "📊 File size:"
    ls -lh "$EXPORT_PATH/Sinapse.ipa"
    echo ""
    MAC_IP=$(tailscale ip -4 2>&1 || echo "Not connected")
    echo "🌐 Remote Mac Tailscale IP: $MAC_IP"
    echo ""
    echo "Next steps:"
    echo "1. On Windows, open File Explorer"
    echo "2. Type in address bar: \\\\$MAC_IP\\"
    echo "3. Or enable File Sharing on Mac and share Desktop folder"
    echo "4. Copy Sinapse.ipa to Windows"
else
    echo ""
    echo "⚠️  Export may have failed. Check /tmp/export.log"
    echo ""
    echo "Trying Xcode Organizer method..."
fi


