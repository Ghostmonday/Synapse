# iOS Development Scripts

Scripts for iOS development and build management.

## Scripts

### `create_xcode_project.sh`
Creates Xcode project structure for Sinapse iOS app.

**Usage:**
```bash
# From repository root
./scripts/dev/ios/create_xcode_project.sh
```

**What it does:**
- Creates basic Xcode project structure
- Provides instructions for manual project setup
- Validates Xcode installation

---

### `package_ios.sh`
Packages iOS source files into a distributable zip archive.

**Usage:**
```bash
# From repository root
./scripts/dev/ios/package_ios.sh
```

**What it does:**
- Copies all Swift source files
- Includes configuration files (Info.plist, Products.storekit)
- Creates zip archive in `frontend/iOS/` directory
- Generates package info file

**Output:**
- `frontend/iOS/Sinapse_iOS_Final_Build.zip`

---

### `validate_swift.sh`
Validates Swift syntax for all iOS source files.

**Usage:**
```bash
# From repository root
./scripts/dev/ios/validate_swift.sh
```

**What it does:**
- Checks all `.swift` files for syntax errors
- Uses `swiftc -parse` for basic validation
- Reports files with errors

**Note:** Full compilation requires an Xcode project. This script only performs basic syntax checks.

---

## Requirements

- **macOS** with Xcode installed
- **Swift** compiler (comes with Xcode)
- **bash** shell

---

## Notes

- All scripts automatically navigate to `frontend/iOS/` directory
- Scripts can be run from repository root or any location
- Scripts preserve working directory context

