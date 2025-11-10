#!/bin/bash

# Remote iOS Build Setup Script
# Sets up Tailscale, SSH, USB-over-IP, and remote Xcode building

set -e

echo "🚀 Remote iOS Build Setup"
echo "=========================="

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo "❌ This script is for macOS only"
    exit 1
fi

# 1. Install Tailscale
echo ""
echo "📦 Installing Tailscale..."
if ! command -v tailscale &> /dev/null; then
    brew install tailscale
else
    echo "✅ Tailscale already installed"
fi

# 2. Start Tailscale (will prompt for auth)
echo ""
echo "🔐 Starting Tailscale..."
echo "You'll need to authenticate. Get your auth key from:"
echo "https://login.tailscale.com/admin/settings/keys"
echo ""
read -p "Enter Tailscale auth key (or press Enter to skip and do manually): " TAILSCALE_KEY

if [ -n "$TAILSCALE_KEY" ]; then
    sudo tailscale up --authkey="$TAILSCALE_KEY"
else
    echo "Run manually: sudo tailscale up"
fi

# 3. Install USB-over-IP tools
echo ""
echo "📱 Installing USB-over-IP tools..."
brew tap libimobiledevice/libimobiledevice
brew install usbmuxd libimobiledevice

# 4. Get Tailscale IP
echo ""
echo "🌐 Getting Tailscale IP..."
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")
if [ -z "$TAILSCALE_IP" ]; then
    echo "⚠️  Could not get Tailscale IP. Make sure Tailscale is running."
    echo "Run: sudo tailscale up"
else
    echo "✅ Your Tailscale IP: $TAILSCALE_IP"
fi

# 5. SSH setup instructions
echo ""
echo "🔑 SSH Setup Instructions:"
echo "=========================="
echo "1. On remote server, ensure SSH is enabled:"
echo "   sudo systemsetup -setremotelogin on"
echo ""
echo "2. Ensure port 22 is open in firewall:"
echo "   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/sbin/sshd"
echo "   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/sbin/sshd"
echo ""
echo "3. SSH into remote (replace REMOTE_TAILSCALE_IP):"
echo "   ssh username@REMOTE_TAILSCALE_IP"
echo ""

# 6. USB-over-IP setup
echo ""
echo "📱 USB-over-IP Setup:"
echo "===================="
echo "On your laptop (where iPhone is connected):"
echo "1. Connect iPhone via USB"
echo "2. Run: iproxy 2222 22"
echo ""
echo "On remote server:"
echo "1. SSH tunnel: ssh -R 2222:localhost:22 user@REMOTE_TAILSCALE_IP"
echo "2. Or use: ssh -L 2222:localhost:2222 user@REMOTE_TAILSCALE_IP"
echo ""

# 7. Xcode remote build script
cat > remote-build.sh << 'REMOTEBUILD'
#!/bin/bash
# Run this on the remote server

set -e

PROJECT_DIR="/path/to/Sinapse/frontend/iOS"
SCHEME="Sinapse"
CONFIGURATION="Release"

cd "$PROJECT_DIR"

# Build for device
xcodebuild -scheme "$SCHEME" \
    -configuration "$CONFIGURATION" \
    -destination 'generic/platform=iOS' \
    -archivePath build/Sinapse.xcarchive \
    archive

# Export IPA
xcodebuild -exportArchive \
    -archivePath build/Sinapse.xcarchive \
    -exportOptionsPlist ExportOptions.plist \
    -exportPath build/

echo "✅ Build complete: build/Sinapse.ipa"
REMOTEBUILD

chmod +x remote-build.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Get Tailscale auth key from: https://login.tailscale.com/admin/settings/keys"
echo "2. Run: sudo tailscale up --authkey=YOUR_KEY"
echo "3. On remote: sudo tailscale up --authkey=YOUR_KEY"
echo "4. SSH into remote: ssh user@REMOTE_TAILSCALE_IP"
echo "5. On laptop: iproxy 2222 22 (with iPhone connected)"
echo "6. On remote: xcodebuild -list (to verify Xcode setup)"
echo "7. Run: ./remote-build.sh"
echo ""

