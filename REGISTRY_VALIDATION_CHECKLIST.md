# Registry Setup Validation Checklist

Use this checklist to verify your container registry setup is complete and working.

## ✅ Pre-Deployment Checklist

### GitHub Repository Configuration
- [ ] Repository exists on GitHub
- [ ] You have admin access to the repository
- [ ] Repository is set to public or private as intended

### GitHub Secrets Configuration
Navigate to: `Settings → Secrets and variables → Actions`

- [ ] `DOCKER_USERNAME` secret is set (your Docker Hub username)
- [ ] `DOCKER_PASSWORD` secret is set (Docker Hub access token)
- [ ] `GITHUB_TOKEN` is available (automatically provided by GitHub)

### Docker Hub Setup
- [ ] Docker Hub account created
- [ ] Access token generated with Read/Write/Delete permissions
- [ ] Repository name decided (default: `whereisit-inventory-app`)

### GitHub Container Registry Setup
- [ ] GitHub Personal Access Token created
- [ ] Token has `write:packages` and `read:packages` permissions
- [ ] Token saved securely

### Local Files Verification
- [ ] `backend/Dockerfile` exists
- [ ] `backend/.dockerignore` exists
- [ ] `backend/infra.config.ts` exists
- [ ] `.github/workflows/docker-publish.yml` exists
- [ ] `build-and-push.ps1` exists

## 🧪 Testing Checklist

### 1. Local Docker Build Test
```powershell
cd backend
docker build -t whereisit-test .
```
- [ ] Build completes without errors
- [ ] Image is created (verify with `docker images`)
- [ ] Image size is reasonable (<500MB recommended)

### 2. Local Container Run Test
```powershell
docker run --rm -p 4000:4000 whereisit-test
```
- [ ] Container starts without errors
- [ ] Application responds on port 4000
- [ ] Health check passes (if configured)

### 3. GitHub Actions Workflow Test
```bash
git add .
git commit -m "Test registry setup"
git push origin main
```
- [ ] Workflow triggers automatically
- [ ] All workflow steps pass (check Actions tab)
- [ ] Build step completes
- [ ] Push to Docker Hub succeeds
- [ ] Push to GHCR succeeds
- [ ] Attestations are generated

### 4. Image Availability Test

**Docker Hub:**
```powershell
docker pull YOUR_USERNAME/whereisit-inventory-app:latest
```
- [ ] Image pulls successfully
- [ ] Image runs correctly

**GitHub Container Registry:**
```powershell
docker pull ghcr.io/YOUR_USERNAME/whereisit-inventory-app:latest
```
- [ ] Image pulls successfully
- [ ] Image runs correctly

### 5. Version Tagging Test
```bash
git tag v1.0.0
git push origin v1.0.0
```
- [ ] Workflow triggers on tag
- [ ] Multiple version tags created (v1.0.0, v1.0, v1)
- [ ] `latest` tag updated

## 🔍 Verification Commands

### Check Docker Login Status
```powershell
# Docker Hub
docker login
docker info | Select-String -Pattern "Username"

# GHCR
docker login ghcr.io
```

### List Local Images
```powershell
docker images | Select-String -Pattern "whereisit"
```

### Inspect Image
```powershell
docker inspect whereisit-inventory-app:latest
```

### View Image Layers
```powershell
docker history whereisit-inventory-app:latest
```

### Check Image Size
```powershell
docker images whereisit-inventory-app --format "{{.Size}}"
```

## 📊 Monitoring Checklist

### GitHub Actions
- [ ] Enable email notifications for failed workflows
- [ ] Review workflow run history regularly
- [ ] Check for security alerts in Actions tab

### Docker Hub
- [ ] Verify images appear in repository
- [ ] Check pull statistics
- [ ] Review vulnerability scans (if available)

### GitHub Container Registry
- [ ] Images visible in Packages section
- [ ] Proper visibility settings (public/private)
- [ ] Download statistics visible

## 🚨 Troubleshooting Checklist

If something isn't working:

### GitHub Actions Fails
- [ ] Check secrets are set correctly (no typos)
- [ ] Verify Docker credentials are valid
- [ ] Check workflow logs for specific error
- [ ] Ensure backend/Dockerfile exists
- [ ] Verify GitHub token permissions

### Cannot Push to Docker Hub
- [ ] Verify you're logged in: `docker login`
- [ ] Check access token is valid
- [ ] Verify repository name is correct
- [ ] Check network connectivity

### Cannot Push to GHCR
- [ ] Verify GitHub token has correct scopes
- [ ] Check you're logged in: `docker login ghcr.io`
- [ ] Ensure package visibility settings allow push
- [ ] Verify repository name format

### Image Won't Run
- [ ] Check Dockerfile CMD/ENTRYPOINT
- [ ] Verify required environment variables
- [ ] Check port mappings
- [ ] Review container logs: `docker logs <container-id>`

## ✨ Optional Enhancements

### Security Enhancements
- [ ] Enable Docker Content Trust
- [ ] Add Snyk or Trivy scanning
- [ ] Implement image signing
- [ ] Add SBOM generation

### CI/CD Enhancements
- [ ] Add staging environment deployment
- [ ] Implement blue-green deployments
- [ ] Add smoke tests after deployment
- [ ] Configure rollback mechanism

### Monitoring Enhancements
- [ ] Set up image vulnerability scanning
- [ ] Configure Slack/Discord notifications
- [ ] Track image pull metrics
- [ ] Monitor registry storage usage

## 📝 Sign-Off

Once all items are checked:

Date: ________________
Verified by: ________________
Notes: ________________

---

**Status**: 
- [ ] All pre-deployment items complete
- [ ] All tests passing
- [ ] Ready for production use

For detailed help with any item, see `CONTAINER_REGISTRY_SETUP.md`.
