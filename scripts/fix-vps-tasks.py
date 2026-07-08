#!/usr/bin/env python3
"""Stable Ticketz services via Scheduled Tasks (no NSSM)."""

import os
import sys

import winrm

PASSWORD = os.environ.get("CONTABO_PASSWORD", "")
HOST = os.environ.get("CONTABO_HOST", "31.220.103.226")

STEPS = [
    (
        "prepare",
        r"""
Copy-Item C:\ticketz\.env-backend-vps C:\ticketz\backend\.env -Force
(Get-Content C:\ticketz\backend\.env) -replace 'REDIS_URI=redis://redis:6379','REDIS_URI=redis://127.0.0.1:6379' | Set-Content C:\ticketz\backend\.env
(Get-Content C:\ticketz\backend\.env) -replace '^PORT=3000','PORT=8080' | Set-Content C:\ticketz\backend\.env
@'
@echo off
cd /d C:\ticketz\backend
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
  if not "%%a"=="" set "%%a=%%b"
)
node dist\server.js
'@ | Set-Content C:\ticketz\run-backend.cmd -Encoding ASCII
@'
@echo off
cd /d C:\ticketz\redis
redis-server.exe --port 6379 --appendonly yes --maxmemory 256mb --dir C:\ticketz\redis-data
'@ | Set-Content C:\ticketz\run-redis.cmd -Encoding ASCII
Write-Output 'scripts ok'
""",
    ),
    (
        "tasks",
        r"""
schtasks /Delete /TN TicketzRedis /F 2>$null
schtasks /Delete /TN TicketzBackend /F 2>$null
$redisA = New-ScheduledTaskAction -Execute 'C:\Windows\System32\cmd.exe' -Argument '/c C:\ticketz\run-redis.cmd'
$backendA = New-ScheduledTaskAction -Execute 'C:\Windows\System32\cmd.exe' -Argument '/c C:\ticketz\run-backend.cmd' -WorkingDirectory 'C:\ticketz\backend'
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName TicketzRedis -Action $redisA -Trigger $trigger -User SYSTEM -RunLevel Highest -Settings $settings -Force
Start-Sleep -Seconds 2
$trigger2 = New-ScheduledTaskTrigger -AtStartup -RandomDelay (New-TimeSpan -Seconds 30)
Register-ScheduledTask -TaskName TicketzBackend -Action $backendA -Trigger $trigger2 -User SYSTEM -RunLevel Highest -Settings $settings -Force
Write-Output 'tasks registered'
""",
    ),
    (
        "start",
        r"""
Get-Process node,redis-server -EA SilentlyContinue | Stop-Process -Force
Start-ScheduledTask -TaskName TicketzRedis
Start-Sleep 5
Start-ScheduledTask -TaskName TicketzBackend
Start-Sleep 50
Get-ScheduledTask TicketzRedis,TicketzBackend | Select TaskName,State
Get-Service -EA SilentlyContinue | Out-Null
Get-Process node,redis-server -EA SilentlyContinue | Select Name,Id
netstat -ano | findstr ':8080'
""",
    ),
    (
        "verify",
        r"""
try { Write-Output "H=$((Invoke-WebRequest http://127.0.0.1:8080/health -UseBasicParsing -TimeoutSec 30).Content)" } catch { Write-Output "H=FAIL $($_.Exception.Message)" }
try {
  $r = Invoke-WebRequest 'http://127.0.0.1/health' -Headers @{Host='api-homolog.fortmax.com.br'} -UseBasicParsing -TimeoutSec 20
  Write-Output "P=$($r.StatusCode) $($r.Content)"
} catch { Write-Output "P=FAIL $($_.Exception.Message)" }
Get-Website | Where-Object { $_.Name -match 'WebG3|migracao|Ticketz' } | Select Name,State
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
