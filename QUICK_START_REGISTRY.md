# Quick Start: Container Registry Setup

## 🎯 Goal
Connect your WhereIsIt Inventory App to Docker Hub and GitHub Container Registry so your Docker images are automatically built and published.

## ⚡ Fast Track (5 minutes)

### Step 1: Get Your Credentials Ready

**Docker Hub:**
1. Go to https://hub.docker.com/settings/security
2. Click "New Access Token"
3. Name it: `github-actions-whereisit`
4. Select: Read, Write, Delete
5. Copy the token (save it!)

**GitHub:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name it: `whereisit-ghcr`
4. Check: ✅ `write:packages` ✅ `read:packages`
5. Copy the token (save it!)

### Step 2: Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click: `Settings` → `Secrets and variables` → `Actions`
3. Click `New repository secret`
4. Add these two secrets:

   **Secret 1:**
   - Name: `DOCKER_USERNAME`
   - Value: Your Docker Hub username

   **Secret 2:**
   - Name: `DOCKER_PASSWORD`
   - Value: The Docker Hub access token from Step 1

### Step 3: Push to GitHub

```powershell
git add .
git commit -m "Configure container registries"
git push origin main
```

### Step 4: Watch It Work! 🎉

1. Go to your repository on GitHub
2. Click the `Actions` tab
3. Watch your workflow run
4. When it's done (green checkmark), your images are live!

## 📦 Your Images Are Now Available At:

```powershell
# Pull from Docker Hub
docker pull YOUR_DOCKERHUB_USERNAME/whereisit-inventory-app:latest

# Pull from GitHub Container Registry
docker pull ghcr.io/YOUR_GITHUB_USERNAME/whereisit-inventory-app:latest
```

## 🔄 What Happens Automatically?

Every time you push to `main`:
- ✅ Docker image is built
- ✅ Pushed to Docker Hub
- ✅ Pushed to GitHub Container Registry
- ✅ Tagged with `latest`, branch name, and commit SHA
- ✅ Multi-platform support (works on Intel and ARM)

Every time you create a version tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```
- ✅ Creates version tags: `v1.0.0`, `v1.0`, `v1`
- ✅ Updates `latest` tag

## 🧪 Test It Locally

```powershell
# Pull your image
docker pull YOUR_DOCKERHUB_USERNAME/whereisit-inventory-app:latest

# Run it
docker run -p 4000:4000 YOUR_DOCKERHUB_USERNAME/whereisit-inventory-app:latest

# Visit http://localhost:4000
```

## 🛠️ Manual Build (Optional)

If you want to build and push manually:

```powershell
# Build and push everything
.\build-and-push.ps1 -Action all `
  -Version "v1.0.0" `
  -DockerHubUsername "your-username" `
  -GitHubUsername "your-github-username"
```

## 📚 Need More Help?

- **Full Setup Guide**: `CONTAINER_REGISTRY_SETUP.md`
- **Validation Checklist**: `REGISTRY_VALIDATION_CHECKLIST.md`
- **Summary**: `REGISTRY_SETUP_SUMMARY.md`

## ❓ Common Issues

**Issue: GitHub Actions fails with "unauthorized"**
→ Check your secrets are set correctly in GitHub

**Issue: Cannot find image after push**
→ Wait 1-2 minutes for propagation, then try again

**Issue: Workflow doesn't trigger**
→ Make sure you pushed to `main` branch

---

**That's it!** Your container registry setup is complete. 🎊

Need help? Check the detailed guides or open an issue on GitHub.
