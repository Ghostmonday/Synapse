#!/bin/bash
# iOS Simulator matrix test helper
# NOTE: Temporary QA script - can be removed after testing

DEVICES=("iPhone 15" "iPhone 15 Pro" "iPhone SE (3rd generation)" "iPad Pro (12.9-inch)")

for device in "${DEVICES[@]}"; do
  echo "🧪 Testing on $device..."
  xcodebuild test \
    -project ../../frontend/iOS/Sinapse.xcodeproj \
    -scheme Sinapse \
    -destination "platform=iOS Simulator,name=$device" \
    -resultBundlePath "../../reports/test-results-$device.xcresult" || echo "⚠️  Failed on $device"
done

echo "✅ Simulator matrix test completed"

