#requires -Version 5.1

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateSet('Development', 'Demo')]
    [string] $Environment = 'Development',

    [Parameter()]
    [switch] $Force,

    [Parameter()]
    [switch] $SkipSeedVerification
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-CheckedCommand {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $Description,

        [Parameter(Mandatory)]
        [scriptblock] $Command
    )

    Write-Host $Description -ForegroundColor Cyan
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE."
    }
}

function Test-TcpPortInUse {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [int] $Port
    )

    $listener = [System.Net.Sockets.TcpListener]::new(
        [System.Net.IPAddress]::Loopback,
        $Port)
    try {
        $listener.Start()
        return $false
    }
    catch [System.Net.Sockets.SocketException] {
        return $true
    }
    finally {
        $listener.Stop()
    }
}

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$apiProject = Join-Path $repositoryRoot 'src\BedtimeStoryTracker.Api\BedtimeStoryTracker.Api.csproj'
$environmentSettings = Join-Path $repositoryRoot "src\BedtimeStoryTracker.Api\appsettings.$Environment.json"
$contextName = 'ApplicationDbContext'
$expectedDatabase = if ($Environment -eq 'Development') {
    'BedtimeStoryTracker_Dev'
} else {
    'BedtimeStoryTracker_Demo'
}
$seedVerificationPort = 5077

if (-not (Test-Path -LiteralPath $apiProject -PathType Leaf)) {
    throw "API project was not found: $apiProject"
}
if (-not (Test-Path -LiteralPath $environmentSettings -PathType Leaf)) {
    throw "$Environment settings were not found: $environmentSettings"
}
if (-not (Get-Command -Name 'dotnet' -ErrorAction SilentlyContinue)) {
    throw "Required command 'dotnet' was not found on PATH."
}

$efVersionOutput = & dotnet ef --version 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "Required command 'dotnet ef' is unavailable. Install or restore the EF Core CLI tools, then try again."
}

$settings = Get-Content -Raw -LiteralPath $environmentSettings | ConvertFrom-Json
$connectionString = $settings.ConnectionStrings.ApplicationDatabase
if ([string]::IsNullOrWhiteSpace($connectionString)) {
    throw "Connection string 'ApplicationDatabase' was not found in $environmentSettings."
}

$connection = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$connection.set_ConnectionString($connectionString)
$databaseName = $connection.InitialCatalog
$serverName = $connection.DataSource

if ($databaseName -cne $expectedDatabase) {
    throw "Refusing to reset: the $Environment connection string must target exactly '$expectedDatabase', but targets '$databaseName'."
}
if ([string]::IsNullOrWhiteSpace($serverName)) {
    throw 'Refusing to reset: the Development connection string does not specify a SQL Server instance.'
}

Write-Host "Local $Environment database reset target:" -ForegroundColor Yellow
Write-Host "  Server:   $serverName"
Write-Host "  Database: $databaseName"
Write-Host "  Settings: $environmentSettings"

if (-not $Force) {
    $confirmation = Read-Host "Type $expectedDatabase to confirm that its data may be permanently deleted"
    if ($confirmation -cne $expectedDatabase) {
        throw 'Database reset cancelled. The confirmation did not exactly match the database name.'
    }
}

$previousAspNetCoreEnvironment = $env:ASPNETCORE_ENVIRONMENT
$previousDotNetEnvironment = $env:DOTNET_ENVIRONMENT
$previousConnectionString = $env:ConnectionStrings__ApplicationDatabase
$seedProcess = $null

try {
    $env:ASPNETCORE_ENVIRONMENT = $Environment
    $env:DOTNET_ENVIRONMENT = $Environment
    $env:ConnectionStrings__ApplicationDatabase = $connectionString

    Invoke-CheckedCommand -Description "Dropping only $expectedDatabase..." -Command {
        & dotnet ef database drop --force `
            --project $apiProject `
            --startup-project $apiProject `
            --context $contextName `
            --no-build
    }

    Invoke-CheckedCommand -Description 'Recreating the database from the current EF Core migrations...' -Command {
        & dotnet ef database update `
            --project $apiProject `
            --startup-project $apiProject `
            --context $contextName `
            --no-build
    }

    if ($SkipSeedVerification) {
        Write-Warning "Seed verification was skipped. Start the API in $Environment to run the existing demo-data seeder."
    }
    else {
        if (Test-TcpPortInUse -Port $seedVerificationPort) {
            throw "Seed verification port $seedVerificationPort is already in use. Stop the process using it, or rerun with -SkipSeedVerification and start the API manually."
        }

        $apiOutputDirectory = Join-Path (Split-Path -Parent $apiProject) 'bin\Debug\net10.0'
        $apiAssembly = Join-Path $apiOutputDirectory 'BedtimeStoryTracker.Api.dll'
        if (-not (Test-Path -LiteralPath $apiAssembly -PathType Leaf)) {
            throw "Built API assembly was not found: $apiAssembly"
        }

        Write-Host "Starting the API briefly to run and verify the existing $Environment seeder..." -ForegroundColor Cyan
        $seedProcess = Start-Process -FilePath 'dotnet' `
            -ArgumentList @($apiAssembly, '--urls', "http://127.0.0.1:$seedVerificationPort") `
            -WorkingDirectory $apiOutputDirectory `
            -WindowStyle Hidden `
            -PassThru

        $deadline = (Get-Date).AddSeconds(60)
        $children = $null
        $stories = $null
        while ((Get-Date) -lt $deadline) {
            if ($seedProcess.HasExited) {
                throw "The API exited during seed verification with exit code $($seedProcess.ExitCode)."
            }

            try {
                $children = Invoke-RestMethod -Uri "http://127.0.0.1:$seedVerificationPort/api/children" -TimeoutSec 5
                $stories = Invoke-RestMethod -Uri "http://127.0.0.1:$seedVerificationPort/api/stories" -TimeoutSec 5
                break
            }
            catch {
                Start-Sleep -Seconds 1
            }
        }

        if ($null -eq $children -or @($children).Count -eq 0) {
            throw 'Seed verification failed: GET /api/children returned no children.'
        }
        if ($null -eq $stories -or @($stories).Count -eq 0) {
            throw 'Seed verification failed: GET /api/stories returned no stories.'
        }

        Write-Host "Seed verification passed: $(@($children).Count) children and $(@($stories).Count) stories." -ForegroundColor Green
    }
}
catch {
    throw "Database reset failed for $expectedDatabase. If the drop reports active connections, stop the local API and any Docker API container using this database, then try again. $($_.Exception.Message)"
}
finally {
    if ($null -ne $seedProcess -and -not $seedProcess.HasExited) {
        Stop-Process -Id $seedProcess.Id -Force -ErrorAction SilentlyContinue
        $seedProcess.WaitForExit(5000) | Out-Null
    }

    $env:ASPNETCORE_ENVIRONMENT = $previousAspNetCoreEnvironment
    $env:DOTNET_ENVIRONMENT = $previousDotNetEnvironment
    $env:ConnectionStrings__ApplicationDatabase = $previousConnectionString
}

Write-Host 'Database reset completed successfully.' -ForegroundColor Green
Write-Host "Only $expectedDatabase on $serverName was dropped and recreated."
if ($Environment -eq 'Demo') {
    Write-Host 'Next: run .\scripts\Start-LocalDemo.ps1 for the normal demo workflow.'
}
else {
    Write-Host 'Next: run the API with the Development launch profile.'
}
