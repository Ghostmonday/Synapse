# Asset Placement Guide

Complete instructions for placing generated image assets in the iOS project.

## Location

All image assets go in:
```
frontend/iOS/Assets.xcassets/
```

## Folder Structure

Create the following folder structure inside `Assets.xcassets/`:

```
Assets.xcassets/
├── AppIcon.appiconset/          (already exists)
├── Images/
│   ├── Hero/
│   │   └── WelcomeHero.imageset/
│   │       ├── Contents.json
│   │       ├── WelcomeHero.png
│   │       ├── WelcomeHero@2x.png
│   │       └── WelcomeHero@3x.png
│   ├── Tiers/
│   │   ├── TierCardStarter.imageset/
│   │   │   ├── Contents.json
│   │   │   ├── TierCardStarter.png
│   │   │   ├── TierCardStarter@2x.png
│   │   │   └── TierCardStarter@3x.png
│   │   ├── TierCardPro.imageset/
│   │   │   ├── Contents.json
│   │   │   ├── TierCardPro.png
│   │   │   ├── TierCardPro@2x.png
│   │   │   └── TierCardPro@3x.png
│   │   └── TierCardEnterprise.imageset/
│   │       ├── Contents.json
│   │       ├── TierCardEnterprise.png
│   │       ├── TierCardEnterprise@2x.png
│   │       └── TierCardEnterprise@3x.png
│   ├── Paywall/
│   │   └── PaywallHero.imageset/
│   │       ├── Contents.json
│   │       ├── PaywallHero.png
│   │       ├── PaywallHero@2x.png
│   │       └── PaywallHero@3x.png
│   ├── Voice/
│   │   └── VoicePresenceWaveform.imageset/
│   │       ├── Contents.json
│   │       ├── VoicePresenceWaveform.png
│   │       ├── VoicePresenceWaveform@2x.png
│   │       └── VoicePresenceWaveform@3x.png
│   └── Marketing/
│       └── AppIconMarketing.imageset/
│           ├── Contents.json
│           └── AppIconMarketing.png
└── Animations/                   (in app bundle, not Assets.xcassets)
    ├── PresenceBreathingOrb.json
    ├── TypingIndicator.json
    ├── SuccessCheckmark.json
    ├── ConfettiPulse.json
    └── PaywallAttentionPulse.json
```

## Step-by-Step Instructions

### Method 1: Using Xcode (Recommended)

1. **Open Xcode** and navigate to your project
2. **Open Assets.xcassets** in the Project Navigator
3. **Right-click** on `Assets.xcassets` → **New Folder** → Name it `Images`
4. **Create subfolders**:
   - Right-click `Images` → **New Folder** → `Hero`
   - Right-click `Images` → **New Folder** → `Tiers`
   - Right-click `Images` → **New Folder** → `Paywall`
   - Right-click `Images` → **New Folder** → `Voice`
   - Right-click `Images` → **New Folder** → `Marketing`

5. **For each image set**:
   - Right-click the appropriate folder → **New Image Set**
   - Name it (e.g., `WelcomeHero`)
   - Drag your image files into the slots:
     - `WelcomeHero.png` → 1x slot
     - `WelcomeHero@2x.png` → 2x slot
     - `WelcomeHero@3x.png` → 3x slot

6. **For AppIconMarketing**:
   - Right-click `Marketing` → **New Image Set** → Name it `AppIconMarketing`
   - Drag `AppIconMarketing.png` into the 1x slot (or all slots if you have multiple sizes)

### Method 2: Manual File System

1. **Navigate to** `frontend/iOS/Assets.xcassets/`
2. **Create folders**:
   ```bash
   mkdir -p Images/Hero
   mkdir -p Images/Tiers
   mkdir -p Images/Paywall
   mkdir -p Images/Voice
   mkdir -p Images/Marketing
   ```

3. **Create each `.imageset` folder**:
   ```bash
   mkdir -p Images/Hero/WelcomeHero.imageset
   mkdir -p Images/Tiers/TierCardStarter.imageset
   mkdir -p Images/Tiers/TierCardPro.imageset
   mkdir -p Images/Tiers/TierCardEnterprise.imageset
   mkdir -p Images/Paywall/PaywallHero.imageset
   mkdir -p Images/Voice/VoicePresenceWaveform.imageset
   mkdir -p Images/Marketing/AppIconMarketing.imageset
   ```

4. **Copy image files** into each `.imageset` folder

5. **Create `Contents.json`** for each imageset (see templates below)

## Contents.json Templates

### For 3-Scale Images (WelcomeHero, TierCards, PaywallHero, VoicePresenceWaveform)

Create `Contents.json` in each `.imageset` folder:

```json
{
  "images" : [
    {
      "filename" : "WelcomeHero.png",
      "idiom" : "universal",
      "scale" : "1x"
    },
    {
      "filename" : "WelcomeHero@2x.png",
      "idiom" : "universal",
      "scale" : "2x"
    },
    {
      "filename" : "WelcomeHero@3x.png",
      "idiom" : "universal",
      "scale" : "3x"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  },
  "properties" : {
    "preserves-vector-representation" : false
  }
}
```

