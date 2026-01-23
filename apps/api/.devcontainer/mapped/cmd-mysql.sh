#!/bin/bash

# MySQL startup script
# Database initialization handled by SQL file in /docker-entrypoint-initdb.d/

echo "Starting MySQL server on port ${DB_PORT}..."

# Substitute environment variables in my.cnf
envsubst < /tmp/my.cnf > /etc/mysql/conf.d/my.cnf

# Execute the official MySQL entrypoint
exec docker-entrypoint.sh mysqld