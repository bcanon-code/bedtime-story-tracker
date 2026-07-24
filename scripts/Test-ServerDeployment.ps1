#requires -Version 5.1

[CmdletBinding()]
param(
    [string] $EnvironmentFile = '.env.server',
    [string] $ComposeFile = 'compose.server.yml',
    [switch] $AllowDirtyWorkingTree,
    [switch] $SkipSqlNetworkChecks
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:Results = [Collections.Generic.List[object]]::new()
function Add-Result([string] $Name, [string] $Status, [string] $Detail) {
    $script:Results.Add([pscustomobject]@{ Name = $Name; Status = $Status; Detail = $Detail })
    $color = if ($Status -eq 'PASS') { 'Green' } elseif ($Status -eq 'FAIL') { 'Red' } else { 'Yellow' }
    Write-Host ("{0}: {1} - {2}" -f $Name, $Status, $Detail) -ForegroundColor $color
}

function Read-Environment([string] $Path) {
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
        $separator = $trimmed.IndexOf('=')
        if ($separator -lt 1) { throw "Invalid environment line; expected NAME=value." }
        $values[$trimmed.Substring(0, $separator).Trim()] = $trimmed.Substring($separator + 1).Trim()
    }
    return $values
}

function Test-DockerSqlNetwork([string] $Image, [string] $HostName, [int] $Port) {
    $network = 'bedtime-story-tracker-server'
    $escapedHost = $HostName.Replace("'", "'\''")
    $command = "getent ahostsv4 '$escapedHost' >/dev/null || getent ahosts '$escapedHost' >/dev/null"
    & docker run --rm --network $network --entrypoint sh $Image -c $command 2>$null
    $dnsExit = $LASTEXITCODE
    if ($dnsExit -ne 0) {
        return [pscustomobject]@{ Dns = $false; Tcp = $false; Detail = 'DNS resolution failed from a disposable project-network container.' }
    }
    $command = "timeout 5 bash -c '</dev/tcp/$escapedHost/$Port'"
    & docker run --rm --network $network --entrypoint bash $Image -c $command 2>$null
    return [pscustomobject]@{
        Dns = $true
        Tcp = ($LASTEXITCODE -eq 0)
        Detail = if ($LASTEXITCODE -eq 0) { 'SQL host resolved and TCP connection succeeded from Docker.' } else { 'SQL host resolved, but its TCP port was unreachable from Docker.' }
    }
}

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$environmentPath = if ([IO.Path]::IsPathRooted($EnvironmentFile)) { $EnvironmentFile } else { Join-Path $root $EnvironmentFile }
$composePath = if ([IO.Path]::IsPathRooted($ComposeFile)) { $ComposeFile } else { Join-Path $root $ComposeFile }
$versionPath = Join-Path $root 'version.json'
$productionSettingsPath = Join-Path $root 'src\BedtimeStoryTracker.Api\appsettings.Production.json'
$developmentSettingsPaths = @(
    (Join-Path $root 'src\BedtimeStoryTracker.Api\appsettings.Development.json'),
    (Join-Path $root 'src\BedtimeStoryTracker.Api\appsettings.Demo.json')
)

Write-Host 'Bedtime Story Tracker server deployment preflight' -ForegroundColor Cyan
Write-Host 'No images, containers, databases, or permissions will be changed.'

foreach ($command in @('git', 'docker')) {
    if (Get-Command $command -ErrorAction SilentlyContinue) { Add-Result "$command command" PASS 'Available.' }
    else { Add-Result "$command command" FAIL 'Not found on PATH.' }
}
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Preflight failed: Docker is unavailable.' }

& docker info *> $null
if ($LASTEXITCODE -eq 0) { Add-Result 'Docker daemon' PASS 'Reachable.' } else { Add-Result 'Docker daemon' FAIL 'Not reachable.' }
& docker compose version *> $null
if ($LASTEXITCODE -eq 0) { Add-Result 'Compose v2' PASS 'Available.' } else { Add-Result 'Compose v2' FAIL 'docker compose is unavailable.' }

