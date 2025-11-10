# 🚀 Quick Remote iOS Build Guide

## Step 1: Tailscale Setup

### On Your Laptop:
```bash
# Tailscale is already installed and started
# Get auth key from: https://login.tailscale.com/admin/settings/keys
sudo tailscale up --authkey=YOUR_AUTH_KEY_HERE
```

### On Remote Server:
```bash
# Install Tailscale
brew install tailscale
brew services start tailscale

# Authenticate
sudo tailscale up --authkey=YOUR_AUTH_KEY_HERE
```

## Step 2: SSH Setup

### On Remote Server:
```bash
# Enable SSH
sudo systemsetup -setremotelogin on

# Open port 22 in firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/sbin/sshd
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp /usr/sbin/sshd
```

### Get Tailscale IPs:
```bash
# On laptop
tailscale ip -4

# On remote
tailscale ip -4
```

## Step 3: USB-over-IP Setup

### On Your Laptop (where iPhone is connected):
```bash
# Install tools (already done)
brew install libimobiledevice

# Connect iPhone via USB, then run:
iproxy 2222 22
```

### On Remote Server:
```bash
# SSH into remote with port forwarding
ssh -L 2222:localhost:2222 user@REMOTE_TAILSCALE_IP

# Or if using direct Tailscale connection:
# The iPhone will appear as if connected locally
```

## Step 4: Build & Deploy

### On Remote Server:
```bash
# Navigate to project
cd ~/Sinapse/frontend/iOS

# Open Xcode (if needed)
open Sinapse.xcodeproj

# Or build via command line:
./remote-build.sh

# Or manually:
xcodebuild -scheme Sinapse \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath build/Sinapse.xcarchive \
    archive

# Export for TestFlight
xcodebuild -exportArchive \
    -archivePath build/Sinapse.xcarchive \
    -exportOptionsPlist ExportOptions.plist \
    -exportPath build/
```

## Step 5: TestFlight Submission

```bash
# Using xcrun altool (deprecated, use App Store Connect API)
xcrun altool --upload-app \
    --file build/Sinapse.ipa \
    --type ios \
    --apiKey YOUR_API_KEY \
    --apiIssuer YOUR_ISSUER_ID

# Or use Transporter app:
open -a Transporter build/Sinapse.ipa
```

## Quick Commands Summary

**Laptop:**
```bash
# Start USB proxy
iproxy 2222 22
```

**Remote:**
```bash
# SSH in
ssh user@REMOTE_TAILSCALE_IP

# Build
cd ~/Sinapse/frontend/iOS && ./remote-build.sh
```

## Troubleshooting

**iPhone not detected:**
- Make sure `iproxy 2222 22` is running on laptop
- Check iPhone is unlocked and trusted
- Try: `idevice_id -l` to list devices

**Xcode can't see device:**
- Restart Xcode
- Check Window → Devices and Simulators
- Ensure same Apple ID on both machines

**Build fails:**
- Check code signing certificates
- Verify provisioning profiles
- Check ExportOptions.plist has correct Team ID

