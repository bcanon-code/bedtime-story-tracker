#requires -Version 5.1
<#
.SYNOPSIS
Starts the local API and Expo Web app, then opens both in one Chrome window.
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [uri] $FrontendUrl = 'http://localhost:8081',

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [uri] $ApiHealthUrl = 'http://localhost:5076/health',

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [uri] $ScalarUrl = 'http://localhost:5076/scalar/v1',

    [Parameter()]
    [ValidateRange(1, 600)]
    [int] $StartupTimeoutSeconds = 120
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-RequiredCommandPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $Name
    )

    $command = Get-Command -Name $Name -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($null -eq $command) {
        throw "Required command '$Name' was not found on PATH."
    }

    return $command.Source
}

function Get-ChromePath {
    [CmdletBinding()]
    param()

    $chromeCommand = Get-Command -Name 'chrome.exe' -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($null -ne $chromeCommand) {
        return $chromeCommand.Source
    }

    $candidatePaths = @(
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe')
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe')
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    )

    foreach ($candidatePath in $candidatePaths) {
        if (Test-Path -LiteralPath $candidatePath -PathType Leaf) {
            return $candidatePath
        }
    }

    throw @'
Google Chrome could not be found. Install Chrome or add chrome.exe to PATH, then run this command again.
'@
}

function ConvertTo-EncodedPowerShellCommand {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $Command
    )

    return [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($Command))
}

function Wait-ForUrl {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $Name,

        [Parameter(Mandatory)]
        [uri] $Url,

        [Parameter(Mandatory)]
        [datetime] $Deadline,

        [Parameter(Mandatory)]
        [System.Diagnostics.Process] $Process
    )

    Write-Host "Waiting for $Name at $Url ..." -ForegroundColor Cyan

    while ((Get-Date) -lt $Deadline) {
        if ($Process.HasExited) {
            throw "$Name process exited before becoming available (exit code $($Process.ExitCode)). Review its PowerShell window for details."
        }

        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5

            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                Write-Host "$Name is available." -ForegroundColor Green
                return
            }
        }
        catch {
            $requestError = $_.Exception.ToString()

            if (
                $Url.Scheme -eq 'https' -and
                $requestError -match 'certificate|SSL|TLS|trust'
            ) {
                throw "HTTPS readiness check failed because the local development certificate is not trusted. Run 'dotnet dev-certs https --trust', then try again. URL: $Url"
            }
        }

        Start-Sleep -Seconds 1
    }

    throw "Timed out after $StartupTimeoutSeconds seconds waiting for $Name at $Url. Review its PowerShell window for startup errors."
}

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$apiProjectPath = Join-Path $repositoryRoot 'src\BedtimeStoryTracker.Api\BedtimeStoryTracker.Api.csproj'
$packageJsonPath = Join-Path $repositoryRoot 'package.json'

if (-not (Test-Path -LiteralPath $apiProjectPath -PathType Leaf)) {
    throw "API project was not found: $apiProjectPath"
}

if (-not (Test-Path -LiteralPath $packageJsonPath -PathType Leaf)) {
    throw "Frontend package.json was not found: $packageJsonPath"
}

$dotnetPath = Get-RequiredCommandPath -Name 'dotnet'
$npmPath = Get-RequiredCommandPath -Name 'npm'
$powerShellCommand = Get-Command -Name 'pwsh.exe' -ErrorAction SilentlyContinue |
    Select-Object -First 1

if ($null -eq $powerShellCommand) {
    $powerShellCommand = Get-Command -Name 'powershell.exe' -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

if ($null -eq $powerShellCommand) {
    throw 'Neither PowerShell 7 (pwsh.exe) nor Windows PowerShell (powershell.exe) was found.'
}

$chromePath = Get-ChromePath
$escapedRepositoryRoot = $repositoryRoot.Replace("'", "''")
$escapedApiProjectPath = $apiProjectPath.Replace("'", "''")
$escapedDotnetPath = $dotnetPath.Replace("'", "''")
$escapedNpmPath = $npmPath.Replace("'", "''")

$apiCommand = @"
`$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath '$escapedRepositoryRoot'
& '$escapedDotnetPath' run --project '$escapedApiProjectPath'
if (`$LASTEXITCODE -ne 0) { exit `$LASTEXITCODE }
"@

$frontendCommand = @"
`$ErrorActionPreference = 'Stop'
`$env:BROWSER = 'none'
Set-Location -LiteralPath '$escapedRepositoryRoot'
& '$escapedNpmPath' run web
if (`$LASTEXITCODE -ne 0) { exit `$LASTEXITCODE }
"@

Write-Host 'Starting the ASP.NET Core API in a separate PowerShell window...' -ForegroundColor Cyan
$apiProcess = Start-Process `
    -FilePath $powerShellCommand.Source `
    -ArgumentList @(
        '-NoLogo'
        '-NoProfile'
        '-EncodedCommand'
        (ConvertTo-EncodedPowerShellCommand -Command $apiCommand)
    ) `
    -PassThru

Write-Host 'Starting Expo Web in a separate PowerShell window...' -ForegroundColor Cyan
$frontendProcess = Start-Process `
    -FilePath $powerShellCommand.Source `
    -ArgumentList @(
        '-NoLogo'
        '-NoProfile'
        '-EncodedCommand'
        (ConvertTo-EncodedPowerShellCommand -Command $frontendCommand)
    ) `
    -PassThru

$deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)

Wait-ForUrl -Name 'API health endpoint' -Url $ApiHealthUrl -Deadline $deadline -Process $apiProcess
Wait-ForUrl -Name 'Expo Web frontend' -Url $FrontendUrl -Deadline $deadline -Process $frontendProcess

Write-Host 'Opening the frontend and Scalar in one new Chrome window...' -ForegroundColor Cyan
Start-Process `
    -FilePath $chromePath `
    -ArgumentList @(
        '--new-window'
        $FrontendUrl.AbsoluteUri
        $ScalarUrl.AbsoluteUri
    ) | Out-Null

Write-Host 'Local demo is ready.' -ForegroundColor Green
Write-Host 'Close each application window, or press Ctrl+C in it, to stop that application.'
