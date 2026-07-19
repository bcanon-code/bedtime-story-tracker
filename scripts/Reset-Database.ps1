#requires -Version 5.1

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$apiProject = Join-Path $repositoryRoot 'src\BedtimeStoryTracker.Api\BedtimeStoryTracker.Api.csproj'
$developmentSettings = Join-Path $repositoryRoot 'src\BedtimeStoryTracker.Api\appsettings.Development.json'

if (-not (Test-Path -LiteralPath $apiProject -PathType Leaf)) {
    throw "API project was not found: $apiProject"
}

$settings = Get-Content -Raw -LiteralPath $developmentSettings | ConvertFrom-Json
$connectionString = $settings.ConnectionStrings.ApplicationDatabase
if ($connectionString -notmatch '(?i)(^|;)\s*Database\s*=\s*BedtimeStoryTrackerDemo\s*(;|$)') {
    throw 'Refusing to reset: the development connection string does not target BedtimeStoryTrackerDemo.'
}

$env:ASPNETCORE_ENVIRONMENT = 'Development'

Write-Host 'Dropping only the configured BedtimeStoryTrackerDemo database...' -ForegroundColor Cyan
& dotnet ef database drop `
    --force `
    --project $apiProject `
    --startup-project $apiProject
if ($LASTEXITCODE -ne 0) {
    throw "Database drop failed with exit code $LASTEXITCODE."
}

Write-Host 'Recreating BedtimeStoryTrackerDemo from EF Core migrations...' -ForegroundColor Cyan
& dotnet ef database update `
    --project $apiProject `
    --startup-project $apiProject
if ($LASTEXITCODE -ne 0) {
    throw "Database update failed with exit code $LASTEXITCODE."
}

Write-Host 'Database reset completed. Start the API to run development seed data:' -ForegroundColor Green
Write-Host "dotnet run --project `"$apiProject`""
