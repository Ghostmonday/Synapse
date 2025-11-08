# Scripts Directory

Organized scripts for development, operations, and database management.

## Structure

### `dev/` - Development Scripts
- `seed.sh` - Database seeding
- `setup.sh` - Initial project setup
- `test-endpoints.sh` - API endpoint testing
- `validate-openapi.ts` - OpenAPI schema validation
- `check-supabase-readiness.sh` - Verify Supabase setup

### `ops/` - Operations Scripts
- `entrypoint.sh` - Docker container entrypoint
- `repair_high_cpu.sh` - CPU issue remediation
- `repair_high_latency.sh` - Latency issue remediation

## Usage

### Development
```bash
# Setup project
./scripts/dev/setup.sh

# Seed database
./scripts/dev/seed.sh

# Test endpoints
./scripts/dev/test-endpoints.sh
```

### Operations
```bash
# Repair high CPU
./scripts/ops/repair_high_cpu.sh

# Repair high latency
./scripts/ops/repair_high_latency.sh
```

