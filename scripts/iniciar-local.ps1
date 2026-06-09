Write-Host "Iniciando Evolution API (Docker)..." -ForegroundColor Cyan
docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro: Docker nao esta rodando. Instale o Docker Desktop." -ForegroundColor Red
    exit 1
}

Write-Host "Aguardando Evolution API..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "Iniciando bot em http://localhost:3000" -ForegroundColor Green
Write-Host "Login: imperio2025" -ForegroundColor Yellow
npm run dev
