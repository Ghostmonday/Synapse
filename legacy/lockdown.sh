#!/bin/bash

set -e

PROJECT_REF="iepjdfcbkmwhqshtyevg"

echo "🚀 Starting Sinapse infrastructure lockdown..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install with: npm install -g supabase"
    exit 1
fi

# 1. Deploy Edge Functions
echo "📦 Deploying Edge Functions..."
supabase functions deploy api-key-vault --project-ref $PROJECT_REF || echo "⚠️  api-key-vault deployment failed"
supabase functions deploy llm-proxy --project-ref $PROJECT_REF || echo "⚠️  llm-proxy deployment failed"
supabase functions deploy join-room --project-ref $PROJECT_REF || echo "⚠️  join-room deployment failed"

# 2. Set Secrets
echo "🔐 Setting secrets..."
supabase secrets set DEEPSEEK_API_KEY="sk-e7d0fbdb5bad4db484ff9036c39f54ac" --project-ref $PROJECT_REF || echo "⚠️  DEEPSEEK_API_KEY failed"
supabase secrets set LIVEKIT_API_KEY="APIXwuVneVRyb42" --project-ref $PROJECT_REF || echo "⚠️  LIVEKIT_API_KEY failed"
supabase secrets set LIVEKIT_API_SECRET="01MTuGypDhRfy4CLxChG9IYUteS235F2OYfor04DjsQA" --project-ref $PROJECT_REF || echo "⚠️  LIVEKIT_API_SECRET failed"
supabase secrets set LIVEKIT_URL="wss://sinapse-ysfq2dir.livekit.cloud" --project-ref $PROJECT_REF || echo "⚠️  LIVEKIT_URL failed"

echo "✅ Done!"

