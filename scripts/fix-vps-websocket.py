#!/usr/bin/env python3
"""Fix IIS WebSocket proxy + restart WhatsApp session on VPS."""

import os
import sys

import winrm

PASSWORD = os.environ.get("CONTABO_PASSWORD", "")
HOST = os.environ.get("CONTABO_HOST", "31.220.103.226")

WEB_CONFIG = open(
    os.path.join(os.path.dirname(__file__), "iis-ticketz-prod-web.config")
).read()

STEPS = [
    (
        "iis-proxy",
        f"""
@'
{WEB_CONFIG.strip()}
'@ | Set-Content C:\\inetpub\\ticketz-prod\\web.config -Encoding UTF8

& "$env:windir\\system32\\inetsrv\\appcmd.exe" set config -section:system.webServer/proxy /preserveHostHeader:"True" /commit:apphost
& "$env:windir\\system32\\inetsrv\\appcmd.exe" unlock config -section:system.webServer/rewrite/allowedServerVariables
& "$env:windir\\system32\\inetsrv\\appcmd.exe" set config -section:system.webServer/rewrite/allowedServerVariables /+"[fullName='HTTP_X_FORWARDED_PROTO']" /commit:apphost
& "$env:windir\\system32\\inetsrv\\appcmd.exe" set config -section:system.webServer/rewrite/allowedServerVariables /+"[fullName='HTTP_X_FORWARDED_HOST']" /commit:apphost
Write-Output 'iis proxy updated'
""",
    ),
    (
        "restart-backend",
        r"""
Get-Process node -EA SilentlyContinue | Stop-Process -Force
Start-Sleep 3
Start-ScheduledTask -TaskName TicketzBackend
Start-Sleep 50
try { Write-Output (Invoke-WebRequest http://127.0.0.1:8080/health -UseBasicParsing -TimeoutSec 20).Content } catch { Write-Output 'health fail' }
Get-Content C:\ticketz\logs\backend.log -Tail 15 -EA SilentlyContinue | Select-String 'QR|WhatsApp|conflict|Session'
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
        operation_timeout_sec=120,
        read_timeout_sec=150,
    )
    for name, ps in STEPS:
        print(f"\n=== {name} ===")
        r = s.run_ps(ps)
        print((r.std_out or b"").decode("utf-8", errors="replace").strip())
    return 0


if __name__ == "__main__":
    sys.exit(main())
