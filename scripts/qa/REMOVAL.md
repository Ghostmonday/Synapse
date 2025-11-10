# QA Harness Removal Guide

**⚠️ This entire QA infrastructure is temporary and can be removed after testing**

## Quick Removal

To remove all QA infrastructure:

```bash
# Remove QA scripts
rm -rf scripts/qa/

# Remove Fastlane QA lane (or entire Fastfile if only QA lane exists)
# Edit fastlane/Fastfile and remove the :qa lane, or:
rm -rf fastlane/

# Remove Composer config
rm composer-qa.config.json

# Remove reports (optional - keep if you want to preserve test results)
rm -rf reports/
```

## What to Remove

### Files to Delete:
- `scripts/qa/` - Entire directory
- `fastlane/Fastfile` - Or just remove the `:qa` lane
- `composer-qa.config.json` - Composer QA configuration
- `reports/` - Test reports directory (optional)

### Git Cleanup:
```bash
git rm -r scripts/qa/
git rm fastlane/Fastfile  # or edit to remove :qa lane
git rm composer-qa.config.json
git rm -r reports/  # if you want to remove reports too
git commit -m "Remove temporary QA harness infrastructure"
```

## What to Keep (Optional)

You may want to keep:
- Test results in `reports/` for historical reference
- Any custom test scripts you've added
- Fastlane configuration if you're using it for other purposes

## Verification

After removal, verify:
```bash
# Should not exist
ls scripts/qa/  # Should fail
ls fastlane/Fastfile  # Should fail (or not contain :qa lane)
ls composer-qa.config.json  # Should fail
```

