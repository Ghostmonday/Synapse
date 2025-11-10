#!/bin/bash
# Test script to verify QA harness setup
# NOTE: Temporary QA script - can be removed after testing

echo "🧪 Testing QA Harness Setup..."
echo ""

# Check if scripts are executable
echo "✅ Checking script permissions..."
for script in run-all.sh sim-matrix.sh auth-faults.sh a11y-audit.sh security/zap-scan.sh; do
  if [ -x "scripts/qa/$script" ]; then
    echo "  ✓ $script is executable"
  else
    echo "  ✗ $script is not executable"
  fi
done

# Check if Fastlane file exists
echo ""
echo "✅ Checking Fastlane configuration..."
if [ -f "fastlane/Fastfile" ]; then
  echo "  ✓ Fastfile exists"
  if grep -q "lane :qa" fastlane/Fastfile; then
    echo "  ✓ QA lane found"
  else
    echo "  ✗ QA lane not found"
  fi
else
  echo "  ✗ Fastfile not found"
fi

# Check if k6 script exists
echo ""
echo "✅ Checking k6 load test..."
if [ -f "scripts/qa/load/auth.js" ]; then
  echo "  ✓ auth.js exists"
  if grep -q "staging-api.sinapse.app" scripts/qa/load/auth.js; then
    echo "  ✓ Correct staging URL found"
  else
    echo "  ✗ Staging URL not found"
  fi
else
  echo "  ✗ auth.js not found"
fi

# Check if ZAP script exists
echo ""
echo "✅ Checking ZAP security scan..."
if [ -f "scripts/qa/security/zap-scan.sh" ]; then
  echo "  ✓ zap-scan.sh exists"
  if grep -q "timeout 300" scripts/qa/security/zap-scan.sh; then
    echo "  ✓ Timeout configured"
  else
    echo "  ✗ Timeout not configured"
  fi
else
  echo "  ✗ zap-scan.sh not found"
fi

# Check if Composer config exists
echo ""
echo "✅ Checking Composer config..."
if [ -f "composer-qa.config.json" ]; then
  echo "  ✓ composer-qa.config.json exists"
else
  echo "  ✗ composer-qa.config.json not found"
fi

# Check reports directory
echo ""
echo "✅ Checking reports directory..."
if [ -d "reports" ]; then
  echo "  ✓ reports directory exists"
else
  echo "  ✗ reports directory not found"
fi

echo ""
echo "✅ QA harness setup verification complete!"
echo ""
echo "To run tests: ./scripts/qa/run-all.sh"
echo "To remove after testing: See scripts/qa/REMOVAL.md"

