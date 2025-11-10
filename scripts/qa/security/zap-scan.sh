#!/bin/bash
# ZAP security scan script
# NOTE: Temporary QA script - can be removed after testing

TARGET=${1:-https://staging.sinapse.app}

docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t "$TARGET" -m 3 -r zap.html --timeout 300   # ✅ added timeout

mv zap.html ../../reports/zap.html

