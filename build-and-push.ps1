# Docker Registry Management Script for WhereIsIt Inventory App
# This script helps you build and push Docker images to Docker Hub and GHCR

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('build', 'push', 'all', 'login', 'clean')]
    [string]$Action = 'all',
    
    [Parameter(Mandatory=$false)]
    [string]$Version = 'latest',
    
    [Parameter(Mandatory=$false)]
    [string]$DockerHubUsername = '',
    
    [Parameter(Mandatory=$false)]
    [string]$GitHubUsername = ''
)

$ErrorActionPreference = "Stop"
$ImageName = "whereisit-inventory-app"

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Login-DockerHub {
    if ([string]::IsNullOrEmpty($DockerHubUsername)) {
        $DockerHubUsername = Read-Host "Enter your Docker Hub username"
    }
    
    Write-Info "Logging into Docker Hub as $DockerHubUsername..."
    docker login -u $DockerHubUsername
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Successfully logged into Docker Hub"
    } else {
        Write-Error-Custom "Failed to login to Docker Hub"
        exit 1
    }
}

function Login-GHCR {
    if ([string]::IsNullOrEmpty($GitHubUsername)) {
        $GitHubUsername = Read-Host "Enter your GitHub username"
    }
    
    $token = Read-Host "Enter your GitHub Personal Access Token" -AsSecureString
    $tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($token)
    )
    
    Write-Info "Logging into GitHub Container Registry as $GitHubUsername..."
    echo $tokenPlain | docker login ghcr.io -u $GitHubUsername --password-stdin
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Successfully logged into GitHub Container Registry"
    } else {
        Write-Error-Custom "Failed to login to GHCR"
        exit 1
    }
}

function Build-Image {
    Write-Info "Building Docker image: $ImageName:$Version"
    
    Push-Location backend
    
    docker build -t "${ImageName}:${Version}" .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Successfully built image: $ImageName:$Version"
    } else {
        Write-Error-Custom "Failed to build image"
        Pop-Location
        exit 1
    }
    
    Pop-Location
}

function Tag-Images {
    if ([string]::IsNullOrEmpty($DockerHubUsername)) {
        Write-Info "Skipping Docker Hub tagging (no username provided)"
    } else {
        Write-Info "Tagging image for Docker Hub: $DockerHubUsername/$ImageName:$Version"
        docker tag "${ImageName}:${Version}" "${DockerHubUsername}/${ImageName}:${Version}"
        Write-Success "Tagged for Docker Hub"
    }
    
    if ([string]::IsNullOrEmpty($GitHubUsername)) {
        Write-Info "Skipping GHCR tagging (no username provided)"
    } else {
        Write-Info "Tagging image for GHCR: ghcr.io/$GitHubUsername/$ImageName:$Version"
        docker tag "${ImageName}:${Version}" "ghcr.io/${GitHubUsername}/${ImageName}:${Version}"
        Write-Success "Tagged for GHCR"
    }
}

function Push-Images {
    if (-not [string]::IsNullOrEmpty($DockerHubUsername)) {
        Write-Info "Pushing to Docker Hub..."
        docker push "${DockerHubUsername}/${ImageName}:${Version}"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Successfully pushed to Docker Hub"
        } else {
            Write-Error-Custom "Failed to push to Docker Hub"
        }
    }
    
    if (-not [string]::IsNullOrEmpty($GitHubUsername)) {
        Write-Info "Pushing to GitHub Container Registry..."
        docker push "ghcr.io/${GitHubUsername}/${ImageName}:${Version}"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Successfully pushed to GHCR"
        } else {
            Write-Error-Custom "Failed to push to GHCR"
        }
    }
}

function Clean-Images {
    Write-Info "Cleaning up local Docker images..."
    
    docker rmi "${ImageName}:${Version}" -f 2>$null
    
    if (-not [string]::IsNullOrEmpty($DockerHubUsername)) {
        docker rmi "${DockerHubUsername}/${ImageName}:${Version}" -f 2>$null
    }
    
    if (-not [string]::IsNullOrEmpty($GitHubUsername)) {
        docker rmi "ghcr.io/${GitHubUsername}/${ImageName}:${Version}" -f 2>$null
    }
    
    Write-Success "Cleaned up local images"
}

# Main execution
Write-Host "`n🐋 WhereIsIt Docker Registry Manager`n" -ForegroundColor Magenta

switch ($Action) {
    'login' {
        Write-Info "Logging into registries..."
        Login-DockerHub
        Login-GHCR
    }
    'build' {
        Build-Image
        Tag-Images
    }
    'push' {
        Push-Images
    }
    'clean' {
        Clean-Images
    }
    'all' {
        Build-Image
        Tag-Images
        Push-Images
        Write-Success "`nAll operations completed successfully!"
        Write-Info "Images available at:"
        if (-not [string]::IsNullOrEmpty($DockerHubUsername)) {
            Write-Host "  📦 Docker Hub: docker pull $DockerHubUsername/$ImageName:$Version" -ForegroundColor Yellow
        }
        if (-not [string]::IsNullOrEmpty($GitHubUsername)) {
            Write-Host "  📦 GHCR: docker pull ghcr.io/$GitHubUsername/$ImageName:$Version" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
