#!/bin/bash
# Script to create Xcode project for Sinapse iOS app

PROJECT_NAME="Sinapse"
WORKSPACE_DIR="$(pwd)"
PROJECT_DIR="$WORKSPACE_DIR/$PROJECT_NAME.xcodeproj"

echo "Creating Xcode project for $PROJECT_NAME..."

# Create Xcode project using xcodegen if available, otherwise provide manual instructions
if command -v xcodegen &> /dev/null; then
    echo "Using xcodegen to create project..."
    # Create project.yml for xcodegen
    cat > project.yml << EOF
name: $PROJECT_NAME
options:
  bundleIdPrefix: com.sinapse
  deploymentTarget:
    iOS: "17.0"
targets:
  $PROJECT_NAME:
    type: application
    platform: iOS
    deploymentTarget: "17.0"
    sources:
      - path: .
        excludes:
          - "*.md"
          - "*.sh"
          - "Package.swift"
    settings:
      PRODUCT_BUNDLE_IDENTIFIER: com.sinapse.app
      SWIFT_VERSION: "6.0"
      DEVELOPMENT_TEAM: ""
      CODE_SIGN_STYLE: Automatic
      INFOPLIST_FILE: Info.plist
      INFOPLIST_KEY_UIApplicationSceneManifest_Generation: YES
      INFOPLIST_KEY_UIApplicationSupportsIndirectInputEvents: YES
      INFOPLIST_KEY_UILaunchScreen_Generation: YES
      INFOPLIST_KEY_UISupportedInterfaceOrientations_iPad: "UIInterfaceOrientationPortrait UIInterfaceOrientationPortraitUpsideDown UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight"
      INFOPLIST_KEY_UISupportedInterfaceOrientations_iPhone: "UIInterfaceOrientationPortrait UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight"
EOF
    xcodegen generate
    echo "Xcode project created successfully!"
else
    echo "xcodegen not found. Creating project manually..."
    echo ""
    echo "MANUAL INSTRUCTIONS:"
    echo "1. Open Xcode"
    echo "2. File > New > Project"
    echo "3. Choose 'iOS' > 'App'"
    echo "4. Product Name: $PROJECT_NAME"
    echo "5. Interface: SwiftUI"
    echo "6. Language: Swift"
    echo "7. Save location: $WORKSPACE_DIR"
    echo "8. After creation:"
    echo "   - Delete the default ContentView.swift"
    echo "   - Drag all folders (Models, Views, Services, etc.) into the project"
    echo "   - Set Deployment Target to iOS 17.0"
    echo "   - Set Info.plist to include required permissions (microphone, etc.)"
    echo ""
    echo "Or install xcodegen: brew install xcodegen"
fi

