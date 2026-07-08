#!/usr/bin/env python3
"""Fix IIS rewrite install + backend diagnostics on Contabo VPS."""

import os
import sys

import winrm

HOST = os.environ.get("CONTABO_HOST", "31.220.103.226")
USER = os.environ.get("CONTABO_USER", "administrator")
PASSWORD = os.environ.get("CONTABO_PASSWORD", "")

STEPS = [
    (
        "download-rewrite",
        r"""
$Root='C:\ticketz'
$urls = @(
  'https://go.microsoft.com/fwlink/?LinkID=615137',
  'https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi'
)
$msi = "$Root\rewrite2.msi"
foreach ($u in $urls) {
  curl.exe -fL -o $msi $u 2>&1 | Out-Null
  if ((Test-Path $msi) -and (Get-Item $msi).Length -gt 5000000) { break }
}
Write-Output "msi size=$((Get-Item $msi -EA SilentlyContinue).Length)"
""",
    ),
    (
        "install-rewrite",
        r"""
$Root='C:\ticketz'
$msi = "$Root\rewrite2.msi"
$rw = & "$env:windir\system32\inetsrv\appcmd.exe" list modules | Select-String 'RewriteModule'
if (-not $rw -and (Test-Path $msi) -and (Get-Item $msi).Length -gt 5000000) {
  Start-Process msiexec.exe -ArgumentList "/i `"$msi`" /quiet /norestart" -Wait
  iisreset /restart
  Start-Sleep 6
}
& "$env:windir\system32\inetsrv\appcmd.exe" list modules | Select-String 'Rewrite'
""",
    ),
    (
        "backend-diag",
        r"""
$Root='C:\ticketz'
Write-Output "=== PORT LISTEN ==="
netstat -ano | findstr ":8080"
Write-Output "=== BACKEND LOG TAIL ==="
Get-Content "$Root\logs\backend.err.log" -Tail 25 -EA SilentlyContinue
Get-Content "$Root\logs\backend.log" -Tail 15 -EA SilentlyContinue
Write-Output "=== HEALTH ==="
try { Write-Output (Invoke-WebRequest http://127.0.0.1:8080/health -UseBasicParsing -TimeoutSec 30).Content } catch { Write-Output $_.Exception.Message }
Write-Output "=== PROXY ==="
try {
  $r = Invoke-WebRequest 'http://127.0.0.1/health' -Headers @{Host='api-homolog.fortmax.com.br'} -UseBasicParsing -TimeoutSec 15
  Write-Output "$($r.StatusCode) $($r.Content)"
} catch { Write-Output $_.Exception.Message }
""",
    ),
]


def main():
    if not PASSWORD:
        print("CONTABO_PASSWORD required")
        return 1
    s = winrm.Session(
        f"https://{HOST}:5986/wsman",
        auth=(USER, PASSWORD),
        transport="basic",
        server_cert_validation="ignore",
    )
    for name, ps in STEPS:
        print(f"\n=== {name} ===")
        r = s.run_ps(ps)
        out = (r.std_out or b"").decode("utf-8", errors="replace")
        print(out.strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
