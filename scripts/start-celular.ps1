$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$ip = (
  Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object {
    $_.InterfaceAlias -notmatch "Loopback" -and
    $_.IPAddress -notlike "169.*" -and
    $_.IPAddress -notlike "127.*"
  } |
  Select-Object -First 1
).IPAddress

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  EcoScan AI — modo celular" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "1. PC e celular na MESMA Wi-Fi" -ForegroundColor Yellow
Write-Host "2. No celular, abra:" -ForegroundColor Yellow
if ($ip) {
  Write-Host "   https://${ip}:3001" -ForegroundColor Cyan
} else {
  Write-Host "   https://SEU-IP-DO-PC:3001" -ForegroundColor Cyan
}
Write-Host "3. Aceite o aviso de certificado (seguro, e local)" -ForegroundColor Yellow
Write-Host "4. Toque em ATIVAR CAMERA e permita acesso" -ForegroundColor Yellow
Write-Host ""

npm run dev:celular
