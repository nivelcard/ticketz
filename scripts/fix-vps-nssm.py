#!/usr/bin/env python3
"""Install NSSM services for Ticketz — split steps to avoid WinRM length limit."""

import os
import sys

import winrm

PASSWORD = os.environ.get("CONTABO_PASSWORD", "")
HOST = os.environ.get("CONTABO_HOST", "31.220.103.226")

STEPS = [
    (
        "nssm-download",
        r"""
$Root='C:\ticketz'
if (-not (Test-Path "$Root\nssm.exe")) {
  curl.exe -fL -o "$Root\nssm.zip" "https://github.com/kirill85/nssm/releases/download/2.24/nssm-2.24.zip"
  Expand-Archive "$Root\nssm.zip" "$Root\nssm-tmp" -Force
  Copy-Item "$Root\nssm-tmp\nssm-2.24\win64\nssm.exe" "$Root\nssm.exe" -Force
}
Write-Output "nssm ok=$(Test-Path $Root\nssm.exe)"
""",
    ),
    (
        "run-scripts",
        r"""
@'
@echo off
cd /d C:\ticketz\backend
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
  if not "%%a"=="" set "%%a=%%b"
)
node dist\server.js
'@ | Set-Content C:\ticketz\run-backend.cmd -Encoding ASCII

Copy-Item C:\ticketz\.env-backend-vps C:\ticketz\backend\.env -Force
(Get-Content C:\ticketz\backend\.env) -replace 'REDIS_URI=redis://redis:6379','REDIS_URI=redis://127.0.0.1:6379' | Set-Content C:\ticketz\backend\.env
(Get-Content C:\ticketz\backend\.env) -replace '^PORT=3000','PORT=8080' | Set-Content C:\ticketz\backend\.env
Write-Output 'run-backend.cmd ok'
""",
    ),
    (
        "install-services",
        r"""
$Root='C:\ticketz'
$N='C:\ticketz\nssm.exe'
Get-Process node,redis-server -EA SilentlyContinue | Stop-Process -Force
& $N stop TicketzRedis 2>$null; & $N remove TicketzRedis confirm 2>$null
& $N stop TicketzBackend 2>$null; & $N remove TicketzBackend confirm 2>$null
& $N install TicketzRedis "$Root\redis\redis-server.exe" "--port 6379 --appendonly yes --maxmemory 256mb --dir $Root\redis-data"
& $N set TicketzRedis AppDirectory "$Root\redis"
& $N set TicketzRedis Start SERVICE_AUTO_START
& $N set TicketzRedis AppStdout "$Root\logs\redis.log"
& $N set TicketzRedis AppStderr "$Root\logs\redis.err.log"
& $N install TicketzBackend "C:\Windows\System32\cmd.exe" "/c C:\ticketz\run-backend.cmd"
& $N set TicketzBackend AppDirectory "$Root\backend"
& $N set TicketzBackend Start SERVICE_AUTO_START
& $N set TicketzBackend AppStdout "$Root\logs\backend.log"
& $N set TicketzBackend AppStderr "$Root\logs\backend.err.log"
& $N set TicketzBackend AppExit Default Restart
& $N set TicketzBackend AppRestartDelay 5000
& $N start TicketzRedis
Start-Sleep 3
& $N start TicketzBackend
Write-Output 'services installed'
""",
    ),
    (
        "verify",
        r"""
Start-Sleep 45
Get-Service TicketzRedis,TicketzBackend -EA SilentlyContinue | Select Name,Status
netstat -ano | findstr ':8080'
try { Write-Output "H=$(Invoke-WebRequest http://127.0.0.1:8080/health -UseBasicParsing -TimeoutSec 30).Content" } catch { Write-Output "H=FAIL" }
try {
  $r = Invoke-WebRequest 'http://127.0.0.1/health' -Headers @{Host='api-homolog.fortmax.com.br'} -UseBasicParsing -TimeoutSec 20
  Write-Output "P=$($r.StatusCode) $($r.Content)"
} catch { Write-Output "P=FAIL" }
""",
    ),
]


def main():
    if not PASSWORD:
        print("CONTABO_PASSWORD required")
        return 1
    s = winrm.Session(
        f"https://{HOST}:5986/wsman",
        auth=("administrator", PASSWORD),
        transport="basic",
        server_cert_validation="ignore",
    )
    for name, ps in STEPS:
        print(f"\n=== {name} ===")
        r = s.run_ps(ps)
        print((r.std_out or b"").decode("utf-8", errors="replace").strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
