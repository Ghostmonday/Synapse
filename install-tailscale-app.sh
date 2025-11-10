#!/bin/bash
# Install Tailscale from App Store

echo "📦 Installing Tailscale from App Store..."

# Check if mas (Mac App Store CLI) is installed
if ! command -v mas &> /dev/null; then
    echo "Installing mas (Mac App Store CLI)..."
    brew install mas
fi

# Sign in to App Store (if needed)
echo "Signing in to App Store..."
mas signin

# Install Tailscale
echo "Installing Tailscale (ID: 1475387142)..."
mas install 1475387142

echo ""
echo "✅ Tailscale installed from App Store"
echo "Open it from Applications and sign in with GitHub"


