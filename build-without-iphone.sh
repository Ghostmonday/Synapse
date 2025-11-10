#!/bin/bash
# Build iOS app without iPhone connection
# This creates an archive/IPA ready for TestFlight

set -e

PROJECT_DIR="$HOME/Desktop/Sinapse/frontend/iOS"

echo "🚀 Building Sinapse for iOS (Archive Mode)"
echo "=========================================="

cd "$PROJECT_DIR"

# Clean
echo "🧹 Cleaning..."
xcodebuild clean -scheme Sinapse -configuration Release 2>&1 | grep -E "(Clean|error)" || true

# Build archive
echo ""
echo "📦 Creating archive..."
xcodebuild -scheme Sinapse \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath build/Sinapse.xcarchive \
    archive 2>&1 | tee /tmp/build.log | grep -E "(error|warning|succeeded|Archive)" | tail -20

# Check result
if [ -d "build/Sinapse.xcarchive" ]; then
    echo ""
    echo "✅ Archive created: build/Sinapse.xcarchive"
    
    # Try to export IPA
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
            echo "📱 Next steps:"
            echo "1. Transfer build/Sinapse.ipa to your Windows computer"
            echo "2. Upload via App Store Connect web interface"
            echo "   OR use iTunes/Apple Configurator on Windows"
            echo ""
            echo "File location:"
            echo "$(pwd)/build/Sinapse.ipa"
        else
            echo ""
            echo "⚠️  IPA export may have failed. Archive is ready:"
            echo "build/Sinapse.xcarchive"
        fi
    else
        echo ""
        echo "⚠️  ExportOptions.plist not found"
        echo "Archive created: build/Sinapse.xcarchive"
        echo ""
        echo "To export IPA, create ExportOptions.plist with:"
        echo "  - method: app-store"
        echo "  - teamID: YOUR_TEAM_ID"
    fi
else
    echo ""
    echo "❌ Build failed. Check /tmp/build.log"
    exit 1
fi


