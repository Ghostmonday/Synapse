# 🚀 Pre-Launch Checklist for Sinapse

**Last Updated**: 2025-11-09  
**Status**: Pre-Launch Phase  
**Target Launch**: v0.1.0

---

## 🔒 CRITICAL: Security & Infrastructure (Must Complete)

### 1. Supabase Edge Functions Deployment
- [ ] Deploy `api-key-vault` function
  ```bash
  supabase functions deploy api-key-vault
  ```
- [ ] Deploy `llm-proxy` function
  ```bash
  supabase functions deploy llm-proxy
  ```
- [ ] Deploy `join-room` function
  ```bash
  supabase functions deploy join-room
  ```

### 2. Edge Function Secrets Configuration
- [ ] Set `DEEPSEEK_API_KEY` secret
- [ ] Set `LIVEKIT_API_KEY` secret
- [ ] Set `LIVEKIT_API_SECRET` secret
- [ ] Set `LIVEKIT_URL` secret

### 3. Database Migrations
- [ ] Run `sql/migrations/2025-11-security-audit-logs.sql`
- [ ] Verify `audit_logs` table created
- [ ] Verify RLS policies active
- [ ] Test audit logging works

### 4. Security Testing
- [ ] Run `npm audit --production`
- [ ] Run `snyk test --severity=high --fail-on=upgradable`
- [ ] Run `npm run test:security` (SQLi/XSS tests)
- [ ] Fix any high-severity vulnerabilities

### 5. Production Build
- [ ] Run `npm run build:prod`
- [ ] Verify no `console.log` statements in dist/
- [ ] Verify no `debugger` statements
- [ ] Test production build locally

---

## 📱 iOS App Completion (Critical)

### 1. API Integration TODOs
- [ ] **ChatView.swift**: Implement `MessageService.sendMessage()` call
  - Currently has TODO: `// TODO: Call MessageService.sendMessage`
  - Need to check response for moderation flags
  - Display toast notification for flagged messages

- [ ] **ChatInputView.swift**: Connect to message API
  - Currently has TODO: `// TODO: Call message API and check response for moderation flags`

- [ ] **RoomListView.swift**: Implement create room sheet
  - Currently has TODO: `// TODO: Show create room sheet`
  - Need to add room creation UI and API call

- [ ] **MessageBubbleView.swift**: Get current user ID
  - Currently has TODO: `// TODO: Get from AuthService`
  - Need to implement `getCurrentUserId()` properly

### 2. Subscription Integration
- [ ] **SubscriptionView.swift**: Connect to Stripe/StoreKit
  - Currently has TODO: `// TODO: Open Stripe checkout`
  - Need to implement actual purchase flow

- [ ] **RoomTierView.swift**: Implement subscription purchase
  - Currently has placeholder `goPro()` and `goEnterprise()` functions

### 3. Missing Components
- [ ] Add `EmotionPulseMonitor.swift` to Xcode project (referenced in DashboardView)
- [ ] Add `TapRateTracker` to Xcode project (referenced in DashboardView)
- [ ] Verify all Swift files compile without errors

### 4. iOS Assets
- [ ] Verify all app icons display correctly in Xcode
- [ ] Test app icon on device/simulator
- [ ] Add SplashBackground images (if not already added)
- [ ] Test launch screen

### 5. iOS Testing
- [ ] Build and run on iOS Simulator
- [ ] Test on physical device (iPhone)
- [ ] Test on iPad (if supporting)
- [ ] Verify all navigation flows work
- [ ] Test haptic feedback
- [ ] Test dark mode appearance

---

## 🔧 Backend Completion

### 1. API Endpoints
- [ ] Verify all routes are properly authenticated
- [ ] Test rate limiting works correctly
- [ ] Verify CORS headers are correct
- [ ] Test WebSocket connections with ping-pong

### 2. Client Code Updates
- [ ] Update LiveKit client to use `/functions/v1/join-room`
- [ ] Update DeepSeek calls to use `/functions/v1/llm-proxy`
- [ ] Add JWT token to all Edge Function requests
- [ ] Test Edge Function authentication

### 3. Authentication & MFA
- [ ] Configure Supabase Auth hooks for MFA enforcement
- [ ] Update auth flow to require MFA verification
- [ ] Test MFA flow end-to-end
- [ ] Verify RLS policies on `auth.users` table

### 4. Environment Configuration
- [ ] Remove API keys from `.env` (moved to Edge Functions)
- [ ] Update `.env.example` with correct variables
- [ ] Document all required environment variables
- [ ] Set up production environment variables

---

## 🧪 Testing & Quality Assurance

### 1. Integration Testing
- [ ] Test message sending with moderation enabled
- [ ] Test room creation (free, pro, enterprise)
- [ ] Test room expiry for Pro tier
- [ ] Test AI moderation warnings and mutes
- [ ] Test file uploads with moderation scanning
- [ ] Test WebSocket reconnection
- [ ] Test rate limiting (send 100+ requests rapidly)

### 2. End-to-End Testing
- [ ] Complete user signup flow
- [ ] Complete room creation flow
- [ ] Complete message sending flow
- [ ] Complete subscription purchase flow (test mode)
- [ ] Test enterprise features (moderation, self-hosting)

### 3. Performance Testing
- [ ] Load test API endpoints (100+ concurrent users)
- [ ] Test WebSocket scalability (100+ connections)
- [ ] Test database query performance
- [ ] Test Redis connection pooling
- [ ] Monitor memory usage under load

