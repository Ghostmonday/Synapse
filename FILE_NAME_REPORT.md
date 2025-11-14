# File Name Report - Synapse Project

**Generated:** 2025-01-27  
**Total Files:** 485 files (excluding node_modules, .git, dist, build artifacts)

## Executive Summary

This report provides a comprehensive inventory of all files in the Synapse project after cleanup and organization. The project has been cleaned up by:
- Removing duplicate PNG assets from `frontend/iOS/` root directory
- Archiving duplicate assets from `pixxx/` directory to `archive/assets/`
- Removing build artifacts (143MB freed)
- Cleaning up temporary files (.DS_Store, etc.)

## File Statistics by Type

| File Type | Count | Description |
|-----------|-------|-------------|
| `.ts` | 141 | TypeScript source files |
| `.swift` | 118 | Swift source files (iOS app) |
| `.png` | 61 | Image assets |
| `.json` | 38 | JSON configuration/data files |
| `.sql` | 37 | SQL schema and migration files |
| `.md` | 26 | Markdown documentation files |
| `.sh` | 18 | Shell scripts |
| `.yml` | 10 | YAML configuration files |
| `.vue` | 8 | Vue component files |
| `.js` | 6 | JavaScript files |
| `.plist` | 4 | iOS property list files |
| `.tf` | 3 | Terraform infrastructure files |
| `.py` | 2 | Python scripts |
| `.yaml` | 1 | YAML specification file |
| `.proto` | 1 | Protocol buffer definition |
| `.storekit` | 1 | StoreKit configuration |

## Directory Structure & File Counts

| Directory | Files | Size | Description |
|-----------|-------|------|-------------|
| `frontend/` | 186 | 22M | iOS SwiftUI application |
| `src/` | 162 | 1.0M | Legacy backend code (migrating to apps/api) |
| `sql/` | 38 | 380K | Database migrations and schema |
| `archive/` | 20 | 16M | Archived duplicate assets |
| `scripts/` | 20 | 80K | Operational scripts |
| `docs/` | 13 | 152K | Documentation files |
| `packages/` | 7 | 28K | Shared packages (monorepo) |
| `.github/` | 6 | - | GitHub Actions workflows |
| `infra/` | 5 | 32K | Infrastructure as Code (Terraform) |
| `supabase/` | 4 | 24K | Supabase Edge Functions |
| `config/` | 2 | 8K | Configuration files |
| `specs/` | 2 | 8K | API specifications |
| `apps/` | 1 | 4K | Monorepo applications |
| `cache/` | 1 | 4K | Cache files |
| `schemas/` | 1 | 4K | JSON schemas |
| Root files | 15 | - | Configuration and documentation |

## Complete File Listing

### Root Level Files
```
.codecov.yml
.gitignore
AUDIT_RESPONSE.md
BRANCH_MERGE_ANALYSIS.md
CLEANUP_SUMMARY.md
Dockerfile
INDEX.md
MAP.md
README.md
REPOSITORY_STRUCTURE.md
SECURITY_FIXES.md
TAGS.md
docker-compose.yml
package.json
package-lock.json
tsconfig.json
turbo.json
```

### Apps Directory (`apps/`)
```
apps/api/package.json
```

### Archive Directory (`archive/`)
```
archive/assets/AppIconMarketing.png
archive/assets/PaywallHero.png
archive/assets/PaywallHero@2x.png
archive/assets/PaywallHero@3x.png
archive/assets/TierCardEnterprise.png
archive/assets/TierCardEnterprise@2x.png
archive/assets/TierCardEnterprise@3x.png
archive/assets/TierCardPro.png
archive/assets/TierCardPro@2x.png
archive/assets/TierCardPro@3x.png
archive/assets/TierCardStarter.png
archive/assets/TierCardStarter@2x.png
archive/assets/TierCardStarter@3x.png
archive/assets/VoicePresenceWaveform.png
archive/assets/VoicePresenceWaveform@2x.png
archive/assets/VoicePresenceWaveform@3x.png
archive/assets/WelcomeHero.png
archive/assets/WelcomeHero@2x.png
archive/assets/WelcomeHero@3x.png
archive/assets/rename_files.sh
```

### Cache Directory (`cache/`)
```
cache/solidity-files-cache.json
```

### Config Directory (`config/`)
```
config/prometheus.yml
config/rules.yml
```

