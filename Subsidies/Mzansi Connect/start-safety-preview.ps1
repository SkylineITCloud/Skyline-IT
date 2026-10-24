param([string]$Python = 'python', [int]$Port = 8790)
$ErrorActionPreference = 'Stop'
Write-Host 'Mzansi Connect: women’s safety concept and authenticated development dashboard.'
Write-Host 'Open the local address printed below. Synthetic records only; no real emergency messages.'
& $Python (Join-Path $PSScriptRoot 'Product\Livestock tracker\server\safety\preview.py') --port $Port
