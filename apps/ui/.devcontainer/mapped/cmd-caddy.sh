#!/bin/bash
echo "Starting Caddy reverse proxy..."

# Substitute environment variables in Caddyfile
envsubst < /tmp/Caddyfile > /etc/caddy/Caddyfile

# Run Caddy with processed config
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile

echo ""
echo "✅ Caddy started successfully!"
echo "✅ Proxy listening on: http://localhost:${PORT_PROXY}"
