#!/bin/bash
# GitGuardian pre-commit hook
# Fails on secrets in commits

set -e

echo "🔍 Running GitGuardian secret scan..."

# Check if gitguardian CLI is installed
if ! command -v ggshield &> /dev/null; then
  echo "⚠️  GitGuardian CLI not found. Installing..."
  pip install ggshield || {
    echo "❌ Failed to install GitGuardian. Please install manually:"
    echo "   pip install ggshield"
    exit 1
  }
end

# Scan staged files
ggshield secret scan pre-commit || {
  echo "❌ GitGuardian detected secrets in staged files!"
  echo "   Please remove secrets before committing."
  exit 1
}

echo "✅ GitGuardian scan passed - no secrets detected"

