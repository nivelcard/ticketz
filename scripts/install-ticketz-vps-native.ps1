# Ticketz backend — instalação nativa Windows (fallback quando Docker/WSL2 indisponível)
# Porta 8080 — não conflita com IIS (80/443/8081)

$ErrorActionPreference = "Stop"
$Root = "C:\ticketz"
$Backend = "$Root\backend"
$Log = "$Root\install-native.log"

function Log($m) {
    $line = "[$(Get-Date -Format o)] $m"
    Add-Content $Log $line
    Write-Output $line
}

Log "=== Ticketz native install ==="

# Node.js 24
$nodeMsi = "$Root\node-v24.msi"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Log "Downloading Node.js 24..."
    curl.exe -fL -o $nodeMsi "https://nodejs.org/dist/v24.0.0/node-v24.0.0-x64.msi"
    Log "Installing Node.js..."
    Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /quiet /norestart" -Wait
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
}
Log "Node: $(node --version 2>&1)"
Log "NPM: $(npm --version 2>&1)"

# Redis for Windows
$redisDir = "$Root\redis"
$redisZip = "$Root\redis.zip"
if (-not (Test-Path "$redisDir\redis-server.exe")) {
    Log "Downloading Redis..."
    curl.exe -fL -o $redisZip "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip"
    Expand-Archive -Path $redisZip -DestinationPath $redisDir -Force
}
Log "Redis: $redisDir"

# Env
Copy-Item "$Root\.env-backend-vps" "$Backend\.env" -Force
(Get-Content "$Backend\.env") -replace 'REDIS_URI=redis://redis:6379', 'REDIS_URI=redis://127.0.0.1:6379' | Set-Content "$Backend\.env"
(Get-Content "$Backend\.env") -replace '^PORT=3000', 'PORT=8080' | Set-Content "$Backend\.env"

# Build
Log "Building backend..."
Push-Location $Backend
npm ci --no-audit --no-fund 2>&1 | Tee-Object -Append $Log
npm run build 2>&1 | Tee-Object -Append $Log
Pop-Location

# Firewall
$rule = "Ticketz-Backend-8080"
if (-not (Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $rule -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 | Out-Null
}

# NSSM service (download if missing)
$nssm = "$Root\nssm.exe"
if (-not (Test-Path $nssm)) {
    Log "Downloading NSSM..."
    curl.exe -fL -o "$Root\nssm.zip" "https://nssm.cc/release/nssm-2.24.zip"
    Expand-Archive "$Root\nssm.zip" "$Root\nssm-tmp" -Force
    Copy-Item "$Root\nssm-tmp\nssm-2.24\win64\nssm.exe" $nssm
}

# Redis service
& $nssm stop TicketzRedis 2>$null
& $nssm remove TicketzRedis confirm 2>$null
& $nssm install TicketzRedis "$redisDir\redis-server.exe" "--appendonly yes --maxmemory 256mb --dir `"$Root\redis-data`""
& $nssm set TicketzRedis AppDirectory $redisDir
& $nssm set TicketzRedis Start SERVICE_AUTO_START
& $nssm set TicketzRedis AppStdout "$Root\logs\redis.log"
& $nssm set TicketzRedis AppStderr "$Root\logs\redis.err.log"
& $nssm set TicketzRedis AppRotateFiles 1
& $nssm set TicketzRedis AppRotateBytes 104857600

# Backend service
$nodeExe = (Get-Command node).Source
& $nssm stop TicketzBackend 2>$null
& $nssm remove TicketzBackend confirm 2>$null
& $nssm install TicketzBackend $nodeExe "$Backend\dist\server.js"
& $nssm set TicketzBackend AppDirectory $Backend
& $nssm set TicketzBackend AppEnvironmentExtra "NODE_ENV=production"
& $nssm set TicketzBackend Start SERVICE_AUTO_START
& $nssm set TicketzBackend AppStdout "$Root\logs\backend.log"
& $nssm set TicketzBackend AppStderr "$Root\logs\backend.err.log"
& $nssm set TicketzBackend AppRotateFiles 1
& $nssm set TicketzBackend AppRotateBytes 104857600
& $nssm set TicketzBackend AppExit Default Restart
& $nssm set TicketzBackend AppRestartDelay 5000

New-Item -ItemType Directory -Force -Path "$Root\logs", "$Root\redis-data", "$Backend\public", "$Backend\private" | Out-Null

Log "Starting services..."
& $nssm start TicketzRedis
Start-Sleep -Seconds 3
& $nssm start TicketzBackend
Start-Sleep -Seconds 15

Log "Health check..."
try {
    $r = Invoke-WebRequest -Uri "http://127.0.0.1:8080/health" -UseBasicParsing -TimeoutSec 30
    Log "Health: $($r.StatusCode) $($r.Content)"
} catch {
    Log "Health FAILED: $($_.Exception.Message)"
    Get-Content "$Root\logs\backend.err.log" -Tail 30 -ErrorAction SilentlyContinue | ForEach-Object { Log $_ }
}

Log "=== Done ==="
