#!/bin/bash

# Deploy Docker Image for Client Document API
# Default configuration
IMAGE="jipheens/client_document_api:latest"
TAG=""
FORCE_LOGIN=false
NO_CACHE=false
NO_PUSH=false

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Show help function
show_help() {
    cat << EOF
Deploy Docker Image for Client Document API

USAGE:
  ./deploy-docker.sh [OPTIONS]

OPTIONS:
  -i, --image <name>     Docker image name (default: jipheens/client_document_api:latest)
  -t, --tag <tag>        Additional tag to apply (e.g., v1.0.0)
  -f, --force-login      Force Docker Hub login even if credentials exist
  -n, --no-cache         Build without using cache
  -s, --skip-push        Build only, skip push to registry
  -h, --help             Show this help message

EXAMPLES:
  # Build and push with default settings
  ./deploy-docker.sh

  # Build with custom tag and no cache
  ./deploy-docker.sh -t v1.2.3 -n

  # Build only without pushing
  ./deploy-docker.sh -s

  # Force login and push
  ./deploy-docker.sh -f

EOF
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--image)
            IMAGE="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -f|--force-login)
            FORCE_LOGIN=true
            shift
            ;;
        -n|--no-cache)
            NO_CACHE=true
            shift
            ;;
        -s|--skip-push)
            NO_PUSH=true
            shift
            ;;
        -h|--help)
            show_help
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker is not installed or not in PATH${NC}"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR" || exit 1

# Validate Dockerfile exists
if [ ! -f "$SCRIPT_DIR/Dockerfile" ]; then
    echo -e "${RED}ERROR: Dockerfile not found at $SCRIPT_DIR/Dockerfile${NC}"
    exit 1
fi

# Parse image name and tag
if [[ $IMAGE =~ ^(.+):(.+)$ ]]; then
    IMAGE_BASE="${BASH_REMATCH[1]}"
    DEFAULT_TAG="${BASH_REMATCH[2]}"
else
    IMAGE_BASE="$IMAGE"
    DEFAULT_TAG="latest"
fi

# Use provided tag or default
if [ -z "$TAG" ]; then
    FINAL_TAG="$DEFAULT_TAG"
else
    FINAL_TAG="$TAG"
fi

FULL_IMAGE="${IMAGE_BASE}:${FINAL_TAG}"

# Check Docker Hub credentials
check_docker_credentials() {
    local config_file="$HOME/.docker/config.json"
    
    if [ ! -f "$config_file" ]; then
        return 1
    fi
    
    # Check if credsStore or credHelpers is configured
    if grep -q '"credsStore"' "$config_file" || grep -q '"credHelpers"' "$config_file"; then
        return 0
    fi
    
    # Check for auth entries
    if grep -q '"https://index.docker.io/v1/"' "$config_file" || \
       grep -q '"docker.io"' "$config_file"; then
        return 0
    fi
    
    return 1
}

echo -e "${CYAN}"
echo "========================================"
echo "  Client Document API - Docker Deploy"
echo "========================================"
echo -e "${NC}"

echo -e "${YELLOW}Image: $FULL_IMAGE${NC}"
echo -e "${YELLOW}Working Directory: $SCRIPT_DIR${NC}"
echo ""

# Build Docker image
echo -e "${CYAN}Building Docker image...${NC}"

BUILD_ARGS=("build" "-t" "$FULL_IMAGE")

if [ "$NO_CACHE" = true ]; then
    BUILD_ARGS+=("--no-cache")
    echo -e "${YELLOW}Using --no-cache flag${NC}"
fi

# Add latest tag as well if we're using a specific tag
if [ "$FINAL_TAG" != "latest" ]; then
    BUILD_ARGS+=("-t" "${IMAGE_BASE}:latest")
fi

BUILD_ARGS+=("-f" "$SCRIPT_DIR/Dockerfile" "$SCRIPT_DIR")

echo -e "${GRAY}Command: docker ${BUILD_ARGS[*]}${NC}"
echo ""

if docker "${BUILD_ARGS[@]}"; then
    echo ""
    echo -e "${GREEN}? Docker image built successfully${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}? Docker build failed${NC}"
    exit 1
fi

# Skip push if NO_PUSH flag is set
if [ "$NO_PUSH" = true ]; then
    echo -e "${YELLOW}Skipping push (skip-push flag set)${NC}"
    echo ""
    echo -e "${YELLOW}To push manually, run:${NC}"
    echo "  docker push $FULL_IMAGE"
    if [ "$FINAL_TAG" != "latest" ]; then
        echo "  docker push ${IMAGE_BASE}:latest"
    fi
    echo ""
    echo -e "${YELLOW}To test locally, run:${NC}"
    echo "  docker run -d -p 5102:80 --name client-document-api $FULL_IMAGE"
    exit 0
fi

# Check Docker Hub login
if [ "$FORCE_LOGIN" = true ] || ! check_docker_credentials; then
    echo -e "${YELLOW}Docker Hub login required (or forced). Running docker login...${NC}"
    echo ""
    if ! docker login; then
        echo ""
        echo -e "${RED}? Docker login failed${NC}"
        exit 1
    fi
    echo ""
else
    echo -e "${GRAY}Docker Hub credentials detected; skipping docker login.${NC}"
    echo ""
fi

# Push Docker image
echo -e "${CYAN}Pushing $FULL_IMAGE to Docker Hub...${NC}"
if docker push "$FULL_IMAGE"; then
    echo -e "${GREEN}? Image pushed: $FULL_IMAGE${NC}"
else
    echo ""
    echo -e "${RED}? Docker push failed${NC}"
    exit 1
fi

# Push latest tag if we tagged it
if [ "$FINAL_TAG" != "latest" ]; then
    echo ""
    echo -e "${CYAN}Pushing ${IMAGE_BASE}:latest to Docker Hub...${NC}"
    if docker push "${IMAGE_BASE}:latest"; then
        echo -e "${GREEN}? Image pushed: ${IMAGE_BASE}:latest${NC}"
    else
        echo ""
        echo -e "${RED}? Docker push failed for latest tag${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${CYAN}"
echo "========================================"
echo -e "${GREEN}  Deployment Completed Successfully!"
echo -e "${CYAN}========================================"
echo -e "${NC}"

echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Pull on server: docker pull $FULL_IMAGE"
echo "  2. Run container: docker run -d -p 5102:80 --name client-document-api $FULL_IMAGE"
echo "  3. View logs: docker logs -f client-document-api"
echo ""

exit 0
