#!/bin/bash
# Build and push Docker image for Client Document API

# Configuration
IMAGE_NAME="jipheens/client_document_api"
TAG="latest"

echo "Building Docker image: ${IMAGE_NAME}:${TAG}"

# Build the Docker image
docker build -t ${IMAGE_NAME}:${TAG} .

if [ $? -eq 0 ]; then
    echo "? Docker image built successfully"
    echo ""
    echo "To push to Docker Hub, run:"
    echo "  docker login"
    echo "  docker push ${IMAGE_NAME}:${TAG}"
    echo ""
    echo "To test locally, run:"
    echo "  docker run -d -p 5102:80 --name client-document-api ${IMAGE_NAME}:${TAG}"
    echo ""
    echo "To view logs:"
    echo "  docker logs -f client-document-api"
else
    echo "? Docker build failed"
    exit 1
fi
