# VALOW. Vote Server Launcher
# Opens a monitoring window to see live server output

$serverDir = Join-Path $PSScriptRoot "server"
$title = "VALOW. Vote Server — Monitor"

# Kill any existing node processes on port 3456
$existing = Get-NetTCPConnection -LocalPort 3456 -ErrorAction SilentlyContinue
if ($existing) {
    $proc = Get-Process -Id $existing.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq "node") {
        Write-Host "Stopping existing server (PID: $($proc.Id))..."
        $proc.Kill()
        Start-Sleep 1
    }
}

# Start server in a new window
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "cmd.exe"
$psi.Arguments = "/k title $title & cd /d `"$serverDir`" & echo. & echo   === VALOW. VOTE SERVER === & echo   Port: 3456 & echo   Admin: http://localhost:3456/ & echo   Site:  http://localhost:3456/site/index.html & echo. & echo   Close this window to stop the server. & echo. & npm start"
$psi.UseShellExecute = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Normal

[System.Diagnostics.Process]::Start($psi) | Out-Null

Write-Host ""
Write-Host "  VALOW. Vote Server started in a new window."
Write-Host "  Dashboard: http://localhost:3456/"
Write-Host "  Main site: http://localhost:3456/site/index.html"
Write-Host ""
