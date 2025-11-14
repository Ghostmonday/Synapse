# File Organization Plan

## Current Issues Identified

1. **Duplicate Route Structures**
   - `src/routes/` - Active routes (27 files)
   - `src/server/routes/` - Unused/legacy routes (6 files)

2. **Duplicate Service Structures**
   - `src/services/` - Active services (34 files)
   - `src/server/services/` - Unused/legacy services (7 files)

3. **Duplicate Middleware Structures**
   - `src/middleware/` - Active middleware (7 files)
   - `src/server/middleware/` - Active middleware (5 files) - NEEDS CONSOLIDATION

4. **Mixed File Extensions**
   - Most routes are `.ts` but `iap.js` and `rooms.js` are `.js`

5. **Inconsistent Naming**
   - Some routes: `*-routes.ts`
   - Some routes: `*.ts` (in server/routes)
   - Some routes: `*.js`

6. **File Placement Issues**
   - `src/api/generated_types.ts` - Should be in `src/types/`
   - `src/functions/compressAndStore.ts` - Should be in `src/services/`
   - `src/utils/prompt-sanitizer.ts` - Could be in `src/middleware/` or `src/shared/`

## Organization Plan

### Phase 1: Consolidate Duplicate Structures

1. **Merge Middleware**
   - Move `src/server/middleware/*` → `src/middleware/`
   - Update imports

2. **Remove Unused Routes**
   - Delete `src/server/routes/` (unused)
   - Keep only `src/routes/`

3. **Remove Unused Services**
   - Delete `src/server/services/` (unused)
   - Keep only `src/services/`

### Phase 2: Standardize File Extensions

1. Convert `.js` routes to `.ts`:
   - `iap.js` → `iap-routes.ts`
   - `rooms.js` → `rooms-routes.ts` (already exists, consolidate)

### Phase 3: Reorganize Misplaced Files

1. Move `src/api/generated_types.ts` → `src/types/generated_types.ts`
2. Move `src/functions/compressAndStore.ts` → `src/services/compression-service.ts`
3. Consider moving `src/utils/prompt-sanitizer.ts` → `src/middleware/` or `src/shared/`

### Phase 4: Group Related Files

1. **Video/Audio Routes** - Group together:
   - `agora-routes.ts`
   - `voice-routes.ts`
   - `video/join.ts`
   - Consider: `src/routes/media/` subdirectory

2. **Room Routes** - Consolidate:
   - `room-routes.ts`
   - `rooms.js` → merge into `room-routes.ts`
   - `chat-room-config-routes.ts`

3. **Telemetry Routes** - Group:
   - `telemetry-routes.ts`
   - `ux-telemetry-routes.ts`

## Proposed Final Structure

```
src/
├── config/              # Configuration files
├── jobs/                # Cron jobs & scheduled tasks
├── middleware/          # ALL middleware (consolidated)
├── routes/              # ALL routes (standardized .ts, consistent naming)
│   ├── media/          # Video/audio routes (agora, voice, video)
│   └── ...
├── services/            # ALL services (consolidated)
├── shared/              # Shared utilities
├── telemetry/           # Telemetry collection
├── types/               # TypeScript types (including generated)
├── utils/               # Utility functions
├── workers/             # Background workers
├── ws/                  # WebSocket gateway
└── server/              # Server entry point only
    └── index.ts
```

## Execution Order

1. ✅ Check what's actually used
2. ✅ Delete unused `server/routes/` and `server/services/`
3. ✅ Consolidate middleware
4. ✅ Standardize file extensions
5. ✅ Move misplaced files
6. ✅ Group related routes
7. ✅ Update all imports
8. ✅ Test build

