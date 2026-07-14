# Carrot Switch - Build Script
# Usage: .\build.ps1

$ErrorActionPreference = "Stop"

Write-Host "=== Carrot Switch Build ===" -ForegroundColor Cyan

# Step 1: Install dependencies
Write-Host "`n[1/3] Installing dependencies..." -ForegroundColor Yellow
bun install
if ($LASTEXITCODE -ne 0) { throw "Failed to install dependencies" }

# Step 2: Build frontend (single HTML file with inlined JS/CSS)
Write-Host "`n[2/3] Building frontend..." -ForegroundColor Yellow
Set-Location frontend
bun run build
if ($LASTEXITCODE -ne 0) { throw "Failed to build frontend" }
Set-Location ..

# Step 3: Compile to exe (HTML auto-embedded via routes)
Write-Host "`n[3/3] Compiling to exe..." -ForegroundColor Yellow
Set-Location server
bun run build
if ($LASTEXITCODE -ne 0) { throw "Failed to compile exe" }
Set-Location ..

Write-Host "`n=== Build Complete ===" -ForegroundColor Green
Write-Host "Output: dist/carrot-switch.exe" -ForegroundColor Cyan
