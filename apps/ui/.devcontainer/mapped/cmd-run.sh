#!/bin/bash
set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd "$SCRIPT_DIR"

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  exit 1
fi

set -a
source .env
set +a

CONTAINER_APP="${COMPOSE_PROJECT_NAME}-App"

# Install dependencies and build
echo "Install dependencies..."
docker exec $CONTAINER_APP sh -c "npm install"
echo "✅ Dependencies installed"

echo "Building application..."
docker exec $CONTAINER_APP sh -c "npm run build"
echo "✅ Application built"

# Start services via supervisorctl
docker exec $CONTAINER_APP sh -c "
  supervisorctl reread &&
  supervisorctl update &&
  supervisorctl start app
"

echo ""
echo "✅ All services started successfully!"
echo "✅ Frontend (Svelte): http://localhost:${PORT}"