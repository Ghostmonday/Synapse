# Assets Placement Guide

## ✅ Assets.xcassets Structure Created

The `Assets.xcassets` directory structure has been created at:
```
frontend/iOS/Assets.xcassets/
├── Contents.json
├── SinapseGold.colorSet/
│   └── Contents.json
├── SinapseGoldDark.colorSet/
│   └── Contents.json
├── SinapseDeep.colorSet/
│   └── Contents.json
├── SinapseGlow.colorSet/
│   └── Contents.json
├── SplashBackground.imageset/
│   ├── Contents.json
│   ├── SplashBackground.png (add your 1x image here)
│   ├── SplashBackground@2x.png (add your 2x image here)
│   └── SplashBackground@3x.png (add your 3x image here)
└── LaunchImage.imageset/
    ├── Contents.json
    ├── LaunchImage.png (add your 1x image here)
    ├── LaunchImage@2x.png (add your 2x image here)
    └── LaunchImage@3x.png (add your 3x image here)
```

## 📋 Next Steps in Xcode

### 1. Add Assets.xcassets to Xcode Project

1. Open `Sinapse.xcodeproj` in Xcode
2. Right-click on the project in the navigator
3. Select "Add Files to Sinapse..."
4. Navigate to `frontend/iOS/Assets.xcassets`
5. Check "Create groups" (not "Create folder references")
6. Click "Add"

### 2. Add Image Files

**SplashBackground Images:**
- Place your golden synapse icon (no text) in:
  - `Assets.xcassets/SplashBackground.imageset/SplashBackground.png` (1x - 1024×1024)
  - `Assets.xcassets/SplashBackground.imageset/SplashBackground@2x.png` (2x - 2048×2048)
  - `Assets.xcassets/SplashBackground.imageset/SplashBackground@3x.png` (3x - 3072×3072)

**LaunchImage Images:**
- Same golden synapse icon for launch screen:
  - `Assets.xcassets/LaunchImage.imageset/LaunchImage.png` (1x)
  - `Assets.xcassets/LaunchImage.imageset/LaunchImage@2x.png` (2x)
  - `Assets.xcassets/LaunchImage.imageset/LaunchImage@3x.png` (3x)

### 3. Verify Color Sets

The color sets are already configured with:
- **SinapseGold**: #F5C04A (light) / #FFD700 (dark mode)
- **SinapseGoldDark**: #D4A017 (light) / #B8860B (dark mode)
- **SinapseDeep**: #1A0F00 (light) / #000000 (dark mode)
- **SinapseGlow**: #FFD700 @ 60% opacity (light) / 40% (dark mode)

You can verify/edit these in Xcode by:
1. Selecting `Assets.xcassets` in the navigator
2. Clicking on each color set
3. Adjusting colors in the inspector if needed

### 4. Update Info.plist (Optional - for Launch Image)

If you want to use the LaunchImage for the launch screen:

1. Open `Info.plist`
2. Add or update:
   ```xml
   <key>UILaunchScreen</key>
   <dict>
       <key>UIImageName</key>
       <string>LaunchImage</string>
   </dict>
   ```

## 🎨 Color Reference

| Color Set | Hex (Light) | Hex (Dark) | Usage |
|-----------|-------------|------------|-------|
| SinapseGold | #F5C04A | #FFD700 | Primary accent, buttons |
| SinapseGoldDark | #D4A017 | #B8860B | Shadows, pressed states |
| SinapseDeep | #1A0F00 | #000000 | Backgrounds, nav bars |
| SinapseGlow | #FFD700 @ 60% | #FFD700 @ 40% | Glow effects |

## 📝 Quick Checklist

- [ ] Assets.xcassets added to Xcode project
- [ ] SplashBackground images added (1x, 2x, 3x)
- [ ] LaunchImage images added (1x, 2x, 3x)
- [ ] Color sets verified in Xcode
- [ ] Info.plist updated (optional)
- [ ] Build and test - verify colors appear correctly

## 🚀 Usage in Code

After adding to Xcode, use in SwiftUI:

```swift
Color("SinapseGold")        // Primary gold
Color("SinapseGoldDark")    // Darker gold
Color("SinapseDeep")        // Deep background
Color("SinapseGlow")        // Glow effect

Image("SplashBackground")   // Splash screen image
Image("LaunchImage")        // Launch screen image
```

---

**Status**: Directory structure created ✅  
**Next**: Add images and verify in Xcode