if (Test-Path -LiteralPath $environmentPath -PathType Leaf) { Add-Result 'Environment file' PASS 'Present.' }
else { Add-Result 'Environment file' FAIL 'Missing.'; throw "Preflight failed: $environmentPath was not found." }
if (Test-Path -LiteralPath $composePath -PathType Leaf) { Add-Result 'Compose file' PASS 'Present.' }
else { Add-Result 'Compose file' FAIL 'Missing.'; throw "Preflight failed: $composePath was not found." }

$settings = Read-Environment $environmentPath
$required = @(
    'SERVER_HOST', 'SERVER_BIND_ADDRESS', 'PORT_BLOCK_START', 'FRONTEND_PORT',
    'API_PORT', 'FRONTEND_ORIGIN', 'EXPO_PUBLIC_API_BASE_URL',
    'ConnectionStrings__ApplicationDatabase'
)
foreach ($name in $required) {
    $present = $settings.ContainsKey($name) -and -not [string]::IsNullOrWhiteSpace($settings[$name])
    $valid = $present -and $settings[$name] -notmatch '(?i)replace-with|<.+>'
    Add-Result "Environment $name" $(if ($valid) { 'PASS' } else { 'FAIL' }) $(if ($valid) { 'Present; safe format validation passed.' } else { 'Missing, empty, or placeholder.' })
}

$connectionString = if ($settings.ContainsKey('ConnectionStrings__ApplicationDatabase')) { $settings['ConnectionStrings__ApplicationDatabase'] } else { '' }
$builder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
try {
    $builder.set_ConnectionString($connectionString)
    Add-Result 'Connection string format' PASS 'Parsed in memory; value was not displayed.'
} catch {
    Add-Result 'Connection string format' FAIL 'Could not be parsed safely.'
}

$productionSettings = Get-Content -Raw -LiteralPath $productionSettingsPath | ConvertFrom-Json
$expectedProductionDatabase = [string] $productionSettings.DatabaseManagement.ExpectedDatabaseName
$knownNonProduction = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($path in $developmentSettingsPaths) {
    $data = Get-Content -Raw -LiteralPath $path | ConvertFrom-Json
    [void] $knownNonProduction.Add([string] $data.DatabaseManagement.ExpectedDatabaseName)
}
$database = $builder.InitialCatalog
$databaseIsSafe = -not [string]::IsNullOrWhiteSpace($database) -and
    -not $knownNonProduction.Contains($database) -and
    $database -ceq $expectedProductionDatabase -and
    $connectionString -notmatch '(?i)localdb|localhost|127\.0\.0\.1|trusted_connection\s*=\s*true|integrated security\s*=\s*(true|sspi)'
Add-Result 'Environment' $(if ($databaseIsSafe) { 'PASS' } else { 'FAIL' }) $(if ($databaseIsSafe) { 'Production target is valid.' } else { 'Configured database target is not valid for Production.' })
Add-Result 'Production database isolation' $(if ($databaseIsSafe) { 'PASS' } else { 'FAIL' }) ("Database: {0}; development/test collision: {1}." -f $(if ($database) { $database } else { '<empty>' }), $(if ($knownNonProduction.Contains($database)) { 'Yes' } else { 'No' }))

$version = $null
try {
    $version = Get-Content -Raw -LiteralPath $versionPath | ConvertFrom-Json
    $build = 0
    $validVersion = $version.version -match '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$' -and [int]::TryParse([string]$version.build, [ref]$build) -and $build -gt 0
    Add-Result 'version.json' $(if ($validVersion) { 'PASS' } else { 'FAIL' }) $(if ($validVersion) { "v$($version.version), build $($build.ToString('000'))." } else { 'Invalid version or build.' })
} catch { Add-Result 'version.json' FAIL 'Invalid JSON.' }

