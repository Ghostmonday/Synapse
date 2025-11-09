# Security Deployment Guide

## 🚀 Quick Deploy Checklist

### 1. Review Git History Scrub
```bash
git log --all --full-history -- .env
# Should return nothing - if .env files found, re-run filter-branch
```

### 2. Deploy Supabase Edge Functions
```bash
cd supabase/functions

# Deploy all functions
supabase functions deploy api-key-vault
supabase functions deploy llm-proxy  
supabase functions deploy join-room
```

### 3. Set Edge Function Secrets
```bash
supabase secrets set DEEPSEEK_API_KEY=sk-your-key
supabase secrets set LIVEKIT_API_KEY=API-your-key
supabase secrets set LIVEKIT_API_SECRET=your-secret
supabase secrets set LIVEKIT_URL=wss://your-livekit-server.com
```

### 4. Run Database Migration
```bash
# Via Supabase Dashboard SQL Editor or CLI
psql $DATABASE_URL < sql/migrations/2025-11-security-audit-logs.sql
```

### 5. Update Environment Variables
Remove from `.env` (now in Edge Functions):
- `DEEPSEEK_API_KEY` → Moved to Edge Function secrets
- `LIVEKIT_API_KEY` → Moved to Edge Function secrets  
- `LIVEKIT_API_SECRET` → Moved to Edge Function secrets

Keep in `.env`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (backend only)
- `REDIS_URL`
- `JWT_SECRET`
- `AWS_*` (S3 credentials)

### 6. Run Security Tests
```bash
npm audit --production
npm i -g snyk && snyk test --severity=high --fail-on=upgradable
npm run test:security
```

### 7. Production Build
```bash
npm run build:prod
# Verifies no console.logs or debugger statements
```

### 8. Force Push Secure Branch
```bash
# ⚠️ WARNING: This rewrites history
git push origin secure-scrub --force

# After verification, merge to main:
git checkout main
git merge secure-scrub
git push origin main
```

## 🔒 Security Features Enabled

✅ **Zero Leakage**: All API keys in Supabase Edge Functions  
✅ **Rate Limited**: WebSocket (5 concurrent, 2/sec) + API (1000/min)  
✅ **Prompt Sanitized**: HTML stripped, backticks escaped, 4k token cap  
✅ **CORS Locked**: Only synapse.app and localhost:3000  
✅ **Health Checks**: WebSocket ping-pong every 30s  
✅ **Audit Trail**: All LLM prompts logged with SHA-256 hashes  
✅ **Dependencies Pinned**: livekit@2.2.3, supabase@2.38.1  

## 📋 Post-Deployment Verification

1. **Test Edge Functions**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/llm-proxy \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"test","model":"deepseek-chat"}'
   ```

2. **Verify Rate Limiting**:
   - Send 10 WebSocket connections rapidly → Should allow 5, rate limit rest
   - Send 100 API requests in 1 minute → Should allow 100, block 101st

3. **Check Audit Logs**:
   ```sql
   SELECT COUNT(*) FROM audit_logs WHERE action = 'llm_prompt';
   -- Should show logged prompts
   ```

4. **Verify CORS**:
   - Request from unauthorized origin → Should be blocked
   - Request from synapse.app → Should succeed

## ⚠️ Important Notes

- **MFA Enforcement**: Requires Supabase Auth hook configuration (manual step)
- **E2EE**: Requires client-side LiveKit configuration (see LiveKit docs)
- **RLS Policies**: Audit logs table has RLS enabled - verify policies work

---

**Status**: Ready for deployment ✅

