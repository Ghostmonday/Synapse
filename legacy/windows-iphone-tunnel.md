# Windows iPhone Tunnel Setup

Since you're on Windows, we need a different approach. Here are options:

## Option 1: Use Windows USB-over-IP Tools

### Install libimobiledevice for Windows:
1. Download from: https://github.com/libimobiledevice-win32/libimobiledevice-win32
2. Or use Chocolatey: `choco install libimobiledevice`

### Then run:
```powershell
# Forward iPhone USB to TCP port
iproxy.exe 2222 22
```

## Option 2: Build Archive Only (No iPhone Tunnel Needed)

You can build the archive without connecting to iPhone directly:

1. **On Remote Mac** (where we are now):
   ```bash
   cd ~/Desktop/Sinapse/frontend/iOS
   xcodebuild -scheme Sinapse -configuration Release -destination 'generic/platform=iOS' -archivePath build/Sinapse.xcarchive archive
   ```

2. **Export IPA** (if ExportOptions.plist exists):
   ```bash
   xcodebuild -exportArchive -archivePath build/Sinapse.xcarchive -exportOptionsPlist ExportOptions.plist -exportPath build/
   ```

3. **Transfer IPA to Windows** and upload via Transporter or App Store Connect

## Option 3: Use Remote Desktop/VNC

If you have remote desktop access to a Mac with iPhone connected, you can build directly there.

## Recommended: Option 2 (Build Archive Only)

This is simplest - we'll build the archive on the remote Mac, export IPA, then you can upload from Windows.


