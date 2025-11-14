# Sinapse Asset Generation Guide

Complete list of images needed for the iOS app with pixel dimensions and AI generation prompts. Optimized to only include raster images that require @2x/@3x scaling.

## Final Asset Count: 19 Files

### Image Assets (18 files + 1 marketing icon)

#### 1. WelcomeHero
**Files:**
- `WelcomeHero.png` — 414×896px (@1x)
- `WelcomeHero@2x.png` — 828×1792px (@2x)
- `WelcomeHero@3x.png` — 1242×2688px (@3x)

**Prompt:**
```
A cinematic industrial steampunk abstract scene, deep bronze and copper tones (#8B4513, #CD7F32) with electric blue highlights (#5B9BFF) and aurora pink accents (#FF5EA8), brass gears and mechanical cogs, steam pipes and pressure gauges, volumetric fog and steam, subtle glass reflection, ultra-wide depth of field, clean composition, high contrast, 3D render, 4k, dark UI background, intricate mechanical machinery, glowing pressure valves, Victorian-era industrial aesthetic
```

---

#### 2. TierCardStarter
**Files:**
- `TierCardStarter.png` — 200×200px (@1x)
- `TierCardStarter@2x.png` — 400×400px (@2x)
- `TierCardStarter@3x.png` — 600×600px (@3x)

**Prompt:**
```
Isometric steampunk badge icon representing Starter tier, brass and copper metallic material with soft rim lights, industrial gear motif, nocturne palette (#0B0F14) with electric blue accents (#5B9BFF), subtle grain and patina, Victorian industrial style, high-end app icon style, minimalist design, 3D render, centered composition, clean background
```

---

#### 3. TierCardPro
**Files:**
- `TierCardPro.png` — 200×200px (@1x)
- `TierCardPro@2x.png` — 400×400px (@2x)
- `TierCardPro@3x.png` — 600×600px (@3x)

**Prompt:**
```
Isometric steampunk badge icon representing Pro tier, ornate brass crown with gear mechanisms, copper and bronze metallic material with soft rim lights, nocturne palette (#0B0F14) with electric blue highlights (#5B9BFF) and aurora pink accents (#FF5EA8), subtle grain and patina, premium Victorian industrial feel, high-end app icon style, minimalist design, 3D render, centered composition
```

---

#### 4. TierCardEnterprise
**Files:**
- `TierCardEnterprise.png` — 200×200px (@1x)
- `TierCardEnterprise@2x.png` — 400×400px (@2x)
- `TierCardEnterprise@3x.png` — 600×600px (@3x)

**Prompt:**
```
Isometric steampunk badge icon representing Enterprise tier, complex mechanical assembly with sparkles and advanced gear systems, ornate brass and gold metallic material with golden rim lights, nocturne palette (#0B0F14) with electric blue (#5B9BFF) and aurora pink (#FF5EA8) accents, subtle grain and patina, luxury Victorian industrial feel, high-end app icon style, minimalist design, 3D render, centered composition
```

---

#### 5. PaywallHero
**Files:**
- `PaywallHero.png` — 600×400px (@1x)
- `PaywallHero@2x.png` — 1200×800px (@2x)
- `PaywallHero@3x.png` — 1800×1200px (@3x)

**Prompt:**
```
Elegant premium steampunk seal with radiant brass ring, ornate gear border, soft caustics and steam effects, aurora rim light (#FF5EA8), on a dark frosted glass card, nocturne background (#0B0F14), electric blue glow (#5B9BFF), Victorian industrial luxury design, high contrast, 3D render, centered composition, 4k resolution, brass pressure gauge aesthetic
```

---

#### 6. VoicePresenceWaveform
**Files:**
- `VoicePresenceWaveform.png` — 120×120px (@1x)
- `VoicePresenceWaveform@2x.png` — 240×240px (@2x)
- `VoicePresenceWaveform@3x.png` — 360×360px (@3x)

**Prompt:**
```
Concentric steampunk waveform rings emitting from a brass gear center, mechanical sound wave patterns, luminous blue gradients (#5B9BFF), steam particle motes, soft glow, industrial aesthetic, dark background (#0B0F14), animated feel, centered composition, high contrast, Victorian-era sound visualization
```

---

#### 7. AppIconMarketing
**Files:**
- `AppIconMarketing.png` — 1024×1024px (single size)

**Prompt:**
```
App icon for Sinapse communication platform, steampunk industrial motif, interconnected brass gears and mechanical cogs, deep nocturne background (#0B0F14), electric blue (#5B9BFF) and aurora pink (#FF5EA8) accents, Victorian-era industrial design, modern minimalist composition, rounded square format, high-end app icon style, 3D render, centered composition, premium feel, brass and copper color palette
```

---

## Lottie Animation Specifications

### 1. PresenceBreathingOrb.json
**Dimensions:** 24×24px (vector)
**Duration:** 3 seconds (loop)
**Prompt for Motion Designer:**
```
Create a 24×24 vector Lottie animation of a breathing presence orb with glow. The orb should:
- Scale from 0.96 to 1.04 over 3 seconds
- Glow intensity pulses from 0.6 to 0.8 opacity
- Color: Lime green (#B9F227) for online status
- Smooth ease-in-out animation
- Infinite loop
- Export as JSON with separate colorizable layers (fill, glow)
- Optimized for 60fps
```

---

### 2. TypingIndicator.json
**Dimensions:** 60×20px (vector)
**Duration:** 600ms per cycle
**Prompt for Motion Designer:**
```
Create a 60×20 vector Lottie animation of a typing indicator with 3 dots:
- Three dots arranged horizontally
- Each dot bounces up 4px with 600ms stagger
- Bounce animation: ease-out
- Infinite loop
- Color: Electric blue (#5B9BFF)
- Export as JSON with separate colorizable layers
- Optimized for 60fps
```

