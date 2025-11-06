# Xcode Project Setup for Sinapse iOS

## Quick Setup

### Option 1: Manual Xcode Project Creation (Recommended)

1. **Open Xcode**
2. **File > New > Project**
3. Select **iOS > App**
4. Configure:
   - **Product Name**: `Sinapse`
   - **Interface**: `SwiftUI`
   - **Language**: `Swift`
   - **Storage**: `None` (we'll use our own)
   - **Include Tests**: Optional
5. **Save location**: Choose the `frontend/iOS` directory
6. **Click Create**

### Option 2: Using xcodegen (Automated)

If you have `xcodegen` installed:

```bash
cd frontend/iOS
./create_xcode_project.sh
```

Or install xcodegen first:
```bash
brew install xcodegen
```

## After Project Creation

### 1. Add Source Files

1. In Xcode, right-click on the project root
2. Select **Add Files to "Sinapse"...**
3. Navigate to `frontend/iOS/`
4. Select all folders:
   - `Models/`
   - `ViewModels/`
   - `Views/`
   - `Services/`
   - `Managers/`
   - `Components/`
   - `Extensions/`
   - `SinapseApp.swift`
5. Check **"Create groups"** (not folder references)
6. Check **"Copy items if needed"** (uncheck if files are already in place)
7. Click **Add**

### 2. Configure Project Settings

1. Select the project in the navigator
2. Select the **Sinapse** target
3. **General Tab**:
   - **Deployment Target**: `iOS 17.0`
   - **Bundle Identifier**: `com.sinapse.app`
   - **Version**: `1.0`
   - **Build**: `1`

4. **Signing & Capabilities**:
   - Enable **Automatically manage signing**
   - Select your development team
   - Or configure manual signing

5. **Build Settings**:
   - **Swift Language Version**: `Swift 6` (or latest)
   - **iOS Deployment Target**: `17.0`

### 3. Update Info.plist

Add required permissions:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Sinapse needs microphone access for voice messages</string>
<key>NSCameraUsageDescription</key>
<string>Sinapse needs camera access for avatar photos</string>
```

### 4. Set Main Entry Point

1. Delete the default `ContentView.swift` if it exists
2. Ensure `SinapseApp.swift` is set as the main entry point
3. The `@main` attribute in `SinapseApp.swift` should handle this automatically

### 5. Configure API Base URL

1. Create a new file: `Config.swift` (optional)
2. Or set environment variable in scheme:
   - **Product > Scheme > Edit Scheme**
   - **Run > Arguments > Environment Variables**
   - Add: `API_BASE_URL` = `http://localhost:3000` (or your backend URL)

### 6. Build and Run

1. Select a simulator or device
2. **Product > Build** (⌘B) to compile
3. **Product > Run** (⌘R) to run

## Troubleshooting

### Build Errors

- **"Cannot find type 'X' in scope"**: Ensure all files are added to the target
- **"Module not found"**: Check that imports match available frameworks
- **"Use of undeclared type"**: Verify file is included in target membership

### Runtime Errors

- **Network errors**: Check `API_BASE_URL` configuration
- **Permission errors**: Verify Info.plist permissions
- **Crash on launch**: Check console for specific error messages

## StoreKit Configuration (for IAP)

1. **File > New > File**
2. Select **StoreKit Configuration File**
3. Name it `Products.storekit`
4. Add subscription products as needed

## TestFlight Deployment

1. **Product > Archive**
2. **Window > Organizer**
3. **Distribute App**
4. Follow TestFlight upload process

## Project Structure

```
Sinapse.xcodeproj/
├── SinapseApp.swift (main entry)
├── Models/
│   ├── User.swift
│   ├── Room.swift
│   ├── Message.swift
│   └── ...
├── ViewModels/
│   ├── PresenceViewModel.swift
│   └── ...
├── Views/
│   ├── MainTabView.swift
│   └── ...
├── Services/
│   ├── AuthService.swift
│   └── ...
├── Managers/
│   ├── APIClient.swift
│   └── ...
├── Components/
│   ├── MoodGradient.swift
│   └── ...
└── Extensions/
    ├── Color+Extensions.swift
    └── ...
```

## Next Steps

1. Configure backend API URL
2. Test authentication flow
3. Implement WebSocket for real-time messaging
4. Add error handling UI
5. Test on physical device

