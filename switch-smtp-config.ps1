# Quick script to switch SMTP configurations
# Usage: .\switch-smtp-config.ps1 1 (or 2, 3, 4)

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet(1,2,3,4)]
    [int]$Config
)

$envFile = ".env.local"

Write-Host "Switching to SMTP Config $Config..." -ForegroundColor Yellow

switch ($Config) {
    1 {
        # Config 1: 3iconic.co.ke with TLS (Port 587)
        Write-Host "Config 1: 3iconic.co.ke:587 (TLS)" -ForegroundColor Green
        (Get-Content $envFile) -replace 'SMTP_HOST=.*', 'SMTP_HOST=3iconic.co.ke' | 
        Set-Content $envFile
        (Get-Content $envFile) -replace 'SMTP_PORT=.*', 'SMTP_PORT=587' | 
        Set-Content $envFile
        (Get-Content $envFile) -replace 'SMTP_SECURE=.*', 'SMTP_SECURE=false' | 
        Set-Content $envFile
    }
    2 {
        # Config 2: mail.3iconic.co.ke with SSL (Port 465)
        Write-Host "Config 2: mail.3iconic.co.ke:465 (SSL)" -ForegroundColor Green
        (Get-Content $envFile) -replace 'SMTP_HOST=.*', 'SMTP_HOST=mail.3iconic.co.ke' | 
        Set-Content $envFile
        (Get-Content $envFile) -replace 'SMTP_PORT=.*', 'SMTP_PORT=465' | 
        Set-Content $envFile
        (Get-Content $envFile) -replace 'SMTP_SECURE=.*', 'SMTP_SECURE=true' | 
        Set-Content $envFile
    }
    3 {
        # Config 3: 3iconic.co.ke with SSL (Port 465)
        Write-Host "Config 3: 3iconic.co.ke:465 (SSL)" -ForegroundColor Green
        (Get-Content $envFile) -replace 'SMTP_HOST=.*', 'SMTP_HOST=3iconic.co.ke' | 
        Set-Content $envFile
        (Get-Content $envFile) -replace 'SMTP_PORT=.*', 'SMTP_PORT=465' | 
        Set-Content $envFile
        (Get-Content $envFile) -replace 'SMTP_SECURE=.*', 'SMTP_SECURE=true' | 
        Set-Content $envFile
    }
    4 {
        # Config 4: mail.3iconic.co.ke with TLS (Port 587) - Original
        Write-Host "Config 4: mail.3iconic.co.ke:587 (TLS) - Original" -ForegroundColor Green
        (Get-Content $envFile) -replace 'SMTP_HOST=.*', 'SMTP_HOST=mail.3iconic.co.ke' | 
        Set-Content $envFile
        (Get-Content $envFile) -replace 'SMTP_PORT=.*', 'SMTP_PORT=587' | 
        Set-Content $envFile
        (Get-Content $envFile) -replace 'SMTP_SECURE=.*', 'SMTP_SECURE=false' | 
        Set-Content $envFile
    }
}

Write-Host "`nUpdated .env.local. Current SMTP settings:" -ForegroundColor Cyan
Get-Content $envFile | Select-String "SMTP"

Write-Host "`n⚠️  IMPORTANT: Restart your development server for changes to take effect!" -ForegroundColor Red

