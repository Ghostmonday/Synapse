# 🚀 Final Build Steps

## Current Status
- ✅ Remote Mac: rentamacs-Mac-mini.local
- ✅ Laptop Tailscale IP: 100.118.22.117
- ✅ Project located: ~/Desktop/Sinapse/frontend/iOS
- ⚠️  Tailscale needs authentication

## Step 1: Authenticate Tailscale (REQUIRED)

Run in Terminal:
```bash
sudo tailscale up
```

This will either:
- Show a login URL (open in browser)
- Or prompt for auth key

## Step 2: On Your Laptop

Connect iPhone via USB, then run:
```bash
cd ~/Desktop/Sinapse
./laptop-iphone-tunnel.sh
```

Keep this terminal open.

## Step 3: Build on Remote Mac

Once Tailscale is authenticated, run:
```bash
cd ~/Desktop/Sinapse
./build-now.sh
```

This will:
1. Set up iPhone tunnel to laptop (100.118.22.117)
2. Refresh Xcode devices
3. Build Sinapse for iOS
4. Create archive ready for TestFlight

## Alternative: Direct Build (No iPhone Tunnel)

If you just want to build the archive (no direct device install):
```bash
cd ~/Desktop/Sinapse/frontend/iOS
xcodebuild -scheme Sinapse -configuration Release -destination 'generic/platform=iOS' -archivePath build/Sinapse.xcarchive archive
```

## TestFlight Upload

After build completes:
```bash
# Using Transporter (easiest)
open -a Transporter build/Sinapse.ipa

# Or using xcrun altool
xcrun altool --upload-app --file build/Sinapse.ipa --type ios --apiKey YOUR_KEY --apiIssuer YOUR_ISSUER
```

## Quick Commands

**Check Tailscale:**
```bash
tailscale status
tailscale ip -4
```

**Check iPhone tunnel:**
```bash
ps aux | grep iphone-tunnel
```

**Check Xcode devices:**
```bash
xcrun xctrace list devices
```