### Docs Directory (`docs/`)
```
docs/ASSET_GENERATION_GUIDE.md
docs/ASSET_OPTIMIZATION_SUMMARY.md
docs/ASSET_PLACEMENT_GUIDE.md
docs/README.md
docs/SCREENS_AND_DATA_DIAGRAM.md
docs/threat_model.md
docs/reports/DESIGN_SYSTEM_ERROR_REPORT.md
docs/reports/FEATURE_IMPLEMENTATION_SUMMARY.md
docs/reports/PHASE_IMPLEMENTATION_SUMMARY.md
docs/reports/POST_DESIGN_SYSTEM_LAUNCH_FAILURE_INVESTIGATION.md
docs/reports/SECURITY_AUDIT_REPORT.md
docs/reports/UI_UX_AUDIT_REPORT.md
docs/reports/UI_UX_QUICK_REFERENCE.md
```

### Frontend iOS Directory (`frontend/iOS/`)
**186 files total** - SwiftUI iOS application including:
- Assets.xcassets/ (56 files: 42 PNG images, 14 JSON files)
- Components/ (3 Swift files)
- Coordinators/ (1 Swift file)
- DesignSystem/ (15 files: 14 Swift, 1 MD)
- Extensions/ (4 Swift files)
- Managers/ (14 Swift files)
- Models/ (8 Swift files)
- Services/ (14 Swift files)
- Telemetry/ (1 Swift file)
- Tests/ (4 Swift files)
- ViewModels/ (3 Swift files)
- Views/ (50 Swift files)
- Configuration files (Info.plist, Package.swift, project.yml, etc.)

### Infrastructure Directory (`infra/aws/`)
```
infra/aws/main.tf
infra/aws/outputs.tf
infra/aws/user_data.sh
infra/aws/variables.tf
infra/aws/modules/...
```

### Packages Directory (`packages/`)
```
packages/ai-mod/package.json
packages/core/package.json
packages/core/src/config/index.ts
packages/core/src/types/index.ts
packages/core/src/utils/index.ts
packages/livekit/package.json
packages/supabase/package.json
```

### Scripts Directory (`scripts/`)
```
scripts/clean-production.js
scripts/copy_and_rename.py
scripts/copy_assets.sh
scripts/deploy.sh
scripts/final_copy_images.sh
scripts/setup_assets.py
scripts/setup-assets.sh
scripts/supabase-setup.sh
scripts/verify-build.sh
scripts/dev/check-supabase-readiness.sh
scripts/dev/ios/...
scripts/dev/seed.sh
scripts/dev/setup.sh
scripts/dev/test-endpoints.sh
scripts/dev/validate-openapi.ts
scripts/ops/entrypoint.sh
scripts/ops/repair_high_cpu.sh
scripts/ops/repair_high_latency.sh
```

### Source Directory (`src/`)
**162 files total** - Legacy backend code including:
- ai/ (1 TypeScript file)
- api/ (1 TypeScript file)
- autonomy/ (7 TypeScript files)
- components/ (8 Vue files)
- config/ (4 files: 3 TS, 1 JS)
- functions/ (1 TypeScript file)
- jobs/ (2 TypeScript files)
- llm-observer/ (14 files: 13 JSON, 1 TS)
- middleware/ (7 TypeScript files)
- optimizer/ (1 TypeScript file)
- routes/ (32 files: 28 TS, 4 JS)
- server/ (21 TypeScript files)
- services/ (46 files: 45 TS, 1 MD)
- shared/ (2 TypeScript files)
- styles/ (1 CSS file)
- telemetry/ (1 TypeScript file)
- types/ (5 TypeScript files)
- utils/ (1 TypeScript file)
- workers/ (1 TypeScript file)
- ws/ (6 TypeScript files)

### SQL Directory (`sql/`)
```
sql/01_sinapse_schema.sql
sql/02_compressor_functions.sql
sql/03_retention_policy.sql
sql/04_moderation_apply.sql
sql/05_rls_policies.sql
sql/06_partition_management.sql
sql/07_healing_logs.sql
sql/08_enhanced_rls_policies.sql
sql/09_p0_features.sql
sql/10_integrated_features.sql
sql/11_indexing_and_rls.sql
sql/12_telemetry_triggers.sql
sql/12_verify_setup.sql
sql/13_create_missing_ai_views.sql
sql/16_ai_audit_triggers.sql
sql/17_ux_telemetry_schema.sql
sql/QUICK_VALIDATION.sql
sql/README.md
sql/archive/legacy/ (3 SQL files)
sql/migrations/ (17 SQL migration files)
```

