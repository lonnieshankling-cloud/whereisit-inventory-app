# Restart Expo with Environment Variables
# Run this script after adding/updating .env.local

Write-Host "Stopping any running Expo processes..." -ForegroundColor Yellow
$expoProcesses = Get-Process | Where-Object { $_.ProcessName -like "*node*" -and $_.CommandLine -like "*expo*" }
if ($expoProcesses) {
    $expoProcesses | Stop-Process -Force
    Write-Host "Stopped Expo processes" -ForegroundColor Green
} else {
    Write-Host "No Expo processes found running" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

Write-Host "`nStarting Expo with cleared cache..." -ForegroundColor Yellow
Write-Host "This will load environment variables from .env.local" -ForegroundColor Cyan
Write-Host ""

npx expo start --clear
