Write-Host "StudySync - Starting Server" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

# Generate .env if not present
if (-not (Test-Path -LiteralPath ".env")) {
  $secret = "studysync-" + [System.Guid]::NewGuid().ToString().Replace("-","") + [System.Guid]::NewGuid().ToString().Replace("-","")
  @"
JWT_SECRET=$secret
JWT_EXPIRES_IN=7d
PORT=4000
CORS_ORIGIN=http://localhost:4000
NODE_ENV=development
"@ | Set-Content -LiteralPath ".env"
  Write-Host "Created .env with generated JWT_SECRET" -ForegroundColor Cyan
}

# Load .env
Get-Content ".env" | ForEach-Object {
  if ($_ -match "^\s*([^#=]+)=(.*)$") {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2].Trim())
  }
}

Write-Host "Server will run at: http://localhost:4000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

& "C:\Program Files\nodejs\node.exe" "backend\src\index.js"
