#!/bin/bash

# MySQL startup script
# Database initialization handled by SQL file in /docker-entrypoint-initdb.d/

echo "Starting MySQL server..."

# Execute the official MySQL entrypoint
exec docker-entrypoint.sh mysqld