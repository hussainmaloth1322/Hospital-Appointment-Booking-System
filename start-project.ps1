Write-Host "Installing project dependencies..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
Write-Host "Starting Hospital Appointment Booking System..." -ForegroundColor Green
npm start
