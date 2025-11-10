# 📱 Build Sinapse to iPhone 13 (Serial: HW2T7K3953)

## Quick Steps in Xcode:

1. **Xcode is now open** with your project

2. **Select your iPhone 13 as the build target:**
   - At the top of Xcode, next to the Play button, click the device selector
   - Look for "iPhone 13" or your device name
   - If you don't see it, make sure:
     - iPhone is connected to Windows laptop via USB
     - On Windows laptop, run: `iproxy 2222 22` (if using tunnel)
     - iPhone is unlocked and trusted

3. **Build and Run:**
   - Click the **Play button (▶️)** or press **Cmd+R**
   - Xcode will build and install the app directly to your iPhone 13

## If iPhone 13 doesn't appear:

**Option 1: Use USB Tunnel (if iPhone is on Windows laptop)**
```bash
# On Windows laptop (with iPhone connected):
iproxy 2222 22

# On this Mac (remote):
# iPhone should appear in Xcode device list
```

**Option 2: Build Archive and Transfer**
```bash
# Build archive (already done):
cd ~/Desktop/Sinapse/frontend/iOS
xcodebuild -scheme Sinapse -configuration Release -archivePath build/Sinapse.xcarchive archive

# Then use Xcode Organizer to install to iPhone
```

## Current Status:
- ✅ Xcode project open
- ✅ Build scripts ready
- ⏳ Waiting for iPhone 13 to appear in device list

**Just click the Play button in Xcode once your iPhone 13 appears in the device selector!**


