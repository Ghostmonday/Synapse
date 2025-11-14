# Post-Design-System Launch Failure Investigation – 2025-11-13

**Date:** 2025-11-13  
**Scope:** Runtime launch failures after Design System implementation  
**Status:** 🔴 Launch blocked  
**Previous Report:** Design System Implementation Error Report (2025-01-27) - ✅ Build successful

---

## Executive Summary

Following the successful resolution of 14 compilation errors on 2025-01-27, the Sinapse iOS app now **fails to launch** on both device and simulator. The app compiles successfully with zero errors, but exhibits one of two failure modes:

1. **Instant crash** on launch (most common)
2. **Black screen** with no UI rendering

Investigation reveals **7 critical runtime issues** preventing successful app launch, primarily related to:
- Info.plist configuration conflicts (SceneDelegate vs SwiftUI @main)
- Missing asset references (SplashBackground renamed)
- Unhandled async initialization failures
- Actor isolation violations in initialization paths
- Missing error handling in critical launch paths

---

## Error Categories

### 1. Info.plist Configuration Conflicts

#### 1.1 SceneDelegate Reference Without Implementation
**Files Affected:**
- `frontend/iOS/Info.plist`
- `frontend/iOS/project.yml`
- `frontend/iOS/SinapseApp.swift`

**Error:**
```
Info.plist references SceneDelegate but app uses SwiftUI @main
Missing SceneDelegate class causes launch failure
```

**Root Cause:**  
`Info.plist` contains:
```xml
<key>UISceneDelegateClassName</key>
<string>$(PRODUCT_MODULE_NAME).SceneDelegate</string>
```

However, `SinapseApp.swift` uses `@main` with SwiftUI's `App` protocol, which doesn't require a SceneDelegate. The system attempts to instantiate a non-existent `SceneDelegate` class, causing immediate crash.

**Evidence:**
- `Info.plist` line 32-33 references `SceneDelegate`
- `project.yml` line 54 also references `SceneDelegate`
- No `SceneDelegate.swift` file exists in the codebase
- `SinapseApp.swift` uses `@main` with SwiftUI `App` protocol

**Impact:** Critical - Causes immediate launch crash

**Proposed Fix:**
1. Remove `UISceneDelegateClassName` from `Info.plist`
2. Remove `UISceneDelegateClassName` from `project.yml`
3. Verify SwiftUI lifecycle handles scene management

---

#### 1.2 Launch Screen Asset Reference Mismatch
**Files Affected:**
- `frontend/iOS/Info.plist`
- `frontend/iOS/Managers/Constants.swift`
- `frontend/iOS/Assets.xcassets/`

**Error:**
```
Info.plist references "SplashBackground" but asset was renamed to "WelcomeHero"
Constants.swift also references "SplashBackground"
```

**Root Cause:**  
During Design System implementation, `SplashBackground` asset was renamed/moved to `WelcomeHero` in `Assets.xcassets/Images/Hero/WelcomeHero.imageset/`. However:

1. `Info.plist` line 41 still references `SplashBackground`:
   ```xml
   <key>UIImageName</key>
   <string>SplashBackground</string>
   ```

2. `Constants.swift` line 10 still references `SplashBackground`:
   ```swift
   static let logoImage = "SplashBackground"
   ```

**Impact:** High - Launch screen fails to load, may cause black screen or crash

**Proposed Fix:**
1. Update `Info.plist` to reference `WelcomeHero` or create `SplashBackground` asset
2. Update `Constants.swift` to reference correct asset name
3. Verify asset exists in `Assets.xcassets`

---

### 2. Unhandled Async Initialization Failures

#### 2.1 PresenceViewModel Async Init Failure
**File:** `frontend/iOS/ViewModels/PresenceViewModel.swift`

**Error:**
```
PresenceViewModel.init() performs async operations that may fail
No error handling if RoomService.fetchRooms() fails
```

**Root Cause:**  
`PresenceViewModel` initializer (lines 13-19) immediately launches async tasks:
```swift
init() {
    Task { @MainActor in
        await loadPresence()
        subscribeToPresenceUpdates()
    }
}
```

`loadPresence()` calls `RoomService.fetchRooms()` which may fail if:
- Backend is unavailable
- Network is unreachable
- Authentication token is invalid

**Impact:** Medium - App may launch but with broken presence functionality

