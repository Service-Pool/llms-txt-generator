#!/bin/bash

# MySQL startup script
echo "Starting MySQL server on port ${DB_PORT}..."

# Substitute environment variables in my.cnf
envsubst < /tmp/my.cnf > /etc/mysql/conf.d/my.cnf

# Process init-database.sql with envsubst
echo "Processing init-database.sql with environment variables..."

# Substitute environment variables in 01-init-database.sql
envsubst < /tmp/init-database.sql > /docker-entrypoint-initdb.d/01-init-database.sql

# Execute the official MySQL entrypoint
exec docker-entrypoint.sh mysqld