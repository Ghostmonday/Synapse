#!/bin/bash

# Security: Exit on error, undefined vars, pipe failures
set -euo pipefail

# Validate .env file exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found. Create it first."
  exit 1
fi

echo "🚀 Quick Credentials Setup"
echo "=========================="
echo ""
echo "I'll prompt you for each credential. Press Enter to skip any you don't have yet."
echo ""

# Function to update .env (prevents sed injection)
update_env() {
  local key=$1
  local value=$2
  if [ -z "$value" ]; then
    return 0
  fi
  
  # Escape special characters for sed
  local escaped_value=$(printf '%s\n' "$value" | sed 's/[[\.*^$()+?{|]/\\&/g')
  
  # Use a temporary file for safer updates
  local temp_file=$(mktemp)
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed "s|^${key}=.*|${key}=${escaped_value}|" .env > "$temp_file"
  else
    sed "s|^${key}=.*|${key}=${escaped_value}|" .env > "$temp_file"
  fi
  mv "$temp_file" .env
}

# Apple Team ID
read -p "📱 Apple Team ID (10 chars, from developer.apple.com/account → Membership): " APPLE_TEAM_ID
if [ ! -z "$APPLE_TEAM_ID" ]; then
  # Validate format
  if [[ ! "$APPLE_TEAM_ID" =~ ^[A-Za-z0-9]{10}$ ]]; then
    echo "⚠️  Warning: Apple Team ID should be 10 alphanumeric characters"
  fi
  update_env "APPLE_TEAM_ID" "$APPLE_TEAM_ID"
fi

# Apple Key ID  
read -p "🔑 Apple Key ID (20 chars, from Auth Keys): " APPLE_KEY_ID
if [ ! -z "$APPLE_KEY_ID" ]; then
  # Validate format
  if [[ ! "$APPLE_KEY_ID" =~ ^[A-Za-z0-9]{20}$ ]]; then
    echo "⚠️  Warning: Apple Key ID should be 20 alphanumeric characters"
  fi
  update_env "APPLE_KEY_ID" "$APPLE_KEY_ID"
fi

# Apple Private Key
echo ""
echo "📄 Apple Private Key (paste full PEM block, end with Ctrl+D on empty line):"
APPLE_PRIVATE_KEY=$(cat)
if [ ! -z "$APPLE_PRIVATE_KEY" ]; then
  # Validate PEM format
  if [[ ! "$APPLE_PRIVATE_KEY" =~ BEGIN.*PRIVATE.*KEY ]]; then
    echo "⚠️  Warning: Private key should be in PEM format"
  fi
  # Convert newlines to \n for .env
  ESCAPED=$(printf '%s\n' "$APPLE_PRIVATE_KEY" | sed 's/[[\.*^$()+?{|]/\\&/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')
  update_env "APPLE_PRIVATE_KEY" "\"$ESCAPED\""
fi

# Supabase URL
echo ""
read -p "🗄️  Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
if [ ! -z "$SUPABASE_URL" ]; then
  # Validate URL format
  if [[ ! "$SUPABASE_URL" =~ ^https?:// ]]; then
    echo "⚠️  Warning: Supabase URL should start with http:// or https://"
  fi
  update_env "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
fi

# Supabase Key
read -p "🔐 Supabase Service Role Key: " SUPABASE_KEY
update_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_KEY"

# Grok API Key
echo ""
read -p "🤖 Grok API Key: " GROK_KEY
update_env "GROK_API_KEY" "$GROK_KEY"

echo ""
echo "✅ Done! Check .env file:"
echo ""
cat .env | grep -E "APPLE_|SUPABASE_|GROK_|JWT_SECRET" | grep -v "your_"