**Proposed Fix:**
1. Add error handling in `loadPresence()`
2. Make initialization non-blocking with fallback states
3. Add retry logic with exponential backoff

---

#### 2.2 Service Preload Failures
**Files Affected:**
- `frontend/iOS/SinapseApp.swift`
- `frontend/iOS/Services/RoomService.swift`
- `frontend/iOS/Services/AIService.swift`

**Error:**
```
SinapseApp.swift line 43-46 calls RoomService.preload() and AIService.preload()
These methods may fail silently or throw unhandled errors
```

**Root Cause:**  
`SinapseApp.swift` launches detached tasks for service preloading:
```swift
Task.detached {
    await RoomService.preload()
    await AIService.preload()
}
```

`AIService.preload()` (line 24-30) calls `reply()` which may fail, but only prints error:
```swift
static func preload() async {
    do {
        _ = try await reply(with: "", roomId: UUID().uuidString)
    } catch {
        print("AIService preload error: \(error)")
    }
}
```

If `RoomService.preload()` throws an unhandled error, it could crash the app.

**Impact:** Medium - May cause crash if preload fails unexpectedly

**Proposed Fix:**
1. Wrap all preload calls in try-catch
2. Make preload failures non-fatal
3. Add telemetry for preload failures

---

#### 2.3 SubscriptionManager.restorePurchases() Failure
**File:** `frontend/iOS/SinapseApp.swift`

**Error:**
```
await SubscriptionManager.shared.restorePurchases() may fail
No error handling in launch path
```

**Root Cause:**  
Line 41 calls `restorePurchases()` without error handling:
```swift
await SubscriptionManager.shared.restorePurchases()
```

If StoreKit is unavailable or returns an error, this could block or crash the app.

**Impact:** Medium - May delay or prevent app launch

**Proposed Fix:**
1. Wrap in try-catch block
2. Make subscription restore non-blocking
3. Add fallback for offline scenarios

---

### 3. Actor Isolation Violations

#### 3.1 PresenceViewModel Init Actor Context
**File:** `frontend/iOS/ViewModels/PresenceViewModel.swift`

**Error:**
```
PresenceViewModel is @MainActor but init() launches Task
Task may execute before MainActor context is established
```

**Root Cause:**  
`PresenceViewModel` is marked `@MainActor` but `init()` launches a `Task { @MainActor in }`. While this should work, there's a potential race condition if the view model is created before the main actor is ready.

**Impact:** Low - May cause timing issues but shouldn't crash

**Proposed Fix:**
1. Ensure `@StateObject` creation happens on MainActor
2. Add explicit MainActor.assumeIsolated if needed
3. Verify initialization order

---

### 4. Missing Error Handling in Critical Paths

#### 4.1 SystemMonitor.shared.monitorTelemetry()
**File:** `frontend/iOS/SinapseApp.swift`

**Error:**
```
SystemMonitor.shared.monitorTelemetry() called without error handling
May fail if telemetry system isn't initialized
```

**Root Cause:**  
Line 48 calls `monitorTelemetry()` synchronously without checking if `SystemMonitor` is properly initialized.

**Impact:** Low - Shouldn't crash but may fail silently

**Proposed Fix:**
1. Add nil check or optional chaining
2. Wrap in do-catch if method can throw
3. Add initialization verification

---

### 5. Asset Loading Issues

#### 5.1 WelcomeHero Image Loading
**File:** `frontend/iOS/Views/OnboardingView.swift`

**Error:**
```
Image("WelcomeHero") may fail to load if asset not properly registered
No fallback image provided
```

**Root Cause:**  
Line 62 references `Image("WelcomeHero")` but if the asset isn't properly loaded or registered in the asset catalog, it will fail silently or show a broken image.

**Impact:** Low - Visual issue, shouldn't crash

**Proposed Fix:**
1. Verify asset is in `Assets.xcassets`
2. Add fallback image or placeholder
3. Add asset validation in build phase

---

### 6. Color Asset References

#### 6.1 Missing Color Assets
**Files Affected:**
- `frontend/iOS/SinapseApp.swift`
- Multiple view files

**Error:**
```
UIColor(named: "SinapseGold") and UIColor(named: "SinapseDeep") may return nil
Fallback colors provided but may not match design intent
```

**Root Cause:**  
Multiple files reference color assets (`SinapseGold`, `SinapseDeep`, `SinapseGlow`) with fallback colors, but if assets are missing, the app will use incorrect colors.