### Supabase Directory (`supabase/functions/`)
```
supabase/functions/... (3 TypeScript files)
```

### Specs Directory (`specs/`)
```
specs/api/openapi.yaml
specs/proto/... (1 proto file)
```

### Schemas Directory (`schemas/`)
```
schemas/events.json
```

### GitHub Workflows (`.github/workflows/`)
```
.github/README.md
.github/workflows/app-ci.yml
.github/workflows/ci.yml
.github/workflows/codecov.yml
.github/workflows/healing-checks.yml
.github/workflows/ui-state-tests.yml
```

## Cleanup Actions Performed

1. ✅ **Removed duplicate PNG files** from `frontend/iOS/` root (already in Assets.xcassets)
2. ✅ **Archived duplicate assets** from `pixxx/` directory to `archive/assets/`
3. ✅ **Removed build artifacts** (`frontend/iOS/build/` - 143MB freed)
4. ✅ **Cleaned up temporary files** (.DS_Store files removed)
5. ✅ **Organized file structure** - all assets properly organized

## Recommendations

1. **Archive Directory**: The `archive/assets/` directory (16MB) contains duplicate assets. Consider removing if no longer needed.
2. **Dist Directory**: The `dist/` directory (984KB) contains build artifacts. Ensure it's in .gitignore.
3. **Source Migration**: Continue migrating `src/` code to `apps/api/` as planned.
4. **Build Artifacts**: Ensure `.gitignore` properly excludes all build artifacts.

## File Organization Status

✅ **Well Organized:**
- iOS assets properly structured in Assets.xcassets
- Documentation organized in `docs/`
- SQL migrations versioned in `sql/migrations/`
- Scripts organized by purpose (`dev/`, `ops/`)

⚠️ **Needs Attention:**
- `archive/` directory contains large duplicate assets (16MB)
- `dist/` directory may contain build artifacts
- Legacy code in `src/` still being migrated

---

**Note:** This report excludes:
- `node_modules/` (784MB - dependency files)
- `.git/` (version control files)
- `dist/` (build artifacts)
- `frontend/iOS/build/` (build artifacts - cleaned)


## Complete File Listing (Alphabetical)

