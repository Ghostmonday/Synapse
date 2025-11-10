#!/bin/bash
# Remote Mac Setup Script
# Run this on the remote Mac to set up Tailscale, Xcode, and iPhone tunneling

set -e

echo "🚀 Setting up remote Mac for iOS builds..."

# 1. Install Tailscale
if ! command -v tailscale &> /dev/null; then
    echo "📦 Installing Tailscale..."
    brew install tailscale
    brew services start tailscale
else
    echo "✅ Tailscale already installed"
fi

# 2. Authenticate Tailscale with GitHub OAuth
echo "🔐 Authenticating Tailscale with GitHub..."
sudo tailscale up --oauth-client-id=ts-client-github --oauth-scopes=read:org

# 3. Install USB-over-IP tools
echo "📱 Installing USB-over-IP tools..."
brew install libimobiledevice

# 4. Enable SSH
echo "🔑 Enabling SSH..."
sudo systemsetup -setremotelogin on

# 5. Get Tailscale IP
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")
echo "🌐 Remote Tailscale IP: $TAILSCALE_IP"

# 6. Create iPhone tunnel script
cat > /usr/local/bin/iphone-tunnel.sh << 'TUNNEL'
#!/bin/bash
# Run this to tunnel iPhone connection from laptop
# On laptop: iproxy 2222 22
# This script sets up the reverse tunnel

LAPTOP_IP="$1"
if [ -z "$LAPTOP_IP" ]; then
    echo "Usage: iphone-tunnel.sh <LAPTOP_TAILSCALE_IP>"
    exit 1
fi

echo "📱 Setting up iPhone tunnel from $LAPTOP_IP..."
ssh -R 2222:localhost:22 -N user@$LAPTOP_IP &
TUNNEL_PID=$!
echo "Tunnel PID: $TUNNEL_PID"
echo "Tunnel running. iPhone should appear in Xcode."
wait $TUNNEL_PID
TUNNEL

chmod +x /usr/local/bin/iphone-tunnel.sh

# 7. Create Xcode device refresh script
cat > /usr/local/bin/refresh-xcode-devices.sh << 'REFRESH'
#!/bin/bash
# Refresh Xcode device list
killall -9 com.apple.CoreSimulator.CoreSimulatorService 2>/dev/null || true
killall -9 com.apple.iphonesimulator 2>/dev/null || true
# Restart usbmuxd
sudo launchctl stop com.apple.usbmuxd
sudo launchctl start com.apple.usbmuxd
echo "✅ Xcode devices refreshed"
REFRESH

chmod +x /usr/local/bin/refresh-xcode-devices.sh

# 8. Create build script
cat > ~/build-sinapse.sh << 'BUILD'
#!/bin/bash
set -e

PROJECT_DIR="$HOME/Sinapse/frontend/iOS"
cd "$PROJECT_DIR"

echo "📦 Building Sinapse for iOS..."

# Clean
xcodebuild clean -scheme Sinapse -configuration Release

# Build and archive
xcodebuild -scheme Sinapse \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath build/Sinapse.xcarchive \
    archive

# Export IPA
if [ -f "ExportOptions.plist" ]; then
    xcodebuild -exportArchive \
        -archivePath build/Sinapse.xcarchive \
        -exportOptionsPlist ExportOptions.plist \
        -exportPath build/
    echo "✅ Build complete: build/Sinapse.ipa"
else
    echo "⚠️  ExportOptions.plist not found. Archive created at: build/Sinapse.xcarchive"
fi
BUILD

chmod +x ~/build-sinapse.sh

echo ""
echo "✅ Remote Mac setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Get your laptop's Tailscale IP: tailscale ip -4"
echo "2. On laptop, connect iPhone and run: iproxy 2222 22"
echo "3. On remote Mac, run: iphone-tunnel.sh <LAPTOP_IP>"
echo "4. Refresh Xcode devices: refresh-xcode-devices.sh"
echo "5. Open Xcode and iPhone should appear"
echo "6. Build: ~/build-sinapse.sh"


