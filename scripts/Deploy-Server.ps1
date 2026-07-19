#requires -Version 5.1

[CmdletBinding()]
param(
    [Parameter()]
    [string] $EnvironmentFile = '.env.server',

    [Parameter()]
    [ValidateRange(30, 1800)]
    [int] $StartupTimeoutSeconds = 180,

    [Parameter()]
    [switch] $AllowDirtyWorkingTree
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Assert-Command {
    param([Parameter(Mandatory)][string] $Name)

    if (-not (Get-Command -Name $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found on PATH."
    }
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory)][string] $Command,
        [Parameter(Mandatory)][string[]] $Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE`: $Command $($Arguments -join ' ')"
    }
}

function Read-EnvironmentFile {
    param([Parameter(Mandatory)][string] $Path)

    $values = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }

        $separator = $trimmed.IndexOf('=')
        if ($separator -lt 1) {
            throw "Invalid environment line (expected NAME=value): $line"
        }

        $values[$trimmed.Substring(0, $separator).Trim()] =
            $trimmed.Substring($separator + 1).Trim()
    }

    return $values
}

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$composeFile = Join-Path $repositoryRoot 'compose.server.yml'
$portCheckScript = Join-Path $PSScriptRoot 'Test-DockerPortBlock.ps1'
$environmentPath = if ([IO.Path]::IsPathRooted($EnvironmentFile)) {
    $EnvironmentFile
} else {
    Join-Path $repositoryRoot $EnvironmentFile
}

Assert-Command -Name 'git'
Assert-Command -Name 'docker'

Push-Location $repositoryRoot
try {
    Invoke-NativeCommand -Command 'docker' -Arguments @('compose', 'version')

    $workingTree = (& git status --porcelain)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect the Git working tree.' }
    if ($workingTree -and -not $AllowDirtyWorkingTree) {
        throw 'The Git working tree is dirty. Commit/stash changes or rerun with -AllowDirtyWorkingTree.'
    }

    $gitSha = (& git rev-parse --short HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $gitSha) { throw 'Unable to determine the current Git SHA.' }

    if (-not (Test-Path -LiteralPath $environmentPath -PathType Leaf)) {
        throw "Environment file not found: $environmentPath. Copy .env.server.example and replace its placeholders."
    }

    $settings = Read-EnvironmentFile -Path $environmentPath
    $required = @(
        'SERVER_HOST',
        'SERVER_BIND_ADDRESS',
        'PORT_BLOCK_START',
        'FRONTEND_PORT',
        'API_PORT',
        'FRONTEND_ORIGIN',
        'EXPO_PUBLIC_API_BASE_URL',
        'ConnectionStrings__ApplicationDatabase'
    )
    foreach ($name in $required) {
        if (-not $settings.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($settings[$name])) {
            throw "Required environment value '$name' is missing."
        }
        if ($settings[$name] -match 'replace-with') {
            throw "Required environment value '$name' still contains a placeholder."
        }
    }

    foreach ($portName in @('PORT_BLOCK_START', 'FRONTEND_PORT', 'API_PORT')) {
        $port = 0
        if (-not [int]::TryParse($settings[$portName], [ref] $port) -or $port -lt 1 -or $port -gt 65535) {
            throw "'$portName' must be an integer from 1 through 65535."
        }
    }

    $blockStart = [int] $settings['PORT_BLOCK_START']
    $blockEnd = $blockStart + 9
    foreach ($portName in @('FRONTEND_PORT', 'API_PORT')) {
        $port = [int] $settings[$portName]
        if ($port -lt $blockStart -or $port -gt $blockEnd) {
            throw "'$portName' must be inside the reserved port block $blockStart-$blockEnd."
        }
    }

    $bindAddress = $null
    if (-not [ipaddress]::TryParse($settings['SERVER_BIND_ADDRESS'], [ref] $bindAddress)) {
        throw "'SERVER_BIND_ADDRESS' must be an explicit IPv4 or IPv6 address."
    }

    $configuredUris = @{}
    foreach ($urlName in @('FRONTEND_ORIGIN', 'EXPO_PUBLIC_API_BASE_URL')) {
        $uri = $null
        if (-not [uri]::TryCreate($settings[$urlName], [UriKind]::Absolute, [ref] $uri) -or $uri.Scheme -ne 'http') {
            throw "'$urlName' must be an absolute HTTP URL for this local testing deployment."
        }
        $configuredUris[$urlName] = $uri
    }

    $serverHost = $settings['SERVER_HOST']
    foreach ($urlName in $configuredUris.Keys) {
        if ($configuredUris[$urlName].Host -ne $serverHost) {
            throw "'$urlName' must use SERVER_HOST '$serverHost'."
        }
    }
    if ($configuredUris['FRONTEND_ORIGIN'].Port -ne [int] $settings['FRONTEND_PORT']) {
        throw "'FRONTEND_ORIGIN' must use FRONTEND_PORT $($settings['FRONTEND_PORT'])."
    }
    if ($configuredUris['EXPO_PUBLIC_API_BASE_URL'].Port -ne [int] $settings['API_PORT']) {
        throw "'EXPO_PUBLIC_API_BASE_URL' must use API_PORT $($settings['API_PORT'])."
    }
    if ([ipaddress]::IsLoopback($bindAddress) -and $serverHost -notin @('localhost', '127.0.0.1', '::1')) {
        throw "A loopback SERVER_BIND_ADDRESS requires SERVER_HOST=localhost, 127.0.0.1, or ::1. Use the trusted LAN IP as SERVER_BIND_ADDRESS for access from other machines."
    }

    Write-Host "Checking reserved host port block $blockStart-$blockEnd..." -ForegroundColor Cyan
    & $portCheckScript `
        -StartPort $blockStart `
        -BlockSize 10 `
        -ComposeProjectName 'bedtime-story-tracker'

    $env:DEPLOYMENT_VERSION = $gitSha
    $env:BUILD_DATE = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
    $composeArguments = @('compose', '--env-file', $environmentPath, '-f', $composeFile)

    Write-Host "Building deployment images for Git revision $gitSha..." -ForegroundColor Cyan
    Invoke-NativeCommand -Command 'docker' -Arguments ($composeArguments + @('build'))

    Write-Host 'Starting or recreating the server services...' -ForegroundColor Cyan
    Invoke-NativeCommand -Command 'docker' -Arguments ($composeArguments + @('up', '-d', '--force-recreate', '--no-build'))

    $deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
    $serviceNames = @('api', 'frontend')
    do {
        $allHealthy = $true
        foreach ($serviceName in $serviceNames) {
            $containerId = (& docker @($composeArguments + @('ps', '-q', $serviceName))).Trim()
            if ($LASTEXITCODE -ne 0 -or -not $containerId) {
                $allHealthy = $false
                continue
            }

            $health = (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $containerId).Trim()
            if ($LASTEXITCODE -ne 0) { throw "Unable to inspect the $serviceName container." }
            if ($health -eq 'unhealthy' -or $health -eq 'exited' -or $health -eq 'dead') {
                throw "The $serviceName container entered state '$health'. Review its logs."
            }
            if ($health -ne 'healthy') { $allHealthy = $false }
        }

        if (-not $allHealthy) { Start-Sleep -Seconds 2 }
    } while (-not $allHealthy -and (Get-Date) -lt $deadline)

    if (-not $allHealthy) {
        throw "Timed out after $StartupTimeoutSeconds seconds waiting for both services to become healthy."
    }

    $frontendUrl = $settings['FRONTEND_ORIGIN'].TrimEnd('/')
    $apiUrl = $settings['EXPO_PUBLIC_API_BASE_URL'].TrimEnd('/')

    Write-Host "Deployed Git SHA: $gitSha" -ForegroundColor Green
    Write-Host "Frontend: $frontendUrl"
    Write-Host "API: $apiUrl"
    Write-Host "Scalar (Development testing only): $apiUrl/scalar/v1"
    Invoke-NativeCommand -Command 'docker' -Arguments ($composeArguments + @('ps'))
}
finally {
    Pop-Location
}
