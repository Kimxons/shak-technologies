param(
	[string]$Image = 'jipheens/client_document_api:latest',
	[string]$Tag = '',
	[switch]$ForceLogin,
	[switch]$NoCache,
	[switch]$NoPush,
	[switch]$Help
)

$ErrorActionPreference = 'Stop'

function Show-Help {
	Write-Host @"
Deploy Docker Image for Client Document API

USAGE:
  .\deploy-docker.ps1 [OPTIONS]

OPTIONS:
  -Image <string>      Docker image name (default: jipheens/client_document_api:latest)
  -Tag <string>        Additional tag to apply (e.g., v1.0.0)
  -ForceLogin          Force Docker Hub login even if credentials exist
  -NoCache             Build without using cache
  -NoPush              Build only, skip push to registry
  -Help                Show this help message

EXAMPLES:
  # Build and push with default settings
  .\deploy-docker.ps1

  # Build with custom tag and no cache
  .\deploy-docker.ps1 -Tag v1.2.3 -NoCache

  # Build only without pushing
  .\deploy-docker.ps1 -NoPush

  # Force login and push
  .\deploy-docker.ps1 -ForceLogin
"@
	exit 0
}

function Test-DockerHubCredentialsPresent {
	try {
		$dockerConfigPath = Join-Path $HOME '.docker\config.json'
		if (-not (Test-Path $dockerConfigPath)) { return $false }

		$config = Get-Content $dockerConfigPath -Raw | ConvertFrom-Json
		if ($null -eq $config) { return $false }

		# If a credsStore/credHelpers is configured, Docker can fetch creds without an inline auth string.
		if ($config.PSObject.Properties.Name -contains 'credsStore') { return $true }
		if ($config.PSObject.Properties.Name -contains 'credHelpers') { return $true }

		$auths = $config.auths
		if ($null -eq $auths) { return $false }

		$knownKeys = @(
			'https://index.docker.io/v1/',
			'https://registry-1.docker.io',
			'docker.io'
		)

		foreach ($key in $knownKeys) {
			if ($auths.PSObject.Properties.Name -contains $key) { return $true }
		}

		return $false
	} catch {
		return $false
	}
}

function Write-ColorOutput {
	param(
		[string]$Message,
		[string]$Color = 'White'
	)
	Write-Host $Message -ForegroundColor $Color
}

# Show help if requested
if ($Help) {
	Show-Help
}

# Validate script location
$ScriptRoot = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($ScriptRoot)) {
	$ScriptRoot = Get-Location
}

# Validate Dockerfile exists
$dockerfilePath = Join-Path $ScriptRoot 'Dockerfile'
if (-not (Test-Path $dockerfilePath)) {
	Write-ColorOutput "ERROR: Dockerfile not found at $dockerfilePath" 'Red'
	exit 1
}

# Parse image name and tag
if ($Image -match '^(.+):(.+)$') {
	$ImageBase = $Matches[1]
	$DefaultTag = $Matches[2]
} else {
	$ImageBase = $Image
	$DefaultTag = 'latest'
}

# Use provided tag or default
$FinalTag = if ([string]::IsNullOrWhiteSpace($Tag)) { $DefaultTag } else { $Tag }
$FullImage = "${ImageBase}:${FinalTag}"

Write-ColorOutput "`n========================================" 'Cyan'
Write-ColorOutput "  Client Document API - Docker Deploy" 'Cyan'
Write-ColorOutput "========================================`n" 'Cyan'

Write-ColorOutput "Image: $FullImage" 'Yellow'
Write-ColorOutput "Working Directory: $ScriptRoot`n" 'Yellow'

# Build Docker image
try {
	$buildArgs = @('build', '-t', $FullImage)
	
	if ($NoCache) {
		$buildArgs += '--no-cache'
		Write-ColorOutput "Building Docker image with --no-cache..." 'Cyan'
	} else {
		Write-ColorOutput "Building Docker image..." 'Cyan'
	}
	
	# Add latest tag as well if we're using a specific tag
	if ($FinalTag -ne 'latest') {
		$buildArgs += '-t'
		$buildArgs += "${ImageBase}:latest"
	}
	
	$buildArgs += '-f'
	$buildArgs += $dockerfilePath
	$buildArgs += $ScriptRoot
	
	Write-ColorOutput "Command: docker $($buildArgs -join ' ')`n" 'Gray'
	
	& docker @buildArgs
	if ($LASTEXITCODE -ne 0) { 
		throw "Docker build failed (exit code: $LASTEXITCODE)" 
	}
	
	Write-ColorOutput "`n? Docker image built successfully`n" 'Green'
	
} catch {
	Write-ColorOutput "`n? Docker build failed: $_" 'Red'
	exit 1
}

# Skip push if NoPush flag is set
if ($NoPush) {
	Write-ColorOutput "Skipping push (NoPush flag set)" 'Yellow'
	Write-ColorOutput "`nTo push manually, run:" 'Yellow'
	Write-ColorOutput "  docker push $FullImage" 'White'
	if ($FinalTag -ne 'latest') {
		Write-ColorOutput "  docker push ${ImageBase}:latest" 'White'
	}
	Write-ColorOutput "`nTo test locally, run:" 'Yellow'
	Write-ColorOutput "  docker run -d -p 5102:80 --name client-document-api $FullImage" 'White'
	exit 0
}

# Check Docker Hub login
if ($ForceLogin -or -not (Test-DockerHubCredentialsPresent)) {
	Write-ColorOutput "Docker Hub login required (or forced). Running docker login...`n" 'Yellow'
	docker login
	if ($LASTEXITCODE -ne 0) { 
		Write-ColorOutput "`n? Docker login failed" 'Red'
		exit 1 
	}
	Write-ColorOutput ""
} else {
	Write-ColorOutput "Docker Hub credentials detected; skipping docker login.`n" 'Gray'
}

# Push Docker image
try {
	Write-ColorOutput "Pushing $FullImage to Docker Hub..." 'Cyan'
	docker push $FullImage
	if ($LASTEXITCODE -ne 0) { 
		throw "Docker push failed (exit code: $LASTEXITCODE)" 
	}
	
	Write-ColorOutput "? Image pushed: $FullImage" 'Green'
	
	# Push latest tag if we tagged it
	if ($FinalTag -ne 'latest') {
		Write-ColorOutput "`nPushing ${ImageBase}:latest to Docker Hub..." 'Cyan'
		docker push "${ImageBase}:latest"
		if ($LASTEXITCODE -ne 0) { 
			throw "Docker push failed for latest tag (exit code: $LASTEXITCODE)" 
		}
		Write-ColorOutput "? Image pushed: ${ImageBase}:latest" 'Green'
	}
	
	Write-ColorOutput "`n========================================" 'Cyan'
	Write-ColorOutput "  Deployment Completed Successfully!" 'Green'
	Write-ColorOutput "========================================`n" 'Cyan'
	
	Write-ColorOutput "Next steps:" 'Yellow'
	Write-ColorOutput "  1. Pull on server: docker pull $FullImage" 'White'
	Write-ColorOutput "  2. Run container: docker run -d -p 5102:80 --name client-document-api $FullImage" 'White'
	Write-ColorOutput "  3. View logs: docker logs -f client-document-api`n" 'White'
	
	exit 0
	
} catch {
	Write-ColorOutput "`n? Docker push failed: $_" 'Red'
	exit 1
}
