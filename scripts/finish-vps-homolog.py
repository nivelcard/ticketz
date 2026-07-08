#!/usr/bin/env python3
"""Finish Ticketz homolog on Contabo VPS — step-by-step WinRM."""

import os
import sys

import winrm

HOST = os.environ.get("CONTABO_HOST", "31.220.103.226")
USER = os.environ.get("CONTABO_USER", "administrator")
PASSWORD = os.environ.get("CONTABO_PASSWORD", "")

STEPS = [
    (
        "install-rewrite",
        r"""
$Root='C:\ticketz'
$rewriteMsi="$Root\rewrite_amd64.msi"
if (-not (Test-Path $rewriteMsi) -or (Get-Item $rewriteMsi).Length -lt 5000000) {
  curl.exe -fL -o $rewriteMsi "https://download.microsoft.com/download/1/2/8/128E2E0C-1B16-4B94-99D3-AA7D8C6C8D51/rewrite_amd64_en-US.msi"
}
$rw = & "$env:windir\system32\inetsrv\appcmd.exe" list modules | Select-String 'RewriteModule'
if (-not $rw) { Start-Process msiexec.exe -ArgumentList "/i `"$rewriteMsi`" /quiet /norestart" -Wait }
Write-Output "rewrite=$((Get-Item $rewriteMsi -EA SilentlyContinue).Length) module=$(if($rw){'ok'}else{'installed'})"
""",
    ),
    (
        "install-arr",
        r"""
$Root='C:\ticketz'
$arrMsi="$Root\requestRouter_amd64.msi"
if (-not (Test-Path $arrMsi) -or (Get-Item $arrMsi -EA SilentlyContinue).Length -lt 500000) {
  curl.exe -fL -o $arrMsi "https://download.microsoft.com/download/E/9/8/E9849D89-A020-4FE6-ACA4-9D5C9C6C7B54/requestRouter_amd64.msi"
}
$arr = & "$env:windir\system32\inetsrv\appcmd.exe" list modules | Select-String 'ApplicationRequestRouting'
if (-not $arr -and (Get-Item $arrMsi -EA SilentlyContinue).Length -gt 500000) {
  Start-Process msiexec.exe -ArgumentList "/i `"$arrMsi`" /quiet /norestart" -Wait
}
& "$env:windir\system32\inetsrv\appcmd.exe" set config -section:system.webServer/proxy /enabled:"True" /commit:apphost 2>&1 | Out-Null
$mods = & "$env:windir\system32\inetsrv\appcmd.exe" list modules
if ($mods -notmatch 'RewriteModule') { iisreset /restart; Start-Sleep 8 }
& "$env:windir\system32\inetsrv\appcmd.exe" list modules | Select-String 'Rewrite|RequestRouter|Proxy'
""",
    ),
    (
        "webconfig",
        r"""
@'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="TicketzProxy" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:8080/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
'@ | Set-Content C:\inetpub\ticketz-homolog\web.config -Encoding UTF8
Write-Output 'web.config ok'
""",
    ),
    (
        "tasks-start",
        r"""
$Root='C:\ticketz'
schtasks /Delete /TN TicketzRedis /F 2>$null
schtasks /Delete /TN TicketzBackend /F 2>$null
schtasks /Create /TN TicketzRedis /TR "cmd /c C:\ticketz\start-redis.cmd" /SC ONSTART /RU SYSTEM /RL HIGHEST /F
schtasks /Create /TN TicketzBackend /TR "cmd /c C:\ticketz\start-backend.cmd" /SC ONSTART /RU SYSTEM /RL HIGHEST /F /DELAY 0000:30
Get-Process node -EA SilentlyContinue | Stop-Process -Force
Get-Process redis-server -EA SilentlyContinue | Stop-Process -Force
Start-Process "$Root\start-redis.cmd" -WindowStyle Hidden
Start-Sleep 3
Start-Process "$Root\start-backend.cmd" -WindowStyle Hidden
Start-Sleep 40
Get-Process node,redis-server -EA SilentlyContinue | Select Name,Id
""",
    ),
    (
        "tests",
        r"""
try { Write-Output "HEALTH8080=$((Invoke-WebRequest http://127.0.0.1:8080/health -UseBasicParsing -TimeoutSec 20).Content)" } catch { Write-Output "HEALTH8080=FAIL" }
try {
  $r = Invoke-WebRequest 'http://127.0.0.1/health' -Headers @{Host='api-homolog.fortmax.com.br'} -UseBasicParsing -TimeoutSec 15
  Write-Output "PROXY=$($r.StatusCode) $($r.Content)"
} catch { Write-Output "PROXY=FAIL $($_.Exception.Message)" }
Get-Website | Select Name,State
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
        err = (r.std_err or b"").decode("utf-8", errors="replace")
        print(out.strip())
        if err.strip():
            print("ERR:", err[:500])
        if r.status_code != 0:
            print(f"step {name} exit {r.status_code}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