### 4. Security Testing
- [ ] Test SQL injection protection
- [ ] Test XSS protection
- [ ] Test CORS restrictions
- [ ] Test rate limiting
- [ ] Test authentication bypass attempts
- [ ] Verify no secrets in code/logs

---

## 📋 Feature Completion Status

### ✅ Completed Features
- ✅ AI Moderation (Enterprise-only, warnings-first)
- ✅ Room Tiers (Temp for Pro, Permanent for Enterprise)
- ✅ Self-hosting documentation
- ✅ iOS native app with SwiftUI
- ✅ Real-time messaging (WebSocket)
- ✅ File storage (S3)
- ✅ Presence system
- ✅ Threads and reactions
- ✅ Semantic search

### ⚠️ Partially Complete
- ⚠️ **Voice/Video Calls**: Basic LiveKit integration, missing screen sharing
- ⚠️ **AI Assistants**: Basic endpoint exists, missing contextual copilot UI
- ⚠️ **Moderation**: Infrastructure exists, missing conflict detection

### ❌ Missing Features (Post-Launch)
- ❌ Rich text formatting (markdown, code blocks)
- ❌ Direct messages (DM system)
- ❌ Screen sharing
- ❌ Bot API framework
- ❌ Webhooks
- ❌ Customizable notifications
- ❌ Pinned messages

**Note**: Missing features are not launch blockers - can be added post-launch.

---

## 🚢 Deployment Checklist

### 1. Pre-Deployment
- [ ] All security hardening complete
- [ ] All critical TODOs resolved
- [ ] All tests passing
- [ ] Production build successful
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Edge Functions deployed

### 2. Infrastructure
- [ ] Supabase project configured
- [ ] Redis instance running
- [ ] AWS S3 bucket created
- [ ] LiveKit server configured
- [ ] Domain configured (sinapse.app)
- [ ] SSL certificates installed
- [ ] CDN configured (if using)

### 3. Monitoring & Observability
- [ ] Prometheus metrics endpoint accessible
- [ ] Grafana dashboards configured (optional)
- [ ] Error logging configured (Sentry or similar)
- [ ] Uptime monitoring set up
- [ ] Alerting rules configured

### 4. App Store Submission (iOS)
- [ ] App Store Connect account set up
- [ ] App metadata prepared (description, screenshots, keywords)
- [ ] Privacy policy URL configured
- [ ] App Store review guidelines compliance checked
- [ ] TestFlight beta testing (optional)
- [ ] Submit for App Store review

### 5. Documentation
- [ ] README.md updated with deployment instructions
- [ ] API documentation complete
- [ ] User guide created (optional)
- [ ] Developer guide created (optional)

---

## 🎯 Launch Day Checklist

### Morning of Launch
- [ ] Final security audit
- [ ] Production build deployed
- [ ] Database backup created
- [ ] Monitoring dashboards verified
- [ ] Team notified of launch

### Launch
- [ ] Deploy to production
- [ ] Verify health endpoints responding
- [ ] Test critical user flows
- [ ] Monitor error logs
- [ ] Monitor performance metrics

### Post-Launch (First 24 Hours)
- [ ] Monitor error rates
- [ ] Monitor API response times
- [ ] Monitor WebSocket connection stability
- [ ] Check user signups
- [ ] Respond to any critical issues
- [ ] Collect user feedback

---

## 📊 Launch Readiness Score

### Critical Path (Must Complete)
- [ ] Security deployment: **0/5** (0%)
- [ ] iOS API integration: **0/5** (0%)
- [ ] Backend client updates: **0/4** (0%)
- [ ] Testing: **0/4** (0%)

### Important (Should Complete)
- [ ] Missing components: **0/2** (0%)
- [ ] iOS assets: **0/5** (0%)
- [ ] Infrastructure: **0/7** (0%)

### Nice to Have (Can Defer)
- [ ] Advanced features: **0/7** (0%)
- [ ] Documentation: **0/4** (0%)

**Overall Launch Readiness**: **~60%** (Core features complete, deployment pending)

---

## 🎯 Priority Order

### Week 1: Security & Infrastructure
1. Deploy Supabase Edge Functions
2. Set Edge Function secrets
3. Run database migrations
4. Update client code to use Edge Functions
5. Enable MFA

### Week 2: iOS Completion
1. Implement API calls in ChatView
2. Implement create room flow
3. Connect subscription purchases
4. Add missing components to Xcode
5. Complete iOS testing

### Week 3: Testing & Polish
1. Integration testing
2. End-to-end testing
3. Performance testing
4. Security testing
5. Bug fixes

### Week 4: Deployment
1. Production build
2. Infrastructure setup
3. Monitoring configuration
4. App Store submission
5. Launch!

---

## ⚠️ Known Issues & Risks

### High Risk
- **Edge Functions not deployed**: API keys still exposed if not moved
- **MFA not enforced**: Security risk for user accounts
- **iOS API calls incomplete**: App won't function without API integration

### Medium Risk
- **Missing iOS components**: Some features may not work
- **No production testing**: Unknown performance under load
- **Incomplete subscription flow**: Revenue generation blocked

### Low Risk
- **Missing advanced features**: Can be added post-launch
- **Documentation gaps**: Can be improved iteratively

---

## 📝 Notes

- **Core Features**: ✅ Complete and functional
- **Security**: ⚠️ Code complete, deployment pending
- **iOS App**: ⚠️ UI complete, API integration pending
- **Infrastructure**: ⚠️ Ready, needs deployment
- **Testing**: ❌ Needs comprehensive testing

**Estimated Time to Launch**: 3-4 weeks with focused effort

---

**Last Updated**: 2025-11-09  
**Next Review**: After completing Week 1 tasks

