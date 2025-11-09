# App Icon Placement Guide

## 📱 Where Your App Icon Goes

Your app icon images go in:
```
frontend/iOS/Assets.xcassets/AppIcon.appiconset/
```

## 🎨 Required Icon Sizes

Place your golden synapse icon in the following sizes:

### iPhone Icons
- `AppIcon-20x20@2x.png` - 40×40px (Notification icon)
- `AppIcon-20x20@3x.png` - 60×60px (Notification icon, iPhone Pro)
- `AppIcon-29x29@2x.png` - 58×58px (Settings icon)
- `AppIcon-29x29@3x.png` - 87×87px (Settings icon, iPhone Pro)
- `AppIcon-40x40@2x.png` - 80×80px (Spotlight icon)
- `AppIcon-40x40@3x.png` - 120×120px (Spotlight icon, iPhone Pro)
- `AppIcon-60x60@2x.png` - 120×120px (Home screen, iPhone)
- `AppIcon-60x60@3x.png` - 180×180px (Home screen, iPhone Pro)

### iPad Icons
- `AppIcon-20x20@1x.png` - 20×20px
- `AppIcon-20x20@2x.png` - 40×40px
- `AppIcon-29x29@1x.png` - 29×29px
- `AppIcon-29x29@2x.png` - 58×58px
- `AppIcon-40x40@1x.png` - 40×40px
- `AppIcon-40x40@2x.png` - 80×80px
- `AppIcon-76x76@1x.png` - 76×76px (Home screen)
- `AppIcon-76x76@2x.png` - 152×152px (Home screen, iPad Pro)
- `AppIcon-83.5x83.5@2x.png` - 167×167px (iPad Pro 12.9")

### App Store Icon
- `AppIcon-1024x1024.png` - 1024×1024px (App Store listing)

## 🚀 Quick Setup

### Option 1: Use a Single 1024×1024 Image
If you have one high-resolution icon (1024×1024), you can:

1. **Generate all sizes** using an online tool or Xcode:
   - [AppIcon.co](https://www.appicon.co) - Upload 1024×1024, download all sizes
   - [IconKitchen](https://icon.kitchen) - Generate iOS icon sets
   - Xcode: Right-click AppIcon → "New iOS App Icon" → drag your 1024×1024 image

2. **Place all generated files** in:
   ```
   frontend/iOS/Assets.xcassets/AppIcon.appiconset/
   ```

### Option 2: Manual Placement
1. Export your golden synapse icon in all required sizes
2. Name them exactly as listed above
3. Place them in `Assets.xcassets/AppIcon.appiconset/`

## ✅ Verification in Xcode

1. Open `Sinapse.xcodeproj`
2. Select `Assets.xcassets` → `AppIcon`
3. You should see slots for all icon sizes
4. Drag your images into the appropriate slots
5. Xcode will automatically name them correctly

## 📋 Checklist

- [ ] 1024×1024 master icon ready
- [ ] All icon sizes generated (or use Xcode auto-generation)
- [ ] Images placed in `AppIcon.appiconset/` directory
- [ ] AppIcon added to Xcode project (if not already)
- [ ] Icons verified in Xcode asset catalog
- [ ] Build and test on device/simulator

## 🎯 Minimum Required

For a working app icon, you need at least:
- `AppIcon-60x60@2x.png` (120×120px) - iPhone home screen
- `AppIcon-60x60@3x.png` (180×180px) - iPhone Pro home screen
- `AppIcon-1024x1024.png` (1024×1024px) - App Store

But **all sizes are recommended** for best appearance across all contexts.

## 💡 Pro Tip

If you have a vector version (SVG/AI), export to PNG at 1024×1024, then use Xcode's auto-generation feature:
1. Select AppIcon in Assets.xcassets
2. Drag your 1024×1024 image to the "App Store" slot
3. Xcode will automatically generate all other sizes

---

**Location**: `frontend/iOS/Assets.xcassets/AppIcon.appiconset/`  
**Master Size**: 1024×1024px (golden synapse icon, no text)

