#!/usr/bin/env pwsh
# Build Dashboard Server
# Usage: .\start-build-dashboard.ps1

$ErrorActionPreference = "Stop"

Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 KAIRO BUILD DASHBOARD SERVER               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$port = 8888
$url = "http://localhost:$port/"

# Create HTTP listener
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($url)
$listener.Start()

Write-Host "✅ Server started!" -ForegroundColor Green
Write-Host "📊 Dashboard URL: $url" -ForegroundColor Yellow
Write-Host "🛑 Press Ctrl+C to stop the server`n" -ForegroundColor Gray

# Open browser
Start-Process $url

Write-Host "Waiting for requests...`n" -ForegroundColor Cyan

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath
        $method = $request.HttpMethod

        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $method $path" -ForegroundColor Gray

        if ($path -eq "/" -and $method -eq "GET") {
            # Serve the dashboard HTML
            $html = Get-Content "build-dashboard.html" -Raw
            $buffer = [System.Text.Encoding]::UTF8.GetBytes($html)
            $response.ContentType = "text/html"
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
        elseif ($path -eq "/build" -and $method -eq "POST") {
            # Handle build request
            $reader = New-Object System.IO.StreamReader($request.InputStream)
            $body = $reader.ReadToEnd() | ConvertFrom-Json

            $serviceName = $body.service
            $config = $body.config

            Write-Host "  🔨 Building $($config.name)..." -ForegroundColor Yellow

            try {
                # Build Docker image
                $buildOutput = docker build -f $config.dockerfile -t $config.image . 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  ✅ Build successful: $($config.name)" -ForegroundColor Green
                    
                    $result = @{
                        success = $true
                        message = "Build successful"
                        service = $serviceName
                    } | ConvertTo-Json

                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($result)
                    $response.ContentType = "application/json"
                    $response.StatusCode = 200
                } else {
                    Write-Host "  ❌ Build failed: $($config.name)" -ForegroundColor Red
                    
                    $result = @{
                        success = $false
                        message = "Build failed"
                        error = $buildOutput -join "`n"
                    } | ConvertTo-Json

                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($result)
                    $response.ContentType = "application/json"
                    $response.StatusCode = 500
                }

                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            catch {
                Write-Host "  ❌ Error: $_" -ForegroundColor Red
                
                $error = @{
                    success = $false
                    message = $_.Exception.Message
                } | ConvertTo-Json

                $buffer = [System.Text.Encoding]::UTF8.GetBytes($error)
                $response.ContentType = "application/json"
                $response.StatusCode = 500
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
        }
        elseif ($path -eq "/push" -and $method -eq "POST") {
            # Handle push request
            $reader = New-Object System.IO.StreamReader($request.InputStream)
            $body = $reader.ReadToEnd() | ConvertFrom-Json

            $image = $body.image

            Write-Host "  📤 Pushing $image..." -ForegroundColor Yellow

            try {
                # Push to Docker Hub
                $pushOutput = docker push $image 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  ✅ Push successful: $image" -ForegroundColor Green
                    
                    $result = @{
                        success = $true
                        message = "Push successful"
                        image = $image
                    } | ConvertTo-Json

                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($result)
                    $response.ContentType = "application/json"
                    $response.StatusCode = 200
                } else {
                    Write-Host "  ❌ Push failed: $image" -ForegroundColor Red
                    
                    $result = @{
                        success = $false
                        message = "Push failed"
                        error = $pushOutput -join "`n"
                    } | ConvertTo-Json

                    $buffer = [System.Text.Encoding]::UTF8.GetBytes($result)
                    $response.ContentType = "application/json"
                    $response.StatusCode = 500
                }

                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            catch {
                Write-Host "  ❌ Error: $_" -ForegroundColor Red
                
                $error = @{
                    success = $false
                    message = $_.Exception.Message
                } | ConvertTo-Json

                $buffer = [System.Text.Encoding]::UTF8.GetBytes($error)
                $response.ContentType = "application/json"
                $response.StatusCode = 500
                $response.ContentLength64 = $buffer.Length
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
        }
        else {
            # 404
            $response.StatusCode = 404
        }

        $response.Close()
    }
}
finally {
    $listener.Stop()
    $listener.Close()
    Write-Host "`n✅ Server stopped" -ForegroundColor Yellow
}
