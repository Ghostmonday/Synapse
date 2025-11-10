# QA Test Harness

**⚠️ TEMPORARY INFRASTRUCTURE - Can be removed after testing**

This directory contains temporary QA testing infrastructure for validating the Sinapse application.

## Structure

- `load/` - k6 load testing scripts
- `security/` - ZAP security scanning scripts
- `run-all.sh` - Main test runner
- `sim-matrix.sh` - iOS Simulator matrix testing
- `auth-faults.sh` - Authentication fault injection tests
- `a11y-audit.sh` - Accessibility audit script

## Usage

### Run all QA tests:
```bash
./scripts/qa/run-all.sh
```

### Run specific tests:
```bash
# Load tests
k6 run scripts/qa/load/auth.js

# Security scan
./scripts/qa/security/zap-scan.sh

# Simulator matrix
./scripts/qa/sim-matrix.sh

# Auth fault injection
./scripts/qa/auth-faults.sh

# Accessibility audit
./scripts/qa/a11y-audit.sh
```

### Fastlane QA lane:
```bash
fastlane ios qa
```

## Reports

All test reports are generated in `reports/` directory:
- `load-test.json` - k6 load test results
- `zap.html` - ZAP security scan report
- `test-results-*.xcresult` - Xcode test results
- `uat.json` - UAT test results (from Composer)

## Removal

After testing is complete, remove:
- `fastlane/Fastfile` (or remove the `:qa` lane)
- `scripts/qa/` directory
- `composer-qa.config.json`
- `reports/` directory (if not needed)

