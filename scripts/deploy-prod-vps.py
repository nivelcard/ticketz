#!/usr/bin/env python3
"""Deploy Ticketz production on Contabo VPS."""

import base64
import os
import sys

import winrm

PASSWORD = os.environ.get("CONTABO_PASSWORD", "")
HOST = os.environ.get("CONTABO_HOST", "31.220.103.226")

PROD_ENV = """FRONTEND_URL=https://suporte.fortmax.com.br
BACKEND_URL=https://api.fortmax.com.br
HOST=0.0.0.0
PORT=8080
NODE_ENV=production
TZ=America/Sao_Paulo
DB_DIALECT=postgres
DB_HOST=aws-1-sa-east-1.pooler.supabase.com
DB_PORT=5432
DB_USER=postgres.tcwtpkadwrsbdvehsmfy
DB_PASS=y$QXZram5@w2JKE
DB_NAME=postgres
DB_SCHEMA=ticketz
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false
DB_TIMEZONE=-03:00
DB_MAX_CONNECTIONS=3
DB_MIN_CONNECTIONS=0
DB_CONNECT_TIMEOUT=15000
DB_ACQUIRE=60000
REDIS_URI=redis://127.0.0.1:6379
REDIS_OPT_LIMITER_MAX=1
REDIS_OPT_LIMITER_DURATION=3000
USER_LIMIT=10000
CONNECTIONS_LIMIT=100000
CLOSED_SEND_BY_ME=true
VERIFY_TOKEN=ticketz
SOCKET_ADMIN=true
STORAGE_ROOT_PREFIX=suporte
AUTO_MIGRATE=true
JWT_SECRET=fortmax-ticketz-access-jwt-v1-7f3a9c2e8b1d4f6a0c5e9b2d7f1a4c8e
JWT_REFRESH_SECRET=fortmax-ticketz-refresh-jwt-v1-2b8d4f6a1c9e3b7d0f5a8c2e6b4d1f9a
JWT_ACCESS_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=30d
TURNSTILE_ENABLED=true
TURNSTILE_SITE_KEY=0x4AAAAAADhSILt9PsBiVeID
TURNSTILE_SECRET_KEY=0x4AAAAAADhSIMRIuil81syEGDWePGiCHeE
AI_QUEUE_CONCURRENCY=15
AI_QUEUE_DEBOUNCE_MS=0
AI_QUEUE_MAX_ATTEMPTS=3
AI_QUEUE_BACKOFF_MS=1500
AI_QUEUE_CONGESTION_THRESHOLD=100
AI_PROVIDER_TIMEOUT_MS=45000
AI_PROVIDER_MAX_RETRIES=1
WHATSAPP_START_TIMEOUT_MS=90000
WHATSAPP_DEFER_START_MS=2000
AI_REENGAGEMENT_ENABLED=true
AI_PROACTIVE_FOLLOWUP_ENABLED=true
AI_PROACTIVE_FOLLOWUP_MINUTES=5
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
"""

ENV_B64 = base64.b64encode(PROD_ENV.strip().encode()).decode()

STEPS = [
    (
        "env-iis",
        r"""
$Root='C:\ticketz'
$prodDir='C:\inetpub\ticketz-prod'
New-Item -ItemType Directory -Force -Path $prodDir | Out-Null
@'
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="TicketzProdProxy" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:8080/{R:1}" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
'@ | Set-Content "$prodDir\web.config" -Encoding UTF8

Import-Module WebAdministration
if (-not (Get-Website -Name 'TicketzProdApi' -EA SilentlyContinue)) {
  New-Website -Name 'TicketzProdApi' -PhysicalPath $prodDir -Port 80 -HostHeader 'api.fortmax.com.br' -Force | Out-Null
  New-WebBinding -Name 'TicketzProdApi' -Protocol 'https' -Port 443 -HostHeader 'api.fortmax.com.br' -SslFlags 1
} else {
  Write-Output 'TicketzProdApi exists'
}

# SSL self-signed para api.fortmax.com.br
$hostn='api.fortmax.com.br'
$cert = Get-ChildItem Cert:\LocalMachine\My | Where-Object { $_.DnsNameList.Unicode -contains $hostn } | Select-Object -First 1
if (-not $cert) {
  $cert = New-SelfSignedCertificate -DnsName $hostn -CertStoreLocation 'Cert:\LocalMachine\My' -NotAfter (Get-Date).AddYears(2)
}
$thumb = $cert.Thumbprint
& netsh http delete sslcert hostnameport=${hostn}:443 2>$null
& netsh http add sslcert hostnameport=${hostn}:443 certhash=$thumb appid='{22222222-2222-2222-2222-222222222222}' certstorename=MY
Write-Output "ssl thumb=$thumb"
""",
    ),
    (
        "disable-homolog",
        r"""
Stop-ScheduledTask -TaskName TicketzBackend -EA SilentlyContinue
schtasks /Change /TN TicketzBackend /DISABLE
Get-Process node -EA SilentlyContinue | Stop-Process -Force
Write-Output 'homolog backend disabled'
""",
    ),
    (
        "write-env",
        f"""
$b64 = '{ENV_B64}'
[IO.File]::WriteAllBytes('C:\\ticketz\\.env-backend-vps', [Convert]::FromBase64String($b64))
Copy-Item C:\\ticketz\\.env-backend-vps C:\\ticketz\\backend\\.env -Force
Write-Output 'env production written'
""",
    ),
    (
        "start-prod",
        r"""
schtasks /Change /TN TicketzBackend /ENABLE
Start-ScheduledTask -TaskName TicketzRedis -EA SilentlyContinue
Start-Sleep 3
Start-ScheduledTask -TaskName TicketzBackend
Start-Sleep 55
Get-Process node,redis-server -EA SilentlyContinue | Select Name,Id
netstat -ano | findstr ':8080'
try { Write-Output "H8080=$((Invoke-WebRequest http://127.0.0.1:8080/health -UseBasicParsing -TimeoutSec 30).Content)" } catch { Write-Output "H8080=FAIL" }
try {
  $r = Invoke-WebRequest 'http://127.0.0.1/health' -Headers @{Host='api.fortmax.com.br'} -UseBasicParsing -TimeoutSec 20
  Write-Output "PROD=$($r.StatusCode) $($r.Content)"
} catch { Write-Output "PROD=FAIL $($_.Exception.Message)" }
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
        out = (r.std_out or b"").decode("utf-8", errors="replace")
        print(out.strip())
        if r.status_code != 0:
            print(f"exit {r.status_code}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