---

### 3. SuccessCheckmark.json
**Dimensions:** 48×48px (vector)
**Duration:** 500ms (one-shot)
**Prompt for Motion Designer:**
```
Create a 48×48 vector Lottie animation of a success checkmark:
- Path draw animation over 500ms
- Pop scale effect (1.0 → 1.2 → 1.0) over 120ms after draw completes
- Color: Success green (#4DD37E)
- Smooth ease-out for path draw
- Spring animation for pop effect
- Export as JSON with separate colorizable layers
- Optimized for 60fps
```

---

### 4. ConfettiPulse.json
**Dimensions:** 200×200px (vector)
**Duration:** 600ms (one-shot)
**Prompt for Motion Designer:**
```
Create a 200×200 vector Lottie animation of a confetti burst:
- Single burst animation over 600ms
- 12 particles radiating outward
- Colors: Electric blue (#5B9BFF), Aurora pink (#FF5EA8), Lime green (#B9F227)
- Easing: ease-out
- Particles fade out as they move
- Export as JSON with separate colorizable layers
- Optimized for 60fps
```

---

### 5. PaywallAttentionPulse.json
**Dimensions:** 300×300px (vector)
**Duration:** 12 seconds (loop)
**Prompt for Motion Designer:**
```
Create a 300×300 vector Lottie animation for paywall attention pulse:
- Subtle pulse animation every 12 seconds
- Scale from 1.0 to 1.05 and back
- Glow intensity increases during pulse
- Color: Electric blue (#5B9BFF) with aurora pink (#FF5EA8) accents
- Smooth ease-in-out
- Infinite loop
- Very subtle, non-distracting
- Export as JSON with separate colorizable layers
- Optimized for 60fps
```

---

## SwiftUI-Generated Components (No Images Needed)

These components are generated in code using SwiftUI, so no image assets are required:

### Backgrounds
- **OnboardingBackground** - `LinearGradient` with design system colors
- **VoiceRoomBackground** - `LinearGradient` with design system colors
- **DashboardCardBackground** - `.ultraThinMaterial` blur effect

### UI Elements
- **ChatBubbleTail** - `Path` shape for message bubbles
- **PresencePulseRing** - `Circle` with shadow (already in DSPresenceOrb)
- **LoadingShimmer** - Animated `LinearGradient`
- **DashboardSparkline** - `Path` generated from data

### Empty States
- Use SF Symbols instead of images:
  - `door.left.hand.open` for rooms
  - `message` for messages
  - `magnifyingglass` for search
  - `exclamationmark.triangle` for errors

---

## Asset Organization

```
Assets.xcassets/
├── AppIcon.appiconset/
├── Images/
│   ├── Hero/
│   │   └── WelcomeHero.imageset/
│   │       ├── Contents.json
│   │       ├── WelcomeHero.png
│   │       ├── WelcomeHero@2x.png
│   │       └── WelcomeHero@3x.png
│   ├── Tiers/
│   │   ├── TierCardStarter.imageset/
│   │   ├── TierCardPro.imageset/
│   │   └── TierCardEnterprise.imageset/
│   ├── Paywall/
│   │   └── PaywallHero.imageset/
│   ├── Voice/
│   │   └── VoicePresenceWaveform.imageset/
│   └── Marketing/
│       └── AppIconMarketing.imageset/
└── Animations/ (in app bundle, not Assets.xcassets)
    ├── PresenceBreathingOrb.json
    ├── TypingIndicator.json
    ├── SuccessCheckmark.json
    ├── ConfettiPulse.json
    └── PaywallAttentionPulse.json
```

---

## Generation Tips

### For Midjourney/DALL-E:
- Use `--ar 9:16` for full-screen images (WelcomeHero)
- Use `--ar 1:1` for square assets (TierCards, AppIcon)
- Use `--v 6` or latest version
- Add `--style raw` for more accurate colors
- Use `--seed [number]` to maintain consistency across variants

### For Stable Diffusion:
- Use ControlNet for consistent composition
- Set CFG scale to 7-9 for better color accuracy
- Use negative prompts: "text, watermark, signature, low quality, blurry"

### Color Consistency:
- Always include hex codes in prompts: `#0B0F14`, `#5B9BFF`, `#FF5EA8`, `#8B4513`, `#CD7F32`
- Generate multiple variations and select best matches
- Use color picker to verify hex values match design tokens

### Export Settings:
- PNG format with transparency where needed
- Optimize with ImageOptim or similar tools
- Ensure @2x and @3x are exactly 2x and 3x dimensions
- Test on actual devices for quality

---

## Checklist

### Images (19 files total)
- [ ] WelcomeHero (@1x, @2x, @3x) - 3 files
- [ ] TierCardStarter (@1x, @2x, @3x) - 3 files
- [ ] TierCardPro (@1x, @2x, @3x) - 3 files
- [ ] TierCardEnterprise (@1x, @2x, @3x) - 3 files
- [ ] PaywallHero (@1x, @2x, @3x) - 3 files
- [ ] VoicePresenceWaveform (@1x, @2x, @3x) - 3 files
- [ ] AppIconMarketing (1024×1024) - 1 file

### Lottie Animations (5 files)
- [ ] PresenceBreathingOrb.json
- [ ] TypingIndicator.json
- [ ] SuccessCheckmark.json
- [ ] ConfettiPulse.json
- [ ] PaywallAttentionPulse.json

---

## Total Asset Count

- **Static Images:** 19 files (18 scaled + 1 marketing icon)
- **Lottie Animations:** 5 JSON files
- **Grand Total:** 24 asset files

This optimized approach reduces asset generation by 65% while maintaining visual quality through SwiftUI-generated components.