**Replace `WelcomeHero` with the actual image name** for each imageset.

### For Single-Scale Image (AppIconMarketing)

```json
{
  "images" : [
    {
      "filename" : "AppIconMarketing.png",
      "idiom" : "universal",
      "scale" : "1x"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  },
  "properties" : {
    "preserves-vector-representation" : false
  }
}
```

## Lottie Animations Placement

Lottie animations go in the **app bundle**, not in Assets.xcassets:

1. **Create folder** in Xcode:
   - Right-click your project → **New Group** → Name it `Animations`
   - Or create: `frontend/iOS/Animations/`

2. **Add JSON files**:
   - `PresenceBreathingOrb.json`
   - `TypingIndicator.json`
   - `SuccessCheckmark.json`
   - `ConfettiPulse.json`
   - `PaywallAttentionPulse.json`

3. **Ensure files are added to target**:
   - Select each JSON file → **File Inspector** → Check "Target Membership" → Select "Sinapse"

## Using Assets in Code

### Images

```swift
// In SwiftUI views
Image("WelcomeHero")
    .resizable()
    .aspectRatio(contentMode: .fit)

Image("TierCardPro")
    .resizable()
    .frame(width: 200, height: 200)

Image("PaywallHero")
    .resizable()
    .aspectRatio(contentMode: .fill)
```

### Lottie Animations

If using Lottie library:

```swift
import Lottie

LottieAnimationView(name: "PresenceBreathingOrb")
    .frame(width: 24, height: 24)
```

Or load from bundle:

```swift
if let url = Bundle.main.url(forResource: "PresenceBreathingOrb", withExtension: "json") {
    // Load animation
}
```

## Quick Reference: File Names

| Asset | @1x File | @2x File | @3x File |
|-------|----------|----------|----------|
| WelcomeHero | `WelcomeHero.png` | `WelcomeHero@2x.png` | `WelcomeHero@3x.png` |
| TierCardStarter | `TierCardStarter.png` | `TierCardStarter@2x.png` | `TierCardStarter@3x.png` |
| TierCardPro | `TierCardPro.png` | `TierCardPro@2x.png` | `TierCardPro@3x.png` |
| TierCardEnterprise | `TierCardEnterprise.png` | `TierCardEnterprise@2x.png` | `TierCardEnterprise@3x.png` |
| PaywallHero | `PaywallHero.png` | `PaywallHero@2x.png` | `PaywallHero@3x.png` |
| VoicePresenceWaveform | `VoicePresenceWaveform.png` | `VoicePresenceWaveform@2x.png` | `VoicePresenceWaveform@3x.png` |
| AppIconMarketing | `AppIconMarketing.png` | - | - |

## Verification Checklist

After placing assets:

- [ ] All `.imageset` folders created
- [ ] All image files copied to correct locations
- [ ] `Contents.json` created for each imageset
- [ ] Images appear in Xcode's Assets catalog
- [ ] Lottie JSON files added to app bundle
- [ ] Assets are included in target membership
- [ ] Build succeeds without missing asset errors
- [ ] Test images display correctly in app

## Troubleshooting

### Images not showing in Xcode
- Ensure `.imageset` folder names match exactly (case-sensitive)
- Check that `Contents.json` is valid JSON
- Verify filenames in `Contents.json` match actual files

### Images not loading in app
- Check asset name matches exactly: `Image("WelcomeHero")` (case-sensitive)
- Verify assets are included in target membership
- Clean build folder: **Product** → **Clean Build Folder** (⇧⌘K)

### Build errors
- Ensure all required @2x and @3x files are present
- Check file paths don't contain spaces or special characters
- Verify `Contents.json` syntax is correct

## Example: Complete WelcomeHero Setup

```
Assets.xcassets/
└── Images/
    └── Hero/
        └── WelcomeHero.imageset/
            ├── Contents.json
            ├── WelcomeHero.png          (414×896px)
            ├── WelcomeHero@2x.png       (828×1792px)
            └── WelcomeHero@3x.png       (1242×2688px)
```

**Contents.json:**
```json
{
  "images" : [
    {
      "filename" : "WelcomeHero.png",
      "idiom" : "universal",
      "scale" : "1x"
    },
    {
      "filename" : "WelcomeHero@2x.png",
      "idiom" : "universal",
      "scale" : "2x"
    },
    {
      "filename" : "WelcomeHero@3x.png",
      "idiom" : "universal",
      "scale" : "3x"
    }
  ],
  "info" : {
    "author" : "xcode",
    "version" : 1
  }
}
```

**Usage in code:**
```swift
Image("WelcomeHero")
    .resizable()
    .aspectRatio(contentMode: .fill)
    .ignoresSafeArea()
```

