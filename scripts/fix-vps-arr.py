#!/usr/bin/env python3
"""Install ARR, restart backend, verify proxy on VPS."""

import os
import sys

import winrm

PASSWORD = os.environ.get("CONTABO_PASSWORD", "")
HOST = os.environ.get("CONTABO_HOST", "31.220.103.226")

STEPS = [
    (
        "arr",
        r"""
$Root='C:\ticketz'
$urls = @(
  'https://go.microsoft.com/fwlink/?LinkID=615136',
  'https://download.microsoft.com/download/4/9/C/49CD28DB-4AA6-400A-9D59-26B6780F1A42/requestRouter_amd64.msi'
)
$msi = "$Root\arr.msi"
foreach ($u in $urls) {
  curl.exe -fL -o $msi $u 2>&1 | Out-Null
  if ((Test-Path $msi) -and (Get-Item $msi).Length -gt 500000) { break }
}
Write-Output "arr size=$((Get-Item $msi -EA SilentlyContinue).Length)"
$arr = & "$env:windir\system32\inetsrv\appcmd.exe" list modules | Select-String 'ApplicationRequestRouting'
if (-not $arr -and (Test-Path $msi) -and (Get-Item $msi).Length -gt 500000) {
  Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /quiet /norestart" -Wait
  iisreset /restart
  Start-Sleep 6
}
& "$env:windir\system32\inetsrv\appcmd.exe" set config -section:system.webServer/proxy /enabled:"True" /commit:apphost 2>&1 | Out-Null
& "$env:windir\system32\inetsrv\appcmd.exe" list modules | Select-String 'RequestRouter|Rewrite|Proxy'
""",
    ),
    (
        "restart-backend",
        r"""
$Root='C:\ticketz'
Get-Process node -EA SilentlyContinue | Stop-Process -Force
Get-Process redis-server -EA SilentlyContinue | Stop-Process -Force
Start-Process "$Root\start-redis.cmd" -WindowStyle Hidden
Start-Sleep 3
Start-Process "$Root\start-backend.cmd" -WindowStyle Hidden
Start-Sleep 45
netstat -ano | findstr ":8080"
Get-Process node,redis-server -EA SilentlyContinue | Select Name,Id
""",
    ),
    (
        "verify",
        r"""
try { Write-Output "H8080=$((Invoke-WebRequest http://127.0.0.1:8080/health -UseBasicParsing -TimeoutSec 30).Content)" } catch { Write-Output "H8080=FAIL $($_.Exception.Message)" }
try {
  $r = Invoke-WebRequest 'http://127.0.0.1/health' -Headers @{Host='api-homolog.fortmax.com.br'} -UseBasicParsing -TimeoutSec 20
  Write-Output "PROXY=$($r.StatusCode) $($r.Content)"
} catch { Write-Output "PROXY=FAIL $($_.Exception.Message)" }
Get-Website | Where-Object { $_.Name -in @('WebG3v2Api','migracao.nivel.com.br','TicketzHomologApi') } | Select Name,State
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
