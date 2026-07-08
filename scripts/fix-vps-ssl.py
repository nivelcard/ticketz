#!/usr/bin/env python3
"""Install self-signed SSL cert on IIS TicketzHomologApi (CF Full accepts it)."""

import os
import sys

import winrm

PASSWORD = os.environ.get("CONTABO_PASSWORD", "")
HOST = os.environ.get("CONTABO_HOST", "31.220.103.226")

PS = r"""
$ErrorActionPreference = 'Stop'
$hostname = 'api-homolog.fortmax.com.br'
$siteName = 'TicketzHomologApi'
$pfxPath = 'C:\ticketz\homolog-cert.pfx'
$pfxPass = 'TicketzHomolog2026!'

# Self-signed cert (Cloudflare Full mode accepts self-signed on origin)
$cert = New-SelfSignedCertificate -DnsName $hostname -CertStoreLocation 'Cert:\LocalMachine\My' -NotAfter (Get-Date).AddYears(2) -KeyExportPolicy Exportable
$pwd = ConvertTo-SecureString -String $pfxPass -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd | Out-Null

# Bind HTTPS on IIS site
Import-Module WebAdministration
$binding = Get-WebBinding -Name $siteName -Protocol 'https' -ErrorAction SilentlyContinue
if ($binding) {
  Remove-WebBinding -Name $siteName -Protocol 'https' -HostHeader $hostname -ErrorAction SilentlyContinue
}
New-WebBinding -Name $siteName -Protocol 'https' -Port 443 -HostHeader $hostname -SslFlags 1
$guid = $cert.Thumbprint
(Get-Item "IIS:\SslBindings\0.0.0.0!443!$hostname").Delete()
New-Item "IIS:\SslBindings\0.0.0.0!443!$hostname" -Value (Get-Item "Cert:\LocalMachine\My\$guid") | Out-Null

Write-Output "cert thumbprint=$guid"
Write-Output '=== HTTPS TEST ==='
try {
  [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
  $r = Invoke-WebRequest "https://127.0.0.1/health" -Headers @{Host=$hostname} -UseBasicParsing -TimeoutSec 15
  Write-Output "$($r.StatusCode) $($r.Content)"
} catch { Write-Output "FAIL $($_.Exception.Message)" }
"""


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
    r = s.run_ps(PS)
    print((r.std_out or b"").decode("utf-8", errors="replace"))
    return 0 if r.status_code == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
