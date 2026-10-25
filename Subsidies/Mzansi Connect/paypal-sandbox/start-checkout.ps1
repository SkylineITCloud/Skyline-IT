$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not $env:PAYPAL_SANDBOX_CLIENT_ID) { $env:PAYPAL_SANDBOX_CLIENT_ID = Read-Host 'PayPal sandbox Client ID' }
if (-not $env:PAYPAL_SANDBOX_CLIENT_SECRET) {
 $secretInput = Read-Host 'PayPal sandbox Secret (hidden)' -AsSecureString
 $env:PAYPAL_SANDBOX_CLIENT_SECRET = [System.Net.NetworkCredential]::new('', $secretInput).Password
}
if (-not $env:PAYPAL_SANDBOX_USD_PER_ZAR) { $env:PAYPAL_SANDBOX_USD_PER_ZAR = Read-Host 'Test USD per rand rate (example 0.05, test only)' }
Write-Host 'Open http://127.0.0.1:8800/ after the server starts. Close this terminal to stop.'
try {
 $bundledPython = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
 if (Test-Path -LiteralPath $bundledPython) { & $bundledPython server.py } else { python server.py }
} finally { Remove-Item Env:PAYPAL_SANDBOX_CLIENT_SECRET -ErrorAction SilentlyContinue }
