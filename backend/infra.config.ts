import { InfraConfig } from "@encore.dev/infra";

/**
 * Infrastructure Configuration for WhereIsIt Inventory App
 * 
 * This file configures container registries for Docker Hub and GitHub Container Registry.
 * These registries are used for deploying the application as container images.
 */

const infraConfig: InfraConfig = {
  // Configure container registries
  registries: [
    {
      // Docker Hub registry
      name: "dockerhub",
      url: "https://index.docker.io/v1/",
      // Uses DOCKER_USERNAME and DOCKER_PASSWORD environment variables
      // Set these in your Encore Cloud dashboard under Settings > Secrets
    },
    {
      // GitHub Container Registry
      name: "ghcr",
      url: "https://ghcr.io",
      // Uses GITHUB_USERNAME and GITHUB_TOKEN environment variables
      // The token needs 'write:packages' and 'read:packages' permissions
      // Set these in your Encore Cloud dashboard under Settings > Secrets
    },
  ],

  // Docker build configuration
  build: {
    // Base image for the container
    baseImage: "node:20-alpine",
    
    // Additional build arguments
    buildArgs: {
      NODE_ENV: "production",
    },
  },
};

export default infraConfig;