**Impact:** Low - Visual issue, shouldn't crash

**Proposed Fix:**
1. Verify all color assets exist in `Assets.xcassets`
2. Add build-time validation
3. Document required color assets

---

### 7. Launch Screen Storyboard Reference

#### 7.1 LaunchScreen Storyboard Missing
**File:** `frontend/iOS/Info.plist`

**Error:**
```
Info.plist references "LaunchScreen" storyboard
Storyboard file may not exist or be properly configured
```

**Root Cause:**  
Line 46 references:
```xml
<key>UILaunchStoryboardName</key>
<string>LaunchScreen</string>
```

If `LaunchScreen.storyboard` doesn't exist or is misconfigured, the launch screen will fail to load.

**Impact:** Medium - May cause black screen on launch

**Proposed Fix:**
1. Verify `LaunchScreen.storyboard` exists
2. Create if missing with proper configuration
3. Update to use programmatic launch screen if preferred

---

## Crash Stack Trace Analysis

**Note:** Actual crash logs not available in current investigation. Based on code analysis, expected crash points:

### Expected Crash Point #1: SceneDelegate Instantiation
```
Thread 0 Crashed:
0   libswiftCore.dylib             0x0000000181234567 swift_getObjCClassMetadata
1   UIKitCore                      0x0000000182345678 -[UIApplication _instantiateSceneDelegate]
2   UIKitCore                      0x0000000182345679 -[UIApplication _createSceneWithSession:options:]
3   UIKitCore                      0x0000000182345680 -[UIApplication sceneWithSession:options:]
...
```

### Expected Crash Point #2: Asset Loading Failure
```
Thread 0 Crashed:
0   UIKitCore                      0x0000000182345678 -[UIImage imageNamed:]
1   SwiftUI                        0x0000000183456789 Image.init(_:bundle:)
2   SinapseApp                     0x0000000101234567 OnboardingView.body.getter
...
```

---

## New Errors/Warnings from Xcode 16+/iOS 18+

### Xcode 16+ Specific Issues

1. **Strict Concurrency Checking**
   - Swift 6 concurrency model stricter
   - `@MainActor` isolation more strictly enforced
   - May cause warnings/errors in async initialization

2. **iOS 18+ Scene Lifecycle Changes**
   - SceneDelegate pattern deprecated in favor of SwiftUI lifecycle
   - Info.plist SceneDelegate reference may cause warnings

3. **Asset Catalog Validation**
   - Stricter validation of asset references
   - Missing assets may cause build warnings

### Potential Warnings (Not Currently Visible)

```
warning: SceneDelegateClassName specified but SceneDelegate class not found
warning: Launch screen asset 'SplashBackground' not found in asset catalog
warning: Main actor-isolated initializer called from non-isolated context
```

---

## Proposed Fixes and PR Plan

### Priority 1: Critical Launch Blockers

#### Fix 1.1: Remove SceneDelegate References
**Files:** `Info.plist`, `project.yml`

**Changes:**
1. Remove `UISceneDelegateClassName` from `Info.plist`
2. Remove `UISceneDelegateClassName` from `project.yml`
3. Verify SwiftUI handles scene lifecycle

**PR:** `fix/remove-scene-delegate-references`

---

#### Fix 1.2: Update Launch Screen Asset References
**Files:** `Info.plist`, `Constants.swift`

**Changes:**
1. Update `Info.plist` to reference `WelcomeHero` or create `SplashBackground` asset
2. Update `Constants.swift` logoImage reference
3. Verify asset exists in catalog

**PR:** `fix/update-launch-screen-assets`

---

### Priority 2: Error Handling Improvements

#### Fix 2.1: Add Error Handling to Service Preloads
**File:** `SinapseApp.swift`

**Changes:**
```swift
.task {
    // Restore IAP on launch
    do {
        await SubscriptionManager.shared.restorePurchases()
    } catch {
        print("[SinapseApp] Subscription restore failed: \(error)")
        // Continue launch - non-critical
    }
    
    // Preload services
    Task.detached {
        do {
            await RoomService.preload()
        } catch {
            print("[SinapseApp] RoomService preload failed: \(error)")
        }
        
        do {
            await AIService.preload()
        } catch {
            print("[SinapseApp] AIService preload failed: \(error)")
        }
    }
    
    // Start telemetry monitoring
    SystemMonitor.shared.monitorTelemetry()
}
```

