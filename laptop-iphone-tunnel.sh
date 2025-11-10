#!/bin/bash
# Run this on your LAPTOP (where iPhone is physically connected)
# This tunnels the iPhone connection to the remote Mac

set -e

echo "📱 Starting iPhone USB tunnel..."
echo "Make sure your iPhone is connected via USB"

# Check if iPhone is connected
if ! idevice_id -l &>/dev/null; then
    echo "❌ No iPhone detected. Connect iPhone via USB first."
    exit 1
fi

echo "✅ iPhone detected: $(idevice_id -l)"
echo ""
echo "Starting iproxy tunnel on port 2222..."
echo "Keep this running while building on remote Mac"
echo ""

# Start iproxy (forwards USB port 22 to TCP port 2222)
iproxy 2222 22


