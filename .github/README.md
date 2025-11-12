# GitHub Repository Structure

This repository uses GitHub Actions for CI/CD. See `.github/workflows/` for workflow definitions.

## Workflows

- **`app-ci.yml`** - Continuous integration for the application
  - Runs on push and pull requests
  - Builds and tests TypeScript code
  - Validates iOS project structure

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass
4. Submit a pull request

## Code Quality

- TypeScript strict mode enabled
- ESLint for code quality
- Pre-commit hooks (if configured)
- Automated testing in CI

