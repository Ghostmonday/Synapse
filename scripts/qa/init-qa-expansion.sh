#!/bin/bash
# Initialize QA Expansion Pipeline
# Usage: ./scripts/qa/init-qa-expansion.sh --repo Sinapse --branch main --coverage-target 90

set -e

REPO=${1:-Sinapse}
BRANCH=${2:-main}
COVERAGE_TARGET=${3:-90}

echo "🚀 Initializing QA Expansion Pipeline..."
echo "   Repo: $REPO"
echo "   Branch: $BRANCH"
echo "   Coverage Target: ${COVERAGE_TARGET}%"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm ci

# Install Playwright browsers
echo ""
echo "🎭 Installing Playwright browsers..."
npx playwright install --with-deps

# Setup iOS dependencies (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo ""
  echo "🍎 Setting up iOS dependencies..."
  cd frontend/iOS
  if [ -f "Podfile" ]; then
    pod install || echo "⚠️  CocoaPods not available, skipping"
  fi
  cd ../..
fi

# Generate coverage baseline
echo ""
echo "📊 Generating coverage baseline..."
npm test -- --coverage --coverageReporters=json-summary || true

# Verify test targets
echo ""
echo "✅ Verifying test targets..."
if [ -d "frontend/iOS" ]; then
  cd frontend/iOS
  xcodebuild -list -project Sinapse.xcodeproj 2>&1 | grep -q "SinapseTests\|SinapseUITests" && {
    echo "   ✓ Test targets found"
  } || {
    echo "   ⚠️  Test targets not found - run xcodegen generate"
  }
  cd ../..
fi

# Create reports directory
mkdir -p reports

echo ""
echo "✅ QA Expansion Pipeline initialized!"
echo ""
echo "Next steps:"
echo "  1. Run tests: npm test"
echo "  2. Run E2E: npm run test:e2e"
echo "  3. Run load tests: k6 run scripts/qa/load/messaging.js"
echo "  4. Check coverage: npm run coverage"