$gitSha = (& git rev-parse --short HEAD 2>$null).Trim()
Add-Result 'Git revision' $(if ($LASTEXITCODE -eq 0 -and $gitSha) { 'PASS' } else { 'FAIL' }) $(if ($gitSha) { $gitSha } else { 'Unavailable.' })
$dirty = @(& git status --porcelain 2>$null)
$gitClean = $AllowDirtyWorkingTree -or $dirty.Count -eq 0
Add-Result 'Working tree policy' $(if ($gitClean) { 'PASS' } else { 'FAIL' }) $(if ($dirty.Count -eq 0) { 'Clean.' } elseif ($AllowDirtyWorkingTree) { 'Dirty tree explicitly allowed for validation.' } else { 'Dirty; deployment requires a clean tree.' })

foreach ($name in @('PORT_BLOCK_START', 'FRONTEND_PORT', 'API_PORT')) {
    $port = 0
    $valid = $settings.ContainsKey($name) -and [int]::TryParse($settings[$name], [ref]$port) -and $port -ge 1 -and $port -le 65535
    Add-Result "$name format" $(if ($valid) { 'PASS' } else { 'FAIL' }) $(if ($valid) { 'Valid TCP port.' } else { 'Must be 1-65535.' })
}
if ($settings.ContainsKey('PORT_BLOCK_START')) {
    try {
        & (Join-Path $PSScriptRoot 'Test-DockerPortBlock.ps1') -StartPort ([int]$settings.PORT_BLOCK_START) -BlockSize 10 -ComposeProjectName 'bedtime-story-tracker'
        Add-Result 'Host ports' PASS 'Available or owned by existing project containers.'
    } catch { Add-Result 'Host ports' FAIL $_.Exception.Message }
}

$env:APP_VERSION = [string]$version.version
$env:BUILD_NUMBER = [string]$version.build
$env:GIT_SHA = $gitSha
$env:IMAGE_TAG = "$($version.version)-build.$(([int]$version.build).ToString('000'))-$gitSha".ToLowerInvariant()
$env:BUILD_DATE = 'preflight'
$env:OCI_SOURCE = 'preflight'
& docker compose --env-file $environmentPath -f $composePath config --quiet
Add-Result 'Compose variables' $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) 'Application image/build variables resolved.'

if (-not $SkipSqlNetworkChecks -and $builder.DataSource) {
    $server = $builder.DataSource
    $hostName = $server
    $sqlPort = 1433
    if ($server -match '^(?<host>[^,]+),(?<port>\d+)$') { $hostName = $Matches.host; $sqlPort = [int]$Matches.port }
    elseif ($server -match '\\') {
        Add-Result 'SQL DNS' 'NOT TESTED' 'Named instance requires SQL Browser or an explicit static port.'
        Add-Result 'SQL TCP' 'NOT TESTED' 'Add an explicit host,port target for deterministic Docker connectivity.'
        $hostName = $null
    }
    if ($hostName) {
        $apiImage = (& docker images 'bedtime-story-tracker-api' --format '{{.Repository}}:{{.Tag}}' | Select-Object -First 1)
        if ($apiImage) {
            $network = Test-DockerSqlNetwork $apiImage $hostName $sqlPort
            Add-Result 'SQL DNS' $(if ($network.Dns) { 'PASS' } else { 'FAIL' }) $(if ($network.Dns) { 'Resolved from Docker.' } else { $network.Detail })
            Add-Result 'SQL TCP' $(if ($network.Tcp) { 'PASS' } else { 'FAIL' }) $network.Detail
        } else {
            Add-Result 'SQL DNS' 'NOT TESTED' 'No existing API image is available for a disposable network probe.'
            Add-Result 'SQL TCP' 'NOT TESTED' 'No existing API image is available for a disposable network probe.'
        }
    }
}

Write-Host "`nPreflight summary" -ForegroundColor Cyan
$script:Results | Format-Table Name, Status, Detail -AutoSize
$failures = @($script:Results | Where-Object Status -eq 'FAIL')
if ($failures.Count -gt 0) {
    throw "Preflight failed with $($failures.Count) failed check(s). No build or deployment was started."
}
Write-Host 'Preflight passed. No state was changed.' -ForegroundColor Green
