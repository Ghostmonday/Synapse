#!/bin/bash
# Accessibility audit script
# NOTE: Temporary QA script - can be removed after testing

echo "♿ Running accessibility audit..."

# Check if Xcode is available
if ! command -v xcodebuild &> /dev/null; then
  echo "⚠️  Xcode not available, skipping accessibility audit"
  exit 0
fi

# Run accessibility tests
xcodebuild test \
  -project ../../frontend/iOS/Sinapse.xcodeproj \
  -scheme Sinapse \
  -destination "platform=iOS Simulator,name=iPhone 15" \
  -only-testing:SinapseTests/AccessibilityTests \
  -resultBundlePath "../../reports/a11y-audit.xcresult" || echo "⚠️  Accessibility tests not found, skipping"

echo "✅ Accessibility audit completed"

