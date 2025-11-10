# 🚀 Remote iOS Build Setup - Complete Guide

## Overview
This setup allows you to build iOS apps on a remote Mac and deploy directly to your iPhone connected to your laptop, all over Tailscale.

## Step 1: Setup Remote Mac

**SSH into your remote Mac, then run:**
```bash
cd ~/Sinapse
./remote-mac-setup.sh
```

This will:
- Install Tailscale
- Authenticate with GitHub OAuth
- Install USB-over-IP tools
- Enable SSH
- Create build scripts

## Step 2: Setup Laptop

**On your laptop (where iPhone is connected):**
```bash
cd ~/Desktop/Sinapse
./laptop-iphone-tunnel.sh
```

Keep this terminal open - it tunnels your iPhone to the remote Mac.

## Step 3: Build on Remote Mac

**SSH into remote Mac, then:**
```bash
cd ~/Sinapse
./complete-remote-build.sh
```

Or manually:
```bash
# Start tunnel (replace with your laptop's Tailscale IP)
iphone-tunnel.sh YOUR_LAPTOP_TAILSCALE_IP

# Refresh Xcode devices
refresh-xcode-devices.sh

# Build
~/build-sinapse.sh
```

## Step 4: Verify iPhone in Xcode

On remote Mac:
```bash
# Open Xcode
open ~/Sinapse/frontend/iOS/Sinapse.xcodeproj

# Or check devices via command line
xcrun xctrace list devices
```

Your iPhone should appear in Xcode's device list.

## Step 5: Build & Deploy

In Xcode:
1. Select your iPhone as the build target
2. Click "Build and Run" (Cmd+R)
3. App will install directly to your iPhone over the tunnel

## Troubleshooting

**iPhone not showing:**
```bash
# Restart usbmuxd on remote
sudo launchctl stop com.apple.usbmuxd
sudo launchctl start com.apple.usbmuxd

# Refresh devices
refresh-xcode-devices.sh

# Check tunnel is running
ps aux | grep iphone-tunnel
```

**Build fails:**
- Check code signing certificates are installed on remote Mac
- Verify provisioning profiles
- Check Xcode can see your Apple Developer account

**Tunnel not working:**
- Verify Tailscale is connected on both machines: `tailscale status`
- Check laptop IP is correct: `tailscale ip -4` (on laptop)
- Ensure `iproxy 2222 22` is running on laptop

## Quick Commands

**Get Tailscale IPs:**
```bash
# On laptop
tailscale ip -4

# On remote
tailscale ip -4
```

**Check iPhone connection:**
```bash
# On laptop
idevice_id -l

# On remote (after tunnel)
xcrun xctrace list devices
```

## Files Created

- `remote-mac-setup.sh` - Run on remote Mac (one-time setup)
- `laptop-iphone-tunnel.sh` - Run on laptop (each build session)
- `complete-remote-build.sh` - Run on remote Mac (automated build)
- `iphone-tunnel.sh` - Installed to `/usr/local/bin/` on remote
- `refresh-xcode-devices.sh` - Installed to `/usr/local/bin/` on remote
- `build-sinapse.sh` - Installed to `~/` on remote


