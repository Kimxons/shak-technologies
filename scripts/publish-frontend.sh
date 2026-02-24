#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

IMAGE="${1:-jipheens/kairo_frontend:latest}"
COMPOSE_FILE="${2:-docker-compose.yml}"
SERVICE="${3:-frontend}"
FORCE_LOGIN="${4:-false}"

if [[ "$COMPOSE_FILE" != /* ]]; then
	COMPOSE_FILE="$REPO_ROOT/$COMPOSE_FILE"
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
	echo "Compose file not found: $COMPOSE_FILE" >&2
	exit 1
fi

has_dockerhub_creds() {
	local cfg="$HOME/.docker/config.json"
	[[ -f "$cfg" ]] || return 1

	# If credsStore/credHelpers exists, consider creds available.
	if grep -q '"credsStore"' "$cfg"; then return 0; fi
	if grep -q '"credHelpers"' "$cfg"; then return 0; fi

	# Common Docker Hub auth keys.
	if grep -q '"https://index.docker.io/v1/"' "$cfg"; then return 0; fi
	if grep -q '"https://registry-1.docker.io"' "$cfg"; then return 0; fi
	if grep -q '"docker.io"' "$cfg"; then return 0; fi

	return 1
}

echo "Building $IMAGE via $COMPOSE_FILE ($SERVICE) ..."
export KAIRO_FRONTEND_IMAGE="$IMAGE"
docker compose -f "$COMPOSE_FILE" build "$SERVICE"

if [[ "$FORCE_LOGIN" == "true" ]] || ! has_dockerhub_creds; then
	echo "\nDocker Hub login required (or forced). Running docker login..."
	docker login
else
	echo "\nDocker Hub credentials appear present; skipping docker login."
fi

echo "\nPushing $IMAGE via $COMPOSE_FILE ($SERVICE) ..."
docker compose -f "$COMPOSE_FILE" push "$SERVICE"

echo "\nDone."
