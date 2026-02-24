param(
	[string]$Image = 'jipheens/kairo_frontend:latest',
	[string]$ComposeFile = 'docker-compose.yml',
	[string]$Service = 'frontend',
	[switch]$ForceLogin,
	[switch]$NoCache
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')

function Resolve-ComposeFilePath([string]$Path) {
	if ([string]::IsNullOrWhiteSpace($Path)) {
		throw "Compose file path is required."
	}

	# If user gave an absolute path, keep it; otherwise resolve relative to repo root.
	if ([System.IO.Path]::IsPathRooted($Path)) {
		if (-not (Test-Path $Path)) { throw "Compose file not found: $Path" }
		return (Resolve-Path $Path).Path
	}

	$combined = Join-Path $RepoRoot $Path
	if (-not (Test-Path $combined)) { throw "Compose file not found: $combined" }
	return (Resolve-Path $combined).Path
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

Push-Location $RepoRoot
try {
	$composePath = Resolve-ComposeFilePath $ComposeFile

	$buildArgs = @('-f', $composePath, 'build')
	if ($NoCache) {
		$buildArgs += '--no-cache'
		Write-Host "Building $Image via $composePath ($Service) with --no-cache ..."
	} else {
		Write-Host "Building $Image via $composePath ($Service) ..."
	}
	$buildArgs += $Service
	
	$env:KAIRO_FRONTEND_IMAGE = $Image
	& docker compose @buildArgs
	if ($LASTEXITCODE -ne 0) { throw "docker compose build failed (exit $LASTEXITCODE)" }

if ($ForceLogin -or -not (Test-DockerHubCredentialsPresent)) {
	Write-Host "" 
	Write-Host "Docker Hub login required (or forced). Running docker login..."
		docker login
		if ($LASTEXITCODE -ne 0) { throw "docker login failed (exit $LASTEXITCODE)" }
} else {
	Write-Host "" 
	Write-Host "Docker Hub credentials appear present; skipping docker login."
}

Write-Host "" 
Write-Host "Pushing $Image via $composePath ($Service) ..."
docker compose -f $composePath push $Service
	if ($LASTEXITCODE -ne 0) { throw "docker compose push failed (exit $LASTEXITCODE)" }

Write-Host "" 
Write-Host "Done."
exit 0
} finally {
	Pop-Location
}
