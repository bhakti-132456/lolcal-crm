# AXON CRM: Windows Launcher
# OPERATION: SYSTEM STABILIZATION

# Setup correct working directory (root of the project)
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location "$PSScriptRoot\.."

Write-Host "AXON: Starting System Diagnostics..." -ForegroundColor Cyan

# Check for WebView2 (Required for Tauri)
$wv2 = Get-ItemProperty -Path "HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3C4FE00-EFD5-403B-9569-398A20F1BA4A}" -ErrorAction SilentlyContinue
if (-not $wv2) {
    $wv2 = Get-ItemProperty -Path "HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3C4FE00-EFD5-403B-9569-398A20F1BA4A}" -ErrorAction SilentlyContinue
}

if (-not $wv2) {
    Write-Host "[WARNING] WebView2 Runtime not detected! Tauri might fail to open the window." -ForegroundColor Yellow
    Write-Host "Install it from: https://developer.microsoft.com/en-us/microsoft-edge/webview2/" -ForegroundColor Gray
}

Write-Host "AXON: PURGING VITE CACHE..." -ForegroundColor Cyan
if (Test-Path "node_modules/.vite") {
    Remove-Item -Path "node_modules/.vite" -Recurse -Force -ErrorAction SilentlyContinue
}

# AXON: Initiating Ghost Hunter (Process Cleanup)...
Write-Host "AXON: Initiating Ghost Hunter (Process Cleanup)..." -ForegroundColor Cyan
# Kill standard names and variations (Tauri appends triples to sidecar names)
$processShortNames = @("pocketbase", "llama-server", "axon", "whisper-stt")
Get-Process | Where-Object { 
    $name = $_.ProcessName.ToLower()
    $match = $false
    foreach($sn in $processShortNames) {
        if ($name -like "*$sn*") { $match = $true; break }
    }
    return $match
} | Stop-Process -Force -ErrorAction SilentlyContinue

# Kill specific ports
$ports = 1420, 8091, 9081, 11435, 8090
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($c in $conns) {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            Write-Host "Cleared process on port $port" -ForegroundColor Gray
        }
    }
}

Start-Sleep -Seconds 1

Write-Host "AXON: Backing up current Vault state..." -ForegroundColor Cyan
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
if (!(Test-Path "backups")) {
    New-Item -ItemType Directory -Path "backups" | Out-Null
}

if (Test-Path "core/AXON_VAULT") {
    Copy-Item -Path "core/AXON_VAULT" -Destination "backups/AXON_VAULT_$TIMESTAMP" -Recurse -ErrorAction SilentlyContinue
}

if (Test-Path "core/axon_v1.db") {
    Copy-Item -Path "core/axon_v1.db" -Destination "backups/axon_v1_$TIMESTAMP.db" -ErrorAction SilentlyContinue
}

Write-Host "AXON: Launching STABILIZED CORE..." -ForegroundColor Green
Write-Host "(This might take a few minutes if Rust needs to compile)" -ForegroundColor Gray

npx tauri dev
