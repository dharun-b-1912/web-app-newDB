# scripts/workforce-gateway-agent.ps1
# ============================================================================
# WorkForceOS — Native PowerShell Biometric LAN Gateway Daemon Launcher
# ============================================================================

param(
  [string]$PairingKey = "PAIR-BEN-8425",
  [string]$TenantId = "org-joy-01"
)

$Host.UI.RawUI.WindowTitle = "WorkForceOS Biometric LAN Gateway Daemon"
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " ⚡ WorkForceOS Biometric LAN Gateway Daemon" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " Tenant ID   : $TenantId" -ForegroundColor Yellow
Write-Host " Pairing Key : $PairingKey" -ForegroundColor Yellow
Write-Host " Starting local socket agent on 127.0.0.1:11105..." -ForegroundColor Gray
Write-Host "================================================================`n" -ForegroundColor Cyan

$scriptPath = Join-Path $PSScriptRoot "workforce-gateway-agent.cjs"

if (Test-Path $scriptPath) {
  node $scriptPath --pair $PairingKey --tenant $TenantId
} else {
  Write-Error "Could not find $scriptPath. Please ensure Node.js is installed."
}
