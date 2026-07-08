# Ticketz backend — deploy VPS Contabo (Windows Server 2022 + WSL2 + Docker)
# Não altera sites IIS existentes. Backend escuta porta 8080.

$ErrorActionPreference = "Stop"
$TicketzRoot = "C:\ticketz"
$WslDistro = "Ubuntu-22.04"
$LogFile = "C:\ticketz\deploy.log"

function Write-Log($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Add-Content -Path $LogFile -Value $line -ErrorAction SilentlyContinue
    Write-Output $line
}

New-Item -ItemType Directory -Force -Path $TicketzRoot | Out-Null

Write-Log "=== Ticketz VPS deploy iniciado ==="

# 1) WSL2 + Virtual Machine Platform
$wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
$vmFeature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform

if ($wslFeature.State -ne "Enabled") {
    Write-Log "Habilitando WSL..."
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart | Out-Null
}
if ($vmFeature.State -ne "Enabled") {
    Write-Log "Habilitando VirtualMachinePlatform..."
    Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart | Out-Null
}

$rebootRequired = (Get-WURebootStatus -ErrorAction SilentlyContinue) -or
    ((Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired" -ErrorAction SilentlyContinue) -ne $null)

if ($wslFeature.State -ne "Enabled" -or $vmFeature.State -ne "Enabled") {
    Write-Log "REBOOT_REQUIRED=1"
    exit 10
}

# 2) Ubuntu WSL
$wslList = wsl -l -v 2>$null
if ($wslList -notmatch "Ubuntu-22.04") {
    Write-Log "Instalando Ubuntu-22.04 WSL..."
    wsl --install -d Ubuntu-22.04 --no-launch
    Write-Log "REBOOT_REQUIRED=2"
    exit 10
}

# 3) Docker dentro do WSL
Write-Log "Configurando Docker no WSL..."
$dockerSetup = @'
set -e
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
fi
sudo service docker start || sudo dockerd >/dev/null 2>&1 &
sleep 3
docker --version
docker compose version
'@
wsl -d Ubuntu-22.04 -e bash -lc $dockerSetup

# 4) Firewall — porta 8080 (Cloudflare origin)
$ruleName = "Ticketz-Backend-8080"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    Write-Log "Abrindo firewall porta 8080..."
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080 | Out-Null
}

Write-Log "=== Infraestrutura pronta ==="
exit 0
