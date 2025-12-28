#!/bin/bash

# Redis startup script
# The official Redis image handles most initialization automatically

echo "Starting Redis server..."

# Execute the official Redis entrypoint
exec docker-entrypoint.sh redis-server
