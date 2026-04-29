#!/bin/bash
set -e

TARGET_UID="${DOCKER_UID:-0}"
TARGET_GID="${DOCKER_GID:-0}"

chown -R "${TARGET_UID}:${TARGET_GID}" /app/node_modules /home/www-data

exec gosu "${TARGET_UID}:${TARGET_GID}" "$@"
