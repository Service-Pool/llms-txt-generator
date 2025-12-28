#!/bin/bash

# MySQL startup script
# The official MySQL image handles most initialization automatically

echo "Starting MySQL server..."

# Execute the official MySQL entrypoint
exec docker-entrypoint.sh mysqld