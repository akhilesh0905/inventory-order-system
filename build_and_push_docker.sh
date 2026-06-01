#!/bin/bash

# Make sure to run `docker login` before executing this script!

DOCKERHUB_USERNAME="codingwithakhilesh"
IMAGE_NAME="inventory-backend"
TAG="latest"

echo "Building backend Docker image..."
docker build -t $DOCKERHUB_USERNAME/$IMAGE_NAME:$TAG ./backend

echo "Pushing image to Docker Hub..."
docker push $DOCKERHUB_USERNAME/$IMAGE_NAME:$TAG

echo "=============================================="
echo "Done! Your backend Docker image link will be:"
echo "docker.io/$DOCKERHUB_USERNAME/$IMAGE_NAME:$TAG"
echo "=============================================="
