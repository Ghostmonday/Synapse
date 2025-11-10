# Golden Synapse Theme - Assets Setup Guide

## Color Assets Setup (Xcode)

### Step 1: Open Assets.xcassets

1. In Xcode, navigate to `frontend/iOS/Sinapse.xcodeproj`
2. Open `Assets.xcassets` (or create it if it doesn't exist)
3. Right-click → "New Color Set"

### Step 2: Create Color Sets

Create the following 4 color sets:

#### SinapseGold
- **Name**: `SinapseGold`
- **Hex**: `#F5C04A`
- **Usage**: Primary accent, button text, active tab
- **Dark Mode Variant**: `#FFD700` @ 100% opacity

#### SinapseGoldDark
- **Name**: `SinapseGoldDark`
- **Hex**: `#D4A017`
- **Usage**: Pressed state, shadows
- **Dark Mode Variant**: `#B8860B` @ 100% opacity

#### SinapseDeep
- **Name**: `SinapseDeep`
- **Hex**: `#1A0F00`
- **Usage**: Backgrounds, navigation bars
- **Dark Mode Variant**: `#000000` @ 100% opacity

#### SinapseGlow
- **Name**: `SinapseGlow`
- **Hex**: `#FFD700` @ 60% opacity
- **Usage**: Subtle glow overlays
- **Dark Mode Variant**: `#FFD700` @ 40% opacity

### Step 3: Splash Background Image

1. Right-click in Assets.xcassets → "New Image Set"
2. **Name**: `SplashBackground`
3. **Universal**: Drop your 2048×2048 golden synapse icon (no text)
4. **1x, 2x, 3x**: Use same image (or provide @2x, @3x variants)

### Step 4: Launch Image (Optional - for custom launch screen)

1. Right-click in Assets.xcassets → "New Image Set"
2. **Name**: `LaunchImage`
3. **Universal**: Drop your 2048×2048 golden synapse icon (no text)
4. Update `Info.plist`:
   ```xml
   <key>UILaunchScreen</key>
   <dict>
       <key>UIImageName</key>
       <string>LaunchImage</string>
   </dict>
   ```

## Quick Setup Checklist

- [ ] SinapseGold color set created (#F5C04A)
- [ ] SinapseGoldDark color set created (#D4A017)
- [ ] SinapseDeep color set created (#1A0F00)
- [ ] SinapseGlow color set created (#FFD700 @ 60%)
- [ ] SplashBackground image set created
- [ ] LaunchImage image set created (optional)
- [ ] Dark mode variants configured
- [ ] Build and test

## Usage in Code

After creating assets, use them in SwiftUI:

```swift
Color("SinapseGold")        // Primary gold
Color("SinapseGoldDark")    // Darker gold for shadows
Color("SinapseDeep")        // Deep background
Color("SinapseGlow")        // Glow effect
```

Or use the convenience extensions:
```swift
Color.sinapseGold
Color.sinapseGoldDark
Color.sinapseDeep
Color.sinapseGlow
```

## Fallback Colors

If assets aren't created yet, the code uses fallback RGB values:
- SinapseGold: `UIColor(red: 0.96, green: 0.75, blue: 0.29, alpha: 1.0)`
- SinapseDeep: `UIColor(red: 0.10, green: 0.06, blue: 0.00, alpha: 1.0)`

