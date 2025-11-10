#!/bin/bash
# Validate QA Test Results
# Checks all output files and parses results

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPORTS_DIR="$PROJECT_ROOT/reports"
COVERAGE_DIR="$REPORTS_DIR/coverage"

echo "🔍 Validating QA Test Results"
echo "=============================="
echo ""

EXIT_CODE=0

# 1. Check required files exist
echo "📁 Checking Report Files:"
REQUIRED_FILES=(
  "unit-tests.log"
  "e2e-tests.log"
  "uat.json"
  "final-summary.txt"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$REPORTS_DIR/$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ $file (missing)"
    EXIT_CODE=1
  fi
done

# Check optional files
OPTIONAL_FILES=(
  "unit-tests.xcresult"
  "e2e-tests.xcresult"
  "coverage/lcov.html"
  "zap.html"
)

echo ""
echo "📁 Checking Optional Files:"
for file in "${OPTIONAL_FILES[@]}"; do
  if [ -f "$REPORTS_DIR/$file" ] || [ -d "$REPORTS_DIR/$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ⚠️  $file (not found - may be skipped)"
  fi
done

echo ""

# 2. Parse coverage
echo "📊 Coverage Analysis:"
if [ -f "$COVERAGE_DIR/coverage-summary.json" ]; then
  COVERAGE=$(node -e "try { const cov = require('$COVERAGE_DIR/coverage-summary.json'); console.log(cov.total.lines.pct.toFixed(2)); } catch(e) { console.log('N/A'); }" 2>/dev/null || echo "N/A")
  
  if [ "$COVERAGE" != "N/A" ] && [ -n "$COVERAGE" ]; then
    echo "   Lines Coverage: ${COVERAGE}%"
    
    if (( $(echo "$COVERAGE >= 90" | bc -l 2>/dev/null || echo 0) )); then
      echo "   Status: ✅ Excellent (≥90%)"
    elif (( $(echo "$COVERAGE >= 80" | bc -l 2>/dev/null || echo 0) )); then
      echo "   Status: ✅ Good (≥80%)"
      echo "   ⚠️  Warning: Below 90% target"
    else
      echo "   Status: ❌ Below threshold (<80%)"
      EXIT_CODE=1
    fi
  else
    echo "   Status: ⚠️  Could not parse coverage"
  fi
elif [ -f "$COVERAGE_DIR/lcov.info" ]; then
  echo "   ✅ Coverage report found (lcov.info)"
  echo "   Status: ⚠️  Parse lcov.info for detailed metrics"
else
  echo "   Status: ⚠️  Coverage report not found"
fi

echo ""

# 3. Parse security scan
echo "🔒 Security Scan Analysis:"
if [ -f "$REPORTS_DIR/zap.html" ]; then
  HIGH_COUNT=$(grep -i "high\|critical" "$REPORTS_DIR/zap.html" 2>/dev/null | grep -v "no high\|no critical" | wc -l | tr -d ' ' || echo "0")
  MEDIUM_COUNT=$(grep -i "medium" "$REPORTS_DIR/zap.html" 2>/dev/null | grep -v "no medium" | wc -l | tr -d ' ' || echo "0")
  
  echo "   High/Critical: $HIGH_COUNT"
  echo "   Medium: $MEDIUM_COUNT"
  
  if [ "$HIGH_COUNT" -eq 0 ] && [ "$MEDIUM_COUNT" -eq 0 ]; then
    echo "   Status: ✅ No high/medium vulnerabilities"
  else
    echo "   Status: ⚠️  Vulnerabilities detected"
    if [ "$HIGH_COUNT" -gt 0 ]; then
      EXIT_CODE=1
    fi
  fi
else
  echo "   Status: ⚠️  ZAP report not found (Docker may not be running)"
fi

echo ""

# 4. Parse UAT results
echo "🤖 UAT Simulation Analysis:"
if [ -f "$REPORTS_DIR/uat.json" ]; then
  # Check for problematic flags
  if grep -q '"splash_bounce": true\|"auth_retry": true' "$REPORTS_DIR/uat.json" 2>/dev/null; then
    echo "   Status: ❌ Problematic flags detected"
    EXIT_CODE=1
  else
    echo "   Status: ✅ No problematic flags"
  fi
  
  # Parse drop-off rates
  DROP_OFF=$(node -e "try { const data = require('$REPORTS_DIR/uat.json'); Object.values(data.personas || {}).forEach(p => { if (p.stats && parseFloat(p.stats.dropOffRate) > 10) { console.log('HIGH'); process.exit(1); } }); } catch(e) {}" 2>/dev/null || echo "")
  
  if [ "$DROP_OFF" = "HIGH" ]; then
    echo "   ⚠️  Warning: Drop-off rate exceeds 10% threshold"
  fi
  
  echo "   ✅ UAT JSON valid"
else
  echo "   Status: ❌ UAT report not found"
  EXIT_CODE=1
fi

echo ""

# 5. Check test exit codes from logs
echo "✅ Test Execution Status:"
if grep -q "Test Suites:.*failed" "$REPORTS_DIR/unit-tests.log" 2>/dev/null; then
  FAILED_SUITES=$(grep "Test Suites:" "$REPORTS_DIR/unit-tests.log" | grep -o "[0-9]* failed" | grep -o "[0-9]*" || echo "0")
  if [ "$FAILED_SUITES" -gt 0 ]; then
    echo "   ❌ Unit tests: $FAILED_SUITES test suite(s) failed"
    EXIT_CODE=1
  else
    echo "   ✅ Unit tests: All passed"
  fi
else
  echo "   ✅ Unit tests: Log indicates success"
fi

echo ""

# 6. Final summary
echo "=============================="
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All validations passed!"
else
  echo "❌ Some validations failed - check details above"
fi
echo ""

exit $EXIT_CODE

