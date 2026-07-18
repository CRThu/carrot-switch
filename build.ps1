# Carrot Switch - Build Script
# Usage:
#   .\build.ps1              # Build server exe only
#   .\build.ps1 -Desktop     # Build full desktop app (host + server + bundle)

param(
    [switch]$Desktop
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host "=== Carrot Switch Build ===" -ForegroundColor Cyan

# Step 1: Install dependencies
Write-Host "`n[1/3] Installing dependencies..." -ForegroundColor Yellow
bun install
if ($LASTEXITCODE -ne 0) { throw "Failed to install dependencies" }

# Step 2: Build frontend
Write-Host "`n[2/3] Building frontend..." -ForegroundColor Yellow
Push-Location (Join-Path $root "frontend")
bun run build
Pop-Location

# Step 3: Compile server exe
Write-Host "`n[3/3] Compiling to exe..." -ForegroundColor Yellow
Push-Location (Join-Path $root "server")
bun run build
Pop-Location

Write-Host "`n=== Build Complete ===" -ForegroundColor Green
Write-Host "Output: dist/carrot-switch.exe" -ForegroundColor Cyan

# Optional: Build desktop WebView2 host
if ($Desktop) {
    Write-Host "`n=== Building Desktop App ===" -ForegroundColor Cyan

    $publishDir = Join-Path $root "desktop\publish"
    $bundleDir = Join-Path $root "dist\carrot-switch-desktop"
    $csproj = Join-Path $root "desktop\CarrotSwitch\CarrotSwitch.csproj"

    # Build WPF host (single-file, self-contained, Chinese only)
    Write-Host "`nBuilding WPF WebView2 host..." -ForegroundColor Yellow
    dotnet publish $csproj -c Release -r win-x64 --self-contained `
        -p:PublishSingleFile=true `
        -p:IncludeNativeLibrariesForSelfExtract=true `
        -p:EnableCompressionInSingleFile=true `
        -o $publishDir

    if ($LASTEXITCODE -ne 0) { throw "Failed to build WPF host" }

    # Bundle
    Write-Host "`nBundling..." -ForegroundColor Yellow
    if (Test-Path $bundleDir) { Remove-Item $bundleDir -Recurse -Force }
    New-Item -ItemType Directory -Path $bundleDir -Force | Out-Null

    Copy-Item (Join-Path $publishDir "CarrotSwitch.exe") $bundleDir
    $nativeDir = Join-Path $publishDir "runtimes"
    if (Test-Path $nativeDir) {
        New-Item -ItemType Directory -Path (Join-Path $bundleDir "runtimes\win-x64\native") -Force | Out-Null
        Copy-Item (Join-Path $nativeDir "win-x64\native\*") (Join-Path $bundleDir "runtimes\win-x64\native")
    }
    Copy-Item (Join-Path $root "dist\carrot-switch.exe") $bundleDir

    Remove-Item $publishDir -Recurse -Force -ErrorAction SilentlyContinue

    $files = Get-ChildItem $bundleDir -Recurse -File
    $totalSize = [math]::Round(($files | Measure-Object -Property Length -Sum).Sum / 1MB, 1)

    Write-Host "`n=== Desktop Build Complete ===" -ForegroundColor Green
    Write-Host "Output: $bundleDir" -ForegroundColor Cyan
    Write-Host "Files: $($files.Count) | Size: $totalSize MB" -ForegroundColor White
}
