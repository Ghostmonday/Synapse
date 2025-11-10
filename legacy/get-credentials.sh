#!/bin/bash
# Interactive script to get credentials

# Security: Exit on error, undefined vars, pipe failures
set -euo pipefail

# Validate .env file exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found. Create it first."
  exit 1
fi

echo "🔐 Sinapse Credentials Setup"
echo "=============================="
echo ""

# Function to safely update .env (prevents sed injection)
update_env_var() {
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
read -p "Enter Apple Team ID (10 chars): " APPLE_TEAM_ID
if [ -z "$APPLE_TEAM_ID" ]; then
  echo "⚠️  Skipping Apple Team ID"
else
  # Validate format (alphanumeric, 10 chars)
  if [[ ! "$APPLE_TEAM_ID" =~ ^[A-Za-z0-9]{10}$ ]]; then
    echo "⚠️  Warning: Apple Team ID should be 10 alphanumeric characters"
  fi
  update_env_var "APPLE_TEAM_ID" "$APPLE_TEAM_ID"
  echo "✅ Set APPLE_TEAM_ID"
fi

# Apple Key ID
read -p "Enter Apple Key ID (20 chars): " APPLE_KEY_ID
if [ -z "$APPLE_KEY_ID" ]; then
  echo "⚠️  Skipping Apple Key ID"
else
  # Validate format (alphanumeric, 20 chars)
  if [[ ! "$APPLE_KEY_ID" =~ ^[A-Za-z0-9]{20}$ ]]; then
    echo "⚠️  Warning: Apple Key ID should be 20 alphanumeric characters"
  fi
  update_env_var "APPLE_KEY_ID" "$APPLE_KEY_ID"
  echo "✅ Set APPLE_KEY_ID"
fi

# Apple Private Key
echo ""
echo "Paste Apple Private Key (full PEM block, press Ctrl+D when done):"
APPLE_PRIVATE_KEY=$(cat)
if [ ! -z "$APPLE_PRIVATE_KEY" ]; then
  # Validate PEM format
  if [[ ! "$APPLE_PRIVATE_KEY" =~ BEGIN.*PRIVATE.*KEY ]]; then
    echo "⚠️  Warning: Private key should be in PEM format"
  fi
  # Escape newlines and special chars, wrap in quotes
  ESCAPED_KEY=$(printf '%s\n' "$APPLE_PRIVATE_KEY" | sed 's/[[\.*^$()+?{|]/\\&/g' | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')
  update_env_var "APPLE_PRIVATE_KEY" "\"$ESCAPED_KEY\""
  echo "✅ Set APPLE_PRIVATE_KEY"
fi

# Supabase URL
read -p "Enter Supabase URL: " SUPABASE_URL
if [ -z "$SUPABASE_URL" ]; then
  echo "⚠️  Skipping Supabase URL"
else
  # Validate URL format
  if [[ ! "$SUPABASE_URL" =~ ^https?:// ]]; then
    echo "⚠️  Warning: Supabase URL should start with http:// or https://"
  fi
  update_env_var "NEXT_PUBLIC_SUPABASE_URL" "$SUPABASE_URL"
  echo "✅ Set NEXT_PUBLIC_SUPABASE_URL"
fi

# Supabase Service Role Key
read -p "Enter Supabase Service Role Key: " SUPABASE_KEY
if [ -z "$SUPABASE_KEY" ]; then
  echo "⚠️  Skipping Supabase Key"
else
  update_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_KEY"
  echo "✅ Set SUPABASE_SERVICE_ROLE_KEY"
fi

# Grok API Key
read -p "Enter Grok API Key: " GROK_KEY
if [ -z "$GROK_KEY" ]; then
  echo "⚠️  Skipping Grok Key"
else
  update_env_var "GROK_API_KEY" "$GROK_KEY"
  echo "✅ Set GROK_API_KEY"
fi

echo ""
echo "✅ Done! Check .env file"