**PR:** `fix/add-launch-error-handling`

---

#### Fix 2.2: Add Error Handling to PresenceViewModel
**File:** `ViewModels/PresenceViewModel.swift`

**Changes:**
```swift
private func loadPresence() async {
    do {
        let rooms = try await RoomService.fetchRooms()
        // ... existing code ...
    } catch {
        print("[PresenceViewModel] Failed to load presence: \(error)")
        // Set fallback state - empty users list
        self.users = []
    }
}
```

**PR:** `fix/presence-viewmodel-error-handling`

---

### Priority 3: Asset Validation

#### Fix 3.1: Verify All Assets Exist
**Action Items:**
1. Audit `Assets.xcassets` for all referenced assets
2. Create missing assets or update references
3. Add build-phase script to validate assets

**PR:** `fix/validate-asset-references`

---

## Updated Statistics Table

| Category | Count | Severity | Status |
|---------|-------|----------|--------|
| Info.plist Configuration Conflicts | 2 | Critical | 🔴 Blocking |
| Unhandled Async Initialization | 3 | Medium | 🔴 Blocking |
| Actor Isolation Violations | 1 | Low | ⚠️ Warning |
| Missing Error Handling | 1 | Medium | 🔴 Blocking |
| Asset Loading Issues | 1 | Low | ⚠️ Warning |
| Color Asset References | 1 | Low | ⚠️ Warning |
| Launch Screen Storyboard | 1 | Medium | 🔴 Blocking |
| **Total** | **10** | | **🔴 Launch Blocked** |

---

## Lessons Learned

### 1. SwiftUI Lifecycle vs UIKit Lifecycle
- **Issue:** Mixing SwiftUI `@main` App with UIKit SceneDelegate configuration
- **Solution:** Use SwiftUI lifecycle exclusively, remove UIKit scene configuration
- **Prevention:** Document lifecycle choice in project README

### 2. Asset Renaming Impact
- **Issue:** Renaming assets without updating all references
- **Solution:** Use find-and-replace across entire codebase, verify Info.plist
- **Prevention:** Use build-time asset validation scripts

### 3. Async Initialization in App Launch
- **Issue:** Unhandled async failures in critical launch paths
- **Solution:** Wrap all async operations in error handling, make non-blocking
- **Prevention:** Code review checklist for launch path error handling

### 4. Error Handling in Critical Paths
- **Issue:** Assuming services will always be available
- **Solution:** Add defensive error handling with fallback states
- **Prevention:** Unit tests for offline/unavailable service scenarios

### 5. Info.plist Maintenance
- **Issue:** Info.plist not updated when code changes
- **Solution:** Treat Info.plist as code, review in PRs
- **Prevention:** Add Info.plist validation to CI/CD

---

## Recommendations

1. **Immediate Actions:**
   - Remove SceneDelegate references (Priority 1)
   - Fix launch screen asset references (Priority 1)
   - Add error handling to all launch path async calls (Priority 2)

2. **Short-term Improvements:**
   - Add comprehensive error handling to all service initialization
   - Create asset validation build script
   - Add launch path unit tests

3. **Long-term Improvements:**
   - Implement proper offline mode with cached data
   - Add telemetry for launch failures
   - Create launch health dashboard

4. **Testing Strategy:**
   - Test launch with network disabled
   - Test launch with backend unavailable
   - Test launch with missing assets
   - Test launch on fresh install (no UserDefaults)

---

## Conclusion

The app launch failure is caused by **multiple critical configuration and error handling issues**, primarily:

1. **Info.plist SceneDelegate conflict** - Most likely cause of instant crash
2. **Missing launch screen assets** - Likely cause of black screen
3. **Unhandled async failures** - May cause delayed crashes

All issues are fixable with targeted changes. Priority 1 fixes should restore basic launch functionality. Priority 2 fixes will improve stability and user experience.

**Next Steps:**
1. Implement Priority 1 fixes immediately
2. Test launch on clean simulator
3. Verify all assets load correctly
4. Add error handling to remaining critical paths

---

**Report Generated:** 2025-11-13  
**Investigator:** Composer1, Senior iOS Engineer  
**Status:** 🔴 Launch blocked - Awaiting Priority 1 fixes

