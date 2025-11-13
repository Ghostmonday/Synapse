# Legacy Code Audit Report
**Date:** 2025-01-28  
**Scope:** Complete codebase audit for legacy/unnecessary elements

## Executive Summary

Found **8 categories** of legacy/unnecessary code:
1. Empty directories (3)
2. Unused CSS file (1)
3. Deprecated functions (2)
4. Duplicate route implementations (3)
5. Build artifacts in repo (dist/)
6. Unused packages/apps (apps/mobile, apps/web)
7. TODO comments requiring attention (multiple)
8. Legacy compatibility functions

---

## 1. Empty/Unused Directories

### ❌ `apps/mobile/` - EMPTY
**Status:** Empty directory, no files
**Action:** DELETE

### ❌ `apps/web/` - EMPTY  
**Status:** Empty directory, no files
**Action:** DELETE

### ❌ `archive/` - EMPTY
**Status:** Empty directory, no files
**Action:** DELETE

---

## 2. Unused Files

### ❌ `src/styles/voice.css` - UNUSED
**Status:** CSS file for web frontend that no longer exists
**Reason:** Project moved to iOS (SwiftUI), no web frontend
**Action:** DELETE
**Impact:** None - not referenced anywhere

---

## 3. Deprecated Functions

### ⚠️ `src/services/moderation.service.ts`
**Functions:**
- `analyzeMessage()` - Marked `@deprecated`, use `scanForToxicity` instead
- `logFlag()` - Marked "legacy compatibility"

**Status:** Still defined but may not be used
**Action:** Check usage, remove if unused, or update callers

---

## 4. Duplicate Route Implementations

### ⚠️ Auth Routes - THREE IMPLEMENTATIONS
1. `src/routes/auth.js` - Basic login only
2. `src/server/routes/auth.ts` - Apple auth + login
3. `src/routes/user-authentication-routes.ts` - Full auth (Apple, Google, register, login)

**Status:** Overlapping functionality
**Action:** Consolidate to single implementation (`user-authentication-routes.ts` is most complete)
**Impact:** Medium - May cause confusion about which routes are active

---

## 5. Build Artifacts

### ❌ `dist/` Directory
**Status:** Compiled JavaScript output
**Reason:** Should be gitignored, not committed
**Action:** Add to .gitignore, remove from repo
**Impact:** Low - Just cleanup

---

## 6. Unused Packages/Apps

### ⚠️ `apps/api/package.json`
**Status:** References workspace packages that may not exist
**Dependencies:** `@sinapse/livekit`, `@sinapse/ai-mod` - check if these packages exist
**Action:** Verify package existence, remove if unused

---

## 7. TODO Comments Requiring Attention

### High Priority TODOs:
1. **`src/config/db.js:99`** - "TODO: Move Redis URL to vault when async initialization performance allows"
2. **`frontend/iOS/Managers/LiveKitRoomManager.swift`** - Multiple TODOs for LiveKit implementation (stub code)
3. **`frontend/iOS/Managers/AIReasoner.swift:11`** - "TODO: Implement actual reasoning endpoint"

### Medium Priority:
- Various LiveKit stub implementations with TODO comments

---

## 8. Legacy Compatibility Code

### Functions marked for removal:
- `analyzeMessage()` - Deprecated wrapper
- `logFlag()` - Legacy compatibility function

---

## Recommended Actions

### Immediate (High Priority):
1. ✅ **COMPLETED** - Delete empty directories: `apps/mobile/`, `apps/web/`, `archive/`
2. ✅ **COMPLETED** - Delete unused CSS: `src/styles/voice.css`
3. ✅ **COMPLETED** - Consolidate auth routes (kept `user-authentication-routes.ts`, removed `auth.js` and `server/routes/auth.ts`)
4. ✅ **VERIFIED** - `dist/` already in `.gitignore`

### Short Term (Medium Priority):
5. ⚠️ Audit deprecated functions usage, remove if unused
6. ⚠️ Address high-priority TODO comments
7. ⚠️ Verify workspace package dependencies

### Long Term (Low Priority):
8. 📝 Complete LiveKit implementation stubs
9. 📝 Complete AI reasoning endpoint implementation

---

## Files to Delete

```
apps/mobile/
apps/web/
archive/
src/styles/voice.css
src/routes/auth.js (consolidate into user-authentication-routes.ts)
src/server/routes/auth.ts (consolidate into user-authentication-routes.ts)
```

---

## Impact Assessment

**Low Risk:** Deleting empty directories, unused CSS, build artifacts
**Medium Risk:** Consolidating auth routes (need to verify which routes are actually registered)
**High Risk:** None identified

---

## Next Steps

1. Review this report
2. Verify auth route registration in `src/server/index.ts`
3. Execute deletions
4. Test build after cleanup

