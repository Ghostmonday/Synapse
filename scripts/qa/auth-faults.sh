#!/bin/bash
# Authentication fault injection tests
# NOTE: Temporary QA script - can be removed after testing

echo "🔐 Testing authentication fault scenarios..."

# Test invalid credentials
echo "Testing invalid credentials..."
curl -X POST https://staging-api.sinapse.app/v1/auth/simulate_login \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid@test.com","password":"wrong"}' \
  -w "\nHTTP Status: %{http_code}\n" || true

# Test missing fields
echo "Testing missing fields..."
curl -X POST https://staging-api.sinapse.app/v1/auth/simulate_login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com"}' \
  -w "\nHTTP Status: %{http_code}\n" || true

# Test malformed JSON
echo "Testing malformed JSON..."
curl -X POST https://staging-api.sinapse.app/v1/auth/simulate_login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"' \
  -w "\nHTTP Status: %{http_code}\n" || true

echo "✅ Authentication fault tests completed"

