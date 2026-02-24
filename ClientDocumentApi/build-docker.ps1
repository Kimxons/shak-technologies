# Build and push Docker image for Client Document API

# Configuration
$ImageName = "jipheens/client_document_api"
$Tag = "latest"

Write-Host "Building Docker image: ${ImageName}:${Tag}" -ForegroundColor Cyan

# Build the Docker image
docker build -t "${ImageName}:${Tag}" .

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n? Docker image built successfully" -ForegroundColor Green
    Write-Host "`nTo push to Docker Hub, run:" -ForegroundColor Yellow
    Write-Host "  docker login"
    Write-Host "  docker push ${ImageName}:${Tag}"
    Write-Host "`nTo test locally, run:" -ForegroundColor Yellow
    Write-Host "  docker run -d -p 5102:80 --name client-document-api ${ImageName}:${Tag}"
    Write-Host "`nTo view logs:" -ForegroundColor Yellow
    Write-Host "  docker logs -f client-document-api"
    Write-Host "`nTo stop and remove:" -ForegroundColor Yellow
    Write-Host "  docker stop client-document-api"
    Write-Host "  docker rm client-document-api"
} else {
    Write-Host "`n? Docker build failed" -ForegroundColor Red
    exit 1
}
