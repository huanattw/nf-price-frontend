#!/bin/bash

# Configuration - MODIFY THESE VARIABLES
DOCKERHUB_IMAGE="mhy1264/nf_price"  # Replace with your Docker Hub image name
DOCKERHUB_TAG="latest"                 # Replace with your Docker Hub image tag

# Google Cloud Configuration - ALREADY SET FOR YOUR ENVIRONMENT
GCP_PROJECT_ID="huan-447809"
GCP_REGION="asia-east1"
GCP_REPO_PATH="nfprice/nfprice"       # Repository/image path
GCP_IMAGE_TAG="$DOCKERHUB_TAG"         # Using same tag as Docker Hub image

# Full Artifact Registry path
GCP_FULL_PATH="$GCP_REGION-docker.pkg.dev/$GCP_PROJECT_ID/$GCP_REPO_PATH:$GCP_IMAGE_TAG"

# Display configuration
echo "======== Migration Configuration ========"
echo "Docker Hub Image: $DOCKERHUB_IMAGE:$DOCKERHUB_TAG"
echo "GCP Artifact Registry: $GCP_FULL_PATH"
echo "========================================"
echo

# Confirm before proceeding
read -p "Proceed with migration? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Migration cancelled."
    exit 1
fi

# Step 1: Configure Docker to use gcloud as credential helper
echo "Configuring Docker authentication for Google Artifact Registry..."
gcloud auth configure-docker $GCP_REGION-docker.pkg.dev
echo

# Step 2: Pull the image from Docker Hub
echo "Pulling image from Docker Hub: $DOCKERHUB_IMAGE:$DOCKERHUB_TAG"
docker pull $DOCKERHUB_IMAGE:$DOCKERHUB_TAG
if [ $? -ne 0 ]; then
    echo "Failed to pull image from Docker Hub. Aborting."
    exit 1
fi
echo

# Step 3: Tag the image for Google Artifact Registry
echo "Tagging image for Google Artifact Registry..."
docker tag $DOCKERHUB_IMAGE:$DOCKERHUB_TAG $GCP_FULL_PATH
if [ $? -ne 0 ]; then
    echo "Failed to tag image. Aborting."
    exit 1
fi
echo

# Step 4: Push the image to Google Artifact Registry
echo "Pushing image to Google Artifact Registry..."
docker push $GCP_FULL_PATH
if [ $? -ne 0 ]; then
    echo "Failed to push image to Google Artifact Registry. Aborting."
    exit 1
fi
echo

echo "======== Migration Summary ========"
echo "Successfully migrated Docker image:"
echo "  From: $DOCKERHUB_IMAGE:$DOCKERHUB_TAG"
echo "  To:   $GCP_FULL_PATH"
echo "==================================="
echo
echo "You can now pull this image using:"
echo "docker pull $GCP_FULL_PATH"