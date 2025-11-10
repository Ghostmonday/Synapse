#!/bin/bash
# OWASP ZAP Baseline Security Scan
# Scans staging-api.sinapse.app for vulnerabilities

set -e

TARGET=${1:-https://staging-api.sinapse.app}
REPORT_DIR="../../reports"
TIMEOUT=${2:-300}

echo "🔒 Running OWASP ZAP security scan on $TARGET..."
echo "   Timeout: ${TIMEOUT}s"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Please install Docker Desktop."
  exit 1
fi

# Pull ZAP image if not present
docker pull owasp/zap2docker-stable

# Run ZAP baseline scan
docker run -t --rm \
  -v "$(pwd)/$REPORT_DIR:/zap/wrk/:rw" \
  owasp/zap2docker-stable zap-baseline.py \
  -t "$TARGET" \
  -m 3 \
  -r zap.html \
  --timeout "$TIMEOUT" \
  -J zap.json \
  -x zap-xml.xml

# Move reports to reports directory
mv zap.html "$REPORT_DIR/zap.html" 2>/dev/null || true
mv zap.json "$REPORT_DIR/zap.json" 2>/dev/null || true
mv zap-xml.xml "$REPORT_DIR/zap-xml.xml" 2>/dev/null || true

echo "✅ ZAP scan complete. Reports saved to $REPORT_DIR/"
echo "   - zap.html (HTML report)"
echo "   - zap.json (JSON report)"
echo "   - zap-xml.xml (XML report)"

