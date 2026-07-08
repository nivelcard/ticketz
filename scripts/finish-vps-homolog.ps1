# Finish Ticketz homolog — IIS proxy + services
$Root='C:\ticketz'
$ErrorActionPreference='Continue'

# URL Rewrite
$rewriteMsi="$Root\rewrite_amd64.msi"
if (-not (Test-Path $rewriteMsi) -or (Get-Item $rewriteMsi).Length -lt 5000000) {
  curl.exe -fL -o $rewriteMsi "https://download.microsoft.com/download/1/2/8/128E2E0C-1B16-4B94-99D3-AA7D8C6C8D51/rewrite_amd64_en-US.msi"
}
Write-Output "rewrite size=$((Get-Item $rewriteMsi -EA SilentlyContinue).Length)"
$rw = & "$env:windir\system32\inetsrv\appcmd.exe" list modules | Select-String 'RewriteModule'
if (-not $rw) {
  Start-Process msiexec.exe -ArgumentList "/i `"$rewriteMsi`" /quiet /norestart" -Wait
}

# ARR
$arrMsi="$Root\requestRouter_amd64.msi"
if (-not (Test-Path $arrMsi) -or (Get-Item $arrMsi -EA SilentlyContinue).Length -lt 500000) {
  curl.exe -fL -o $arrMsi "https://download.microsoft.com/download/E/9/8/E9849D89-A020-4FE6-ACA4-9D5C9C6C7B54/requestRouter_amd64.msi"
}
Write-Output "arr size=$((Get-Item $arrMsi -EA SilentlyContinue).Length)"
$arr = & "$env:windir\system32\inetsrv\appcmd.exe" list modules | Select-String 'ApplicationRequestRouting'
if (-not $arr -and (Get-Item $arrMsi -EA SilentlyContinue).Length -gt 500000) {
  Start-Process msiexec.exe -ArgumentList "/i `"$arrMsi`" /quiet /norestart" -Wait
}

& "$env:windir\system32\inetsrv\appcmd.exe" set config -section:system.webServer/proxy /enabled:"True" /commit:apphost 2>&1 | Out-Null

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

$mods = & "$env:windir\system32\inetsrv\appcmd.exe" list modules
if ($mods -notmatch 'RewriteModule') { iisreset /restart; Start-Sleep 8 }

Write-Output "=== MODULES ==="
& "$env:windir\system32\inetsrv\appcmd.exe" list modules | Select-String 'Rewrite|RequestRouter|Proxy'

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

Write-Output "=== PROCS ==="
Get-Process node,redis-server -EA SilentlyContinue | Select Name,Id

Write-Output "=== HEALTH 8080 ==="
try { Write-Output (Invoke-WebRequest http://127.0.0.1:8080/health -UseBasicParsing -TimeoutSec 20).Content } catch { Write-Output "FAIL $($_.Exception.Message)" }

Write-Output "=== PROXY IIS :80 ==="
try {
  $r = Invoke-WebRequest 'http://127.0.0.1/health' -Headers @{Host='api-homolog.fortmax.com.br'} -UseBasicParsing -TimeoutSec 15
  Write-Output "OK $($r.StatusCode) $($r.Content)"
} catch { Write-Output "FAIL $($_.Exception.Message)" }

Write-Output "=== IIS SITES ==="
Get-Website | Select Name,State
