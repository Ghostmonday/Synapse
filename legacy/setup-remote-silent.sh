#!/bin/bash
# Silent Remote Mac Setup - Non-interactive parts

set -e

echo "🚀 Setting up remote Mac (non-interactive parts)..."

# Check Tailscale
if command -v tailscale &> /dev/null; then
    echo "✅ Tailscale installed"
    TAILSCALE_STATUS=$(tailscale status 2>&1 || echo "not running")
    if echo "$TAILSCALE_STATUS" | grep -q "logged in"; then
        echo "✅ Tailscale authenticated"
        TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")
        echo "🌐 Remote Tailscale IP: $TAILSCALE_IP"
    else
        echo "⚠️  Tailscale needs authentication"
        echo "   Run: sudo tailscale up"
    fi
else
    echo "📦 Installing Tailscale..."
    brew install tailscale
    brew services start tailscale
fi

# Check USB tools
if command -v iproxy &> /dev/null; then
    echo "✅ USB-over-IP tools installed"
else
    echo "📦 Installing USB-over-IP tools..."
    brew install libimobiledevice
fi

# Create scripts
echo "📝 Creating build scripts..."

# iPhone tunnel script
cat > /tmp/iphone-tunnel.sh << 'TUNNEL'
#!/bin/bash
LAPTOP_IP="$1"
if [ -z "$LAPTOP_IP" ]; then
    echo "Usage: iphone-tunnel.sh <LAPTOP_TAILSCALE_IP>"
    exit 1
fi
echo "📱 Tunneling iPhone from laptop $LAPTOP_IP..."
ssh -R 2222:localhost:22 -N -o StrictHostKeyChecking=no user@$LAPTOP_IP &
echo $! > /tmp/iphone-tunnel.pid
echo "Tunnel PID: $(cat /tmp/iphone-tunnel.pid)"
TUNNEL
chmod +x /tmp/iphone-tunnel.sh

# Device refresh script
cat > /tmp/refresh-devices.sh << 'REFRESH'
#!/bin/bash
sudo launchctl stop com.apple.usbmuxd 2>/dev/null || true
sleep 1
sudo launchctl start com.apple.usbmuxd 2>/dev/null || true
echo "✅ Devices refreshed"
REFRESH
chmod +x /tmp/refresh-devices.sh

# Build script
cat > /tmp/build-sinapse.sh << 'BUILD'
#!/bin/bash
set -e
cd ~/Desktop/Sinapse/frontend/iOS || cd ~/Sinapse/frontend/iOS
echo "📦 Building Sinapse..."
xcodebuild clean -scheme Sinapse -configuration Release 2>&1 | grep -E "(error|warning|succeeded)" || true
xcodebuild -scheme Sinapse -configuration Release -destination 'generic/platform=iOS' -archivePath build/Sinapse.xcarchive archive 2>&1 | tail -5
echo "✅ Build complete"
BUILD
chmod +x /tmp/build-sinapse.sh

echo ""
echo "✅ Setup complete (non-interactive parts)"
echo ""
echo "📝 Manual steps needed:"
echo "1. Authenticate Tailscale: sudo tailscale up"
echo "2. Enable SSH: sudo systemsetup -setremotelogin on"
echo "3. Get laptop Tailscale IP (run on laptop: tailscale ip -4)"
echo "4. On laptop: ./laptop-iphone-tunnel.sh"
echo "5. On remote: /tmp/iphone-tunnel.sh <LAPTOP_IP>"
echo "6. Build: /tmp/build-sinapse.sh"