```
.codecov.yml
.github/README.md
.github/workflows/app-ci.yml
.github/workflows/ci.yml
.github/workflows/codecov.yml
.github/workflows/healing-checks.yml
.github/workflows/ui-state-tests.yml
.gitignore
AUDIT_RESPONSE.md
BRANCH_MERGE_ANALYSIS.md
CLEANUP_SUMMARY.md
Dockerfile
INDEX.md
MAP.md
README.md
REPOSITORY_STRUCTURE.md
SECURITY_FIXES.md
TAGS.md
apps/api/package.json
archive/assets/AppIconMarketing.png
archive/assets/PaywallHero.png
archive/assets/PaywallHero@2x.png
archive/assets/PaywallHero@3x.png
archive/assets/TierCardEnterprise.png
archive/assets/TierCardEnterprise@2x.png
archive/assets/TierCardEnterprise@3x.png
archive/assets/TierCardPro.png
archive/assets/TierCardPro@2x.png
archive/assets/TierCardPro@3x.png
archive/assets/TierCardStarter.png
archive/assets/TierCardStarter@2x.png
archive/assets/TierCardStarter@3x.png
archive/assets/VoicePresenceWaveform.png
archive/assets/VoicePresenceWaveform@2x.png
archive/assets/VoicePresenceWaveform@3x.png
archive/assets/WelcomeHero.png
archive/assets/WelcomeHero@2x.png
archive/assets/WelcomeHero@3x.png
archive/assets/rename_files.sh
cache/solidity-files-cache.json
config/prometheus.yml
config/rules.yml
docker-compose.yml
docs/ASSET_GENERATION_GUIDE.md
docs/ASSET_OPTIMIZATION_SUMMARY.md
docs/ASSET_PLACEMENT_GUIDE.md
docs/README.md
docs/SCREENS_AND_DATA_DIAGRAM.md
docs/reports/DESIGN_SYSTEM_ERROR_REPORT.md
docs/reports/FEATURE_IMPLEMENTATION_SUMMARY.md
docs/reports/PHASE_IMPLEMENTATION_SUMMARY.md
docs/reports/POST_DESIGN_SYSTEM_LAUNCH_FAILURE_INVESTIGATION.md
docs/reports/SECURITY_AUDIT_REPORT.md
docs/reports/UI_UX_AUDIT_REPORT.md
docs/reports/UI_UX_QUICK_REFERENCE.md
docs/threat_model.md
frontend/iOS/.swiftpm/xcode/package.xcworkspace/contents.xcworkspacedata
frontend/iOS/.swiftpm/xcode/package.xcworkspace/xcuserdata/rentamac.xcuserdatad/UserInterfaceState.xcuserstate
frontend/iOS/.swiftpm/xcode/xcuserdata/rentamac.xcuserdatad/xcschemes/xcschememanagement.plist
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-20@2x.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-20@2x~ipad.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-20@3x.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-20~ipad.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-29.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-29@2x.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-29@2x~ipad.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-29@3x.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-29~ipad.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-40@2x.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-40@2x~ipad.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-40@3x.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-40~ipad.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-60@2x~car.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-60@3x~car.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-83.5@2x~ipad.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon@2x.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon@2x~ipad.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon@3x.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon~ios-marketing.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/AppIcon~ipad.png
frontend/iOS/Assets.xcassets/AppIcon.appiconset/Contents.json
frontend/iOS/Assets.xcassets/Contents.json
frontend/iOS/Assets.xcassets/Images/Hero/WelcomeHero.imageset/Contents.json
frontend/iOS/Assets.xcassets/Images/Hero/WelcomeHero.imageset/WelcomeHero.png
frontend/iOS/Assets.xcassets/Images/Hero/WelcomeHero.imageset/WelcomeHero@2x.png
frontend/iOS/Assets.xcassets/Images/Hero/WelcomeHero.imageset/WelcomeHero@3x.png
frontend/iOS/Assets.xcassets/Images/Marketing/AppIconMarketing.imageset/AppIconMarketing 2.png
frontend/iOS/Assets.xcassets/Images/Marketing/AppIconMarketing.imageset/AppIconMarketing 3.png
frontend/iOS/Assets.xcassets/Images/Marketing/AppIconMarketing.imageset/AppIconMarketing.png
frontend/iOS/Assets.xcassets/Images/Marketing/AppIconMarketing.imageset/Contents.json
frontend/iOS/Assets.xcassets/Images/Paywall/PaywallHero.imageset/Contents.json
frontend/iOS/Assets.xcassets/Images/Paywall/PaywallHero.imageset/PaywallHero.png
frontend/iOS/Assets.xcassets/Images/Paywall/PaywallHero.imageset/PaywallHero@2x.png
frontend/iOS/Assets.xcassets/Images/Paywall/PaywallHero.imageset/PaywallHero@3x.png
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardEnterprise.imageset/Contents.json
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardEnterprise.imageset/TierCardEnterprise.png
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardEnterprise.imageset/TierCardEnterprise@2x.png
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardEnterprise.imageset/TierCardEnterprise@3x.png
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardPro.imageset/Contents.json
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardPro.imageset/TierCardPro.png
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardPro.imageset/TierCardPro@2x.png
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardPro.imageset/TierCardPro@3x.png
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardStarter.imageset/Contents.json
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardStarter.imageset/TierCardStarter.png
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardStarter.imageset/TierCardStarter@2x.png
frontend/iOS/Assets.xcassets/Images/Tiers/TierCardStarter.imageset/TierCardStarter@3x.png
frontend/iOS/Assets.xcassets/Images/Voice/VoicePresenceWaveform.imageset/Contents.json
frontend/iOS/Assets.xcassets/Images/Voice/VoicePresenceWaveform.imageset/VoicePresenceWaveform.png
frontend/iOS/Assets.xcassets/Images/Voice/VoicePresenceWaveform.imageset/VoicePresenceWaveform@2x.png
frontend/iOS/Assets.xcassets/Images/Voice/VoicePresenceWaveform.imageset/VoicePresenceWaveform@3x.png
frontend/iOS/Assets.xcassets/LaunchImage.imageset/Contents.json
frontend/iOS/Assets.xcassets/SinapseDeep.colorSet/Contents.json
frontend/iOS/Assets.xcassets/SinapseGlow.colorSet/Contents.json
frontend/iOS/Assets.xcassets/SinapseGold.colorSet/Contents.json
frontend/iOS/Assets.xcassets/SinapseGoldDark.colorSet/Contents.json
frontend/iOS/Components/AmbientParticles.swift
frontend/iOS/Components/MoodGradient.swift
frontend/iOS/Components/VoiceOrb.swift
frontend/iOS/Coordinators/AutonomyCoordinator.swift
frontend/iOS/DesignSystem/Components/Atomic/DSAvatar.swift
frontend/iOS/DesignSystem/Components/Atomic/DSButton.swift
frontend/iOS/DesignSystem/Components/Atomic/DSChip.swift
frontend/iOS/DesignSystem/Components/Atomic/DSDivider.swift
frontend/iOS/DesignSystem/Components/Atomic/DSPresenceOrb.swift
frontend/iOS/DesignSystem/Components/Molecular/DSEmptyState.swift
frontend/iOS/DesignSystem/Components/Molecular/DSMessageBubble.swift
frontend/iOS/DesignSystem/Components/Molecular/DSSearchField.swift
frontend/iOS/DesignSystem/Components/Molecular/DSTierCard.swift
frontend/iOS/DesignSystem/Components/Organisms/DSChatComposer.swift
frontend/iOS/DesignSystem/Components/Organisms/DSRoomRow.swift
frontend/iOS/DesignSystem/Components/SwiftUIGenerated/DSBackgrounds.swift
frontend/iOS/DesignSystem/DesignTokens.swift
frontend/iOS/DesignSystem/README.md
frontend/iOS/DesignSystem/Validation/DSValidation.swift
frontend/iOS/ExportOptions.plist
frontend/iOS/Extensions/Color+Extensions.swift
frontend/iOS/Extensions/View+Accessibility.swift
frontend/iOS/Extensions/View+Extensions.swift
frontend/iOS/Extensions/View+Performance.swift
frontend/iOS/Info.plist
frontend/iOS/Managers/AIReasoner.swift
frontend/iOS/Managers/APIClient.swift
frontend/iOS/Managers/AppleAuthHelper.swift
frontend/iOS/Managers/Constants.swift
frontend/iOS/Managers/DeepSeekClient.swift
frontend/iOS/Managers/GoogleAuthHelper.swift
frontend/iOS/Managers/LiveKitRoomManager.swift
frontend/iOS/Managers/MessageManager.swift
frontend/iOS/Managers/RoomManager.swift
frontend/iOS/Managers/SpeechManager.swift
frontend/iOS/Managers/SubscriptionManager.swift
frontend/iOS/Managers/SystemMonitor.swift
frontend/iOS/Managers/TapRateTracker.swift
frontend/iOS/Managers/WebSocketManager.swift
frontend/iOS/Models/AILog.swift
frontend/iOS/Models/IAPReceipt.swift
frontend/iOS/Models/Message.swift
frontend/iOS/Models/Room.swift
frontend/iOS/Models/SubscriptionTier.swift
frontend/iOS/Models/TelemetryMetric.swift
frontend/iOS/Models/UXEventType.swift
frontend/iOS/Models/User.swift
frontend/iOS/Package.swift
frontend/iOS/Products.storekit
frontend/iOS/Services/ABTestManager.swift
frontend/iOS/Services/AIService.swift
frontend/iOS/Services/AuthService.swift
frontend/iOS/Services/AutonomyExecutor.swift
frontend/iOS/Services/EmotionPulseMonitor.swift
frontend/iOS/Services/EmotionalCurveMonitor.swift
frontend/iOS/Services/IAPService.swift
frontend/iOS/Services/MessageService.swift
frontend/iOS/Services/RollbackManager.swift
frontend/iOS/Services/RoomService.swift
frontend/iOS/Services/SystemService.swift
frontend/iOS/Services/UXTelemetryService.swift
frontend/iOS/Services/ViewGenerator.swift
frontend/iOS/Services/WatchdogClient.swift
frontend/iOS/Sinapse.xcodeproj/project.pbxproj
frontend/iOS/Sinapse.xcodeproj/project.xcworkspace/contents.xcworkspacedata
frontend/iOS/Sinapse.xcodeproj/project.xcworkspace/xcuserdata/rentamac.xcuserdatad/UserInterfaceState.xcuserstate
frontend/iOS/Sinapse.xcodeproj/xcuserdata/rentamac.xcuserdatad/xcschemes/xcschememanagement.plist
frontend/iOS/SinapseApp.swift
frontend/iOS/Telemetry/Telemetry.swift
frontend/iOS/Tests/DashboardTelemetryTests.swift
frontend/iOS/Tests/DashboardViewTests.swift
frontend/iOS/Tests/PresenceViewModelTests.swift
frontend/iOS/Tests/WebSocketManagerTests.swift
frontend/iOS/ViewModels/EmotionalAIViewModel.swift
frontend/iOS/ViewModels/PresenceViewModel.swift
frontend/iOS/ViewModels/RoomViewModel.swift
frontend/iOS/Views/BotSetupView.swift
frontend/iOS/Views/ChatInputView.swift
frontend/iOS/Views/ChatView.swift
frontend/iOS/Views/CreateRoomSheet.swift
frontend/iOS/Views/DashboardView.swift
frontend/iOS/Views/Example/AutonomousFormExample.swift
frontend/iOS/Views/HomeView.swift
frontend/iOS/Views/HostingGuideView.swift
frontend/iOS/Views/MainTabView.swift
frontend/iOS/Views/MainView.swift
frontend/iOS/Views/MessageBubbleView.swift
frontend/iOS/Views/NicknameManagementView.swift
frontend/iOS/Views/Onboarding/RoomTierView.swift
frontend/iOS/Views/Onboarding/TierSelectionView.swift
frontend/iOS/Views/Onboarding/WelcomeView.swift
frontend/iOS/Views/OnboardingFlowView.swift
frontend/iOS/Views/OnboardingView.swift
frontend/iOS/Views/PaywallView.swift
frontend/iOS/Views/PollView.swift
frontend/iOS/Views/PresenceIndicatorView.swift
frontend/iOS/Views/PresenceOrbView.swift
frontend/iOS/Views/Profile/PricingSheet.swift
frontend/iOS/Views/ProfileView.swift
frontend/iOS/Views/ProgrammaticUIView.swift
frontend/iOS/Views/RoomListView.swift
frontend/iOS/Views/RoomSettingsView.swift
frontend/iOS/Views/SearchView.swift
frontend/iOS/Views/SettingsView.swift
frontend/iOS/Views/Shared/Animations/AnimationModifiers.swift
frontend/iOS/Views/Shared/Components/AutonomousLabel.swift
frontend/iOS/Views/Shared/Components/AutonomousValidationLabel.swift
frontend/iOS/Views/Shared/Components/EmojiPickerView.swift
frontend/iOS/Views/Shared/Components/ErrorRecoveryView.swift
frontend/iOS/Views/Shared/Components/FileUploadComponent.swift
frontend/iOS/Views/Shared/Components/LoadingSkeleton.swift
frontend/iOS/Views/Shared/Components/LoadingSpinner.swift
frontend/iOS/Views/Shared/Components/QuickJumpBar.swift
frontend/iOS/Views/Shared/Components/ReadReceiptIndicator.swift
frontend/iOS/Views/Shared/Components/VideoTileView.swift
frontend/iOS/Views/Shared/GlobalStyles.swift
frontend/iOS/Views/Shared/Modifiers/ButtonStateModifier.swift
frontend/iOS/Views/Shared/Modifiers/FormStateModifier.swift
frontend/iOS/Views/Shared/Modifiers/InputStateModifier.swift
frontend/iOS/Views/Shared/Modifiers/PresenceModifier.swift
frontend/iOS/Views/Shared/ToastView.swift
frontend/iOS/Views/SubscriptionView.swift
frontend/iOS/Views/ThreadView.swift
frontend/iOS/Views/VoiceRoomView.swift
frontend/iOS/Views/VoiceVideoPanelView.swift
frontend/iOS/Views/VoiceView.swift
frontend/iOS/project.yml
infra/aws/.gitignore
infra/aws/main.tf
infra/aws/outputs.tf
infra/aws/user_data.sh
infra/aws/variables.tf
package-lock.json
package.json
packages/ai-mod/package.json
packages/core/package.json
packages/core/src/config/index.ts
packages/core/src/index.ts
packages/core/src/validation/index.ts
packages/livekit/package.json
packages/supabase/package.json
schemas/events.json
scripts/clean-production.js
scripts/copy_and_rename.py
scripts/copy_assets.sh
scripts/deploy.sh
scripts/dev/check-supabase-readiness.sh
scripts/dev/ios/create_xcode_project.sh
scripts/dev/ios/package_ios.sh
scripts/dev/ios/validate_swift.sh
scripts/dev/seed.sh
scripts/dev/setup.sh
scripts/dev/test-endpoints.sh
scripts/dev/validate-openapi.ts
scripts/final_copy_images.sh
scripts/ops/entrypoint.sh
scripts/ops/repair_high_cpu.sh
scripts/ops/repair_high_latency.sh
scripts/setup-assets.sh
scripts/setup_assets.py
scripts/supabase-setup.sh
scripts/verify-build.sh
specs/api/openapi.yaml
specs/proto/ws_envelope.proto
sql/01_sinapse_schema.sql
sql/02_compressor_functions.sql
sql/03_retention_policy.sql
sql/04_moderation_apply.sql
sql/05_rls_policies.sql
sql/06_partition_management.sql
sql/07_healing_logs.sql
sql/08_enhanced_rls_policies.sql
sql/09_p0_features.sql
sql/10_integrated_features.sql
sql/11_indexing_and_rls.sql
sql/12_telemetry_triggers.sql
sql/12_verify_setup.sql
sql/13_create_missing_ai_views.sql
sql/16_ai_audit_triggers.sql
sql/17_ux_telemetry_schema.sql
sql/QUICK_VALIDATION.sql
sql/README.md
sql/archive/legacy/init-db.sql
sql/archive/legacy/sinapse_complete.sql
sql/archive/legacy/sinapse_complete_setup.sql
sql/migrations/2025-01-27-api-keys-vault.sql
sql/migrations/2025-01-27-complete-setup.sql
sql/migrations/2025-01-27-fix-category-function.sql
sql/migrations/2025-01-27-populate-api-keys.sql
sql/migrations/2025-01-27-populate-only.sql
sql/migrations/2025-01-27-quick-populate-keys.sql
sql/migrations/2025-01-27-test-retrieval.sql
sql/migrations/2025-01-add-moderation-tables.sql
sql/migrations/2025-01-add-rooms-tier-moderation.sql
sql/migrations/2025-11-10-feature-enhancements.sql
sql/migrations/2025-11-12-subscriptions-usage.sql
sql/migrations/2025-11-create-rooms-table.sql
sql/migrations/2025-11-security-audit-logs.sql
sql/migrations/migrate-remaining-tables.sql
sql/migrations/migrate-subscription-support.sql
sql/migrations/test-supabase-schema.sql
sql/migrations/verify-supabase-schema.sql
src/ai/consensus.ts
src/api/generated_types.ts
src/autonomy/executor.ts
src/autonomy/healing-loop.ts
src/autonomy/index.ts
src/autonomy/llm_reasoner.ts
src/autonomy/policy_guard.ts
src/autonomy/telemetry_collector.ts
src/autonomy/types.ts
src/components/ChatInput.vue
src/components/MessageBubble.vue
src/components/PresenceIndicator.vue
src/components/PresenceOrb.vue
src/components/ProgrammaticUI.vue
src/components/ThreadView.vue
src/components/VoiceRoomView.vue
src/components/VoiceVideoPanel.vue
src/config/db.d.ts
src/config/db.js
src/config/llm-params.config.ts
src/config/redis-pubsub.ts
src/functions/compressAndStore.ts
src/jobs/expire-temporary-rooms.ts
src/jobs/partition-management-cron.ts
src/llm-observer/strategies/ai-disagreement-strategy.json
src/llm-observer/strategies/ai-feedback-strategy.json
src/llm-observer/strategies/behavior-modeling-strategy.json
src/llm-observer/strategies/context-overload-strategy.json
src/llm-observer/strategies/conversation-arc-strategy.json
src/llm-observer/strategies/emotional-tracking-strategy.json
src/llm-observer/strategies/flow-abandonment-strategy.json
src/llm-observer/strategies/journey-analytics-strategy.json
src/llm-observer/strategies/message-emotion-diff-strategy.json
src/llm-observer/strategies/message-rollback-strategy.json
src/llm-observer/strategies/performance-linking-strategy.json
src/llm-observer/strategies/presence-sync-lag-strategy.json
src/llm-observer/strategies/validation-error-strategy.json
src/llm-observer/watchdog.ts
src/middleware/circuit-breaker.ts
src/middleware/file-upload-security.ts
src/middleware/input-validation.ts
src/middleware/moderation.ts
src/middleware/rate-limiter.ts
src/middleware/subscription-gate.ts
src/middleware/ws-rate-limiter.ts
src/optimizer/index.ts
src/routes/admin-routes.ts
src/routes/ai-log-routes.ts
src/routes/ai.js
src/routes/assistants-routes.ts
src/routes/auth.js
src/routes/bandwidth-routes.ts
src/routes/bot-invites-routes.ts
src/routes/bots-routes.ts
src/routes/chat-room-config-routes.ts
src/routes/config-routes.ts
src/routes/entitlements-routes.ts
src/routes/file-storage-routes.ts
src/routes/health-routes.ts
src/routes/iap.js
src/routes/message-routes.ts
src/routes/nicknames-routes.ts
src/routes/notify-routes.ts
src/routes/pinned-routes.ts
src/routes/polls-routes.ts
src/routes/presence-routes.ts
src/routes/reactions-routes.ts
src/routes/read-receipts-routes.ts
src/routes/room-routes.ts
src/routes/rooms.js
src/routes/search-routes.ts
src/routes/subscription-routes.ts
src/routes/telemetry-routes.ts
src/routes/threads-routes.ts
src/routes/user-authentication-routes.ts
src/routes/ux-telemetry-routes.ts
src/routes/video/join.ts
src/routes/voice-routes.ts
src/server/index.ts
src/server/middleware/auth.ts
src/server/middleware/cache.ts
src/server/middleware/error.ts
src/server/middleware/telemetry.ts
src/server/routes/admin.ts
src/server/routes/aiops.ts
src/server/routes/auth.ts
src/server/routes/config.ts
src/server/routes/files.ts
src/server/routes/messaging.ts
src/server/routes/presence.ts
src/server/routes/telemetry.ts
src/server/services/auth.ts
src/server/services/config.ts
src/server/services/files.ts
src/server/services/messaging.ts
src/server/services/optimizer.ts
src/server/services/presence.ts
src/server/services/telemetry.ts
src/server/utils/config.ts
src/services/ai-automation.ts
src/services/ai-handlers/system-ops-handler.ts
src/services/ai-handlers/user-control-handler.ts
src/services/ai-handlers/user-voice-handler.ts
src/services/ai-log-classification-README.md
src/services/ai-log-classifier.ts
src/services/ai-log-processor.ts
src/services/ai-log-router.ts
src/services/ai-safeguards.ts
src/services/ai-scheduler.ts
src/services/api-keys-service.ts
src/services/apple-iap-service.ts
src/services/apple-jwks-verifier.ts
src/services/bandwidth-service.ts
src/services/bot-invite-service.ts
src/services/config-service.ts
src/services/e2e-encryption.ts
src/services/entitlements.ts
src/services/file-storage-service.ts
src/services/livekit-service.ts
src/services/livekit-token-service.ts
src/services/llm-parameter-manager.ts
src/services/llm-service.ts
src/services/message-queue.ts
src/services/message-service.ts
src/services/messages-controller.ts
src/services/moderation.service.ts
src/services/nickname-service.ts
src/services/notifications-service.ts
src/services/optimizer-service.ts
src/services/partition-management-service.ts
src/services/pinned-items-service.ts
src/services/poll-service.ts
src/services/presence-service.ts
src/services/read-receipts-service.ts
src/services/room-service.ts
src/services/search-service.ts
src/services/subscription-service.ts
src/services/telemetry-service.ts
src/services/usage-service.ts
src/services/usageMeter.ts
src/services/user-authentication-service.ts
src/services/ux-telemetry-redaction.ts
src/services/ux-telemetry-service.ts
src/services/voice-security-service.ts
src/services/webhooks.ts
src/shared/logger.ts
src/shared/supabase-helpers.ts
src/styles/voice.css
src/telemetry/index.ts
src/types/auth.types.ts
src/types/compression.d.ts
src/types/livekit.d.ts
src/types/message.types.ts
src/types/ux-telemetry.ts
src/utils/prompt-sanitizer.ts
src/workers/sin-worker.ts
src/ws/gateway.ts
src/ws/handlers/messaging.ts
src/ws/handlers/presence.ts
src/ws/handlers/reactions-threads.ts
src/ws/handlers/read-receipts.ts
src/ws/utils.ts
supabase/.temp/cli-latest
supabase/functions/api-key-vault/index.ts
supabase/functions/join-room/index.ts
supabase/functions/llm-proxy/index.ts
tsconfig.json
turbo.json
```
