# Container Registry Setup Guide

This guide explains how to connect and use Docker Hub and GitHub Container Registry (GHCR) with your WhereIsIt Inventory App.

## Overview

The application is configured to push Docker images to two container registries:
1. **Docker Hub** - Public/private Docker registry
2. **GitHub Container Registry (GHCR)** - GitHub's container registry

## Prerequisites

- Docker installed on your local machine
- GitHub account with repository access
- Docker Hub account (optional, for Docker Hub registry)

## 1. GitHub Container Registry Setup

### Step 1: Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name: `whereisit-ghcr-token`
4. Select the following scopes:
   - ✅ `write:packages` - Upload packages to GitHub Package Registry
   - ✅ `read:packages` - Download packages from GitHub Package Registry
   - ✅ `delete:packages` - Delete packages from GitHub Package Registry (optional)
5. Click "Generate token"
6. **Copy the token immediately** - you won't be able to see it again!

### Step 2: Configure GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Add the following secrets:
   - `GITHUB_TOKEN` - (automatically provided by GitHub Actions)
   - `DOCKER_USERNAME` - Your Docker Hub username (if using Docker Hub)
   - `DOCKER_PASSWORD` - Your Docker Hub password or access token

### Step 3: Test GHCR Login Locally

```bash
# Export your GitHub token
$env:GHCR_TOKEN="your_github_personal_access_token"

# Login to GitHub Container Registry
echo $env:GHCR_TOKEN | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Verify login
docker info | Select-String -Pattern "ghcr.io"
```

## 2. Docker Hub Setup

### Step 1: Create Docker Hub Access Token

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Go to Account Settings → Security → Access Tokens
3. Click "New Access Token"
4. Name it: `whereisit-github-actions`
5. Select permissions: Read, Write, Delete
6. Click "Generate"
7. **Copy the token** - save it securely

### Step 2: Test Docker Hub Login Locally

```bash
# Login to Docker Hub
docker login -u YOUR_DOCKERHUB_USERNAME

# When prompted, enter your access token (not password)
```

## 3. Building and Pushing Images Manually

### Build the Docker Image

```bash
# Navigate to backend directory
cd backend

# Build the image
docker build -t whereisit-inventory-app:latest .

# Tag for Docker Hub
docker tag whereisit-inventory-app:latest YOUR_DOCKERHUB_USERNAME/whereisit-inventory-app:latest

# Tag for GHCR
docker tag whereisit-inventory-app:latest ghcr.io/YOUR_GITHUB_USERNAME/whereisit-inventory-app:latest
```

### Push to Docker Hub

```bash
docker push YOUR_DOCKERHUB_USERNAME/whereisit-inventory-app:latest
```

### Push to GitHub Container Registry

```bash
docker push ghcr.io/YOUR_GITHUB_USERNAME/whereisit-inventory-app:latest
```

## 4. Automated CI/CD with GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/docker-publish.yml`) that automatically:

- Builds Docker images on every push to `main` branch
- Pushes to both Docker Hub and GHCR
- Tags images with version numbers, branch names, and `latest`
- Creates multi-platform images (amd64, arm64)
- Generates build attestations for security

### Workflow Triggers

The workflow runs on:
- Push to `main` or `master` branch
- Push of version tags (e.g., `v1.0.0`)
- Pull requests (build only, no push)
- Manual trigger via GitHub Actions UI

### Image Tags Generated

For version `v1.2.3` on the `main` branch:
- `latest`
- `v1.2.3`
- `v1.2`
- `v1`
- `main`
- `main-abc1234` (commit SHA)

## 5. Using the Images

### Pull from Docker Hub

```bash
docker pull YOUR_DOCKERHUB_USERNAME/whereisit-inventory-app:latest
```

### Pull from GHCR

```bash
docker pull ghcr.io/YOUR_GITHUB_USERNAME/whereisit-inventory-app:latest
```

### Run the Container

```bash
docker run -d \
  --name whereisit-app \
  -p 4000:4000 \
  -e DATABASE_URL="your_database_url" \
  YOUR_DOCKERHUB_USERNAME/whereisit-inventory-app:latest
```

## 6. Encore Cloud Integration

If using Encore Cloud for deployment:

### Configure Registries in Encore Dashboard

1. Go to [Encore Cloud Dashboard](https://app.encore.cloud/)
2. Select your app: `whereisit-inventory-app-9xhi`
3. Navigate to Settings → Infrastructure → Registries
4. Add Docker Hub:
   - Name: `dockerhub`
   - URL: `https://index.docker.io/v1/`
   - Username: Your Docker Hub username
   - Token: Your Docker Hub access token
5. Add GHCR:
   - Name: `ghcr`
   - URL: `https://ghcr.io`
   - Username: Your GitHub username
   - Token: Your GitHub personal access token

### Deploy with Encore

```bash
# Deploy to Encore Cloud
encore deploy

# Encore will use the configured registries to pull images
```

## 7. Troubleshooting

### Issue: "denied: permission_denied"

**Solution**: Ensure your access tokens have the correct permissions and haven't expired.

### Issue: "unauthorized: authentication required"

**Solution**: Re-login to the registry:

```bash
# For Docker Hub
docker login

# For GHCR
echo $env:GHCR_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

### Issue: GitHub Actions workflow fails

**Solution**: Check that all required secrets are set in your repository settings.

### Issue: "no space left on device"

**Solution**: Clean up Docker system:

```bash
docker system prune -a --volumes
```

## 8. Security Best Practices

1. **Never commit tokens** to your repository
2. **Use access tokens** instead of passwords
3. **Rotate tokens** regularly (every 90 days)
4. **Use minimal permissions** - only grant what's needed
5. **Enable 2FA** on Docker Hub and GitHub
6. **Review access logs** periodically
7. **Use private repositories** for sensitive images

## 9. Monitoring and Maintenance

### View Images in Docker Hub

1. Go to [Docker Hub](https://hub.docker.com/)
2. Navigate to Repositories
3. Click on `whereisit-inventory-app`
4. View tags, pulls, and statistics

### View Images in GHCR

1. Go to your GitHub profile
2. Click "Packages"
3. Click on `whereisit-inventory-app`
4. View versions and download statistics

### Clean Up Old Images

GitHub Actions automatically manages image lifecycle, but you can manually delete old images:

```bash
# Delete local images
docker rmi ghcr.io/USERNAME/whereisit-inventory-app:old-tag

# Use GitHub web interface to delete packages from GHCR
```

## 10. Next Steps

- [ ] Set up GitHub secrets for automated builds
- [ ] Configure Encore Cloud registry connections
- [ ] Test the complete CI/CD pipeline
- [ ] Set up image scanning for vulnerabilities
- [ ] Configure image signing for enhanced security
- [ ] Monitor image sizes and optimize Dockerfile

## Resources

- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [GitHub Container Registry Documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Encore Docker Build Guide](https://encore.dev/docs/self-host/docker-build)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
