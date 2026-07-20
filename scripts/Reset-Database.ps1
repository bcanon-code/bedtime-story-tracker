#requires -Version 5.1

[CmdletBinding()]
param(
    [Parameter()]
    [string] $EnvironmentFile = '.env.server',

    [Parameter()]
    [string] $SqlToolsImage = 'mcr.microsoft.com/mssql-tools:latest'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function ConvertTo-SqlIdentifier {
    param([Parameter(Mandatory)][string] $Value)
    return '[' + $Value.Replace(']', ']]') + ']'
}

function ConvertTo-SqlStringLiteral {
    param([Parameter(Mandatory)][string] $Value)
    return "N'" + $Value.Replace("'", "''") + "'"
}

function Get-EnvironmentValue {
    param(
        [Parameter(Mandatory)][string] $Path,
        [Parameter(Mandatory)][string] $Name
    )

    $line = Get-Content -LiteralPath $Path |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
        Select-Object -First 1
    if (-not $line) {
        throw "$Name was not found in $Path."
    }

    return $line.Substring($line.IndexOf('=') + 1).Trim()
}

function Invoke-DockerSql {
    param(
        [Parameter(Mandatory)][string] $Sql,
        [Parameter(Mandatory)][System.Data.SqlClient.SqlConnectionStringBuilder] $Connection,
        [Parameter(Mandatory)][string] $Database
    )

    $previousPassword = $env:SQLCMDPASSWORD
    try {
        $env:SQLCMDPASSWORD = $Connection.Password
        $Sql | & docker run --rm -i `
            -e SQLCMDPASSWORD `
            $SqlToolsImage `
            /opt/mssql-tools/bin/sqlcmd `
            -S $Connection.DataSource `
            -U $Connection.UserID `
            -C `
            -x `
            -b `
            -d $Database
        if ($LASTEXITCODE -ne 0) {
            throw "Containerized SQL command failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        $env:SQLCMDPASSWORD = $previousPassword
    }
}

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$apiProject = Join-Path $repositoryRoot 'src\BedtimeStoryTracker.Api\BedtimeStoryTracker.Api.csproj'
$environmentPath = if ([IO.Path]::IsPathRooted($EnvironmentFile)) {
    $EnvironmentFile
} else {
    Join-Path $repositoryRoot $EnvironmentFile
}

if (-not (Test-Path -LiteralPath $apiProject -PathType Leaf)) {
    throw "API project was not found: $apiProject"
}
if (-not (Test-Path -LiteralPath $environmentPath -PathType Leaf)) {
    throw "Environment file was not found: $environmentPath"
}
if (-not (Get-Command -Name 'docker' -ErrorAction SilentlyContinue)) {
    throw "Required command 'docker' was not found on PATH."
}

$applicationBuilder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$applicationBuilder.set_ConnectionString(
    (Get-EnvironmentValue -Path $environmentPath -Name 'ConnectionStrings__ApplicationDatabase'))
$adminBuilder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
$adminBuilder.set_ConnectionString(
    (Get-EnvironmentValue -Path $environmentPath -Name 'ResetDatabase__AdminConnectionString'))

$databaseName = $applicationBuilder.InitialCatalog
$applicationLogin = $applicationBuilder.UserID
$applicationPassword = $applicationBuilder.Password

if ($databaseName -ne 'BedtimeStoryTrackerDemo') {
    throw 'Refusing to reset: the secret connection string must target BedtimeStoryTrackerDemo.'
}
if ([string]::IsNullOrWhiteSpace($applicationLogin) -or
    [string]::IsNullOrWhiteSpace($applicationPassword)) {
    throw 'The secret connection string must contain User ID and Password values.'
}
if ([string]::IsNullOrWhiteSpace($applicationBuilder.DataSource)) {
    throw 'The environment connection string must contain Server or Data Source.'
}
if ([string]::IsNullOrWhiteSpace($adminBuilder.DataSource) -or
    [string]::IsNullOrWhiteSpace($adminBuilder.UserID) -or
    [string]::IsNullOrWhiteSpace($adminBuilder.Password)) {
    throw 'ResetDatabase__AdminConnectionString must contain Server, User ID, and Password.'
}

$databaseIdentifier = ConvertTo-SqlIdentifier -Value $databaseName
$databaseLiteral = ConvertTo-SqlStringLiteral -Value $databaseName
$loginIdentifier = ConvertTo-SqlIdentifier -Value $applicationLogin
$loginLiteral = ConvertTo-SqlStringLiteral -Value $applicationLogin
$passwordLiteral = ConvertTo-SqlStringLiteral -Value $applicationPassword

$resetSql = @"
USE [master];
IF DB_ID($databaseLiteral) IS NOT NULL
BEGIN
    ALTER DATABASE $databaseIdentifier SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE $databaseIdentifier;
END;

IF SUSER_ID($loginLiteral) IS NULL
    CREATE LOGIN $loginIdentifier WITH PASSWORD = $passwordLiteral;
ELSE
BEGIN
    ALTER LOGIN $loginIdentifier ENABLE;
    ALTER LOGIN $loginIdentifier WITH PASSWORD = $passwordLiteral;
END;

CREATE DATABASE $databaseIdentifier;
GO

USE $databaseIdentifier;
CREATE USER $loginIdentifier FOR LOGIN $loginIdentifier;
ALTER ROLE [db_owner] ADD MEMBER $loginIdentifier;
GRANT CONNECT TO $loginIdentifier;
GO
"@

Write-Host "Recreating only $databaseName on $($adminBuilder.DataSource)..." -ForegroundColor Cyan
Write-Host "Provisioning application login '$applicationLogin' from the ignored environment file..." -ForegroundColor Cyan
Invoke-DockerSql -Sql $resetSql -Connection $adminBuilder -Database 'master'

$migrationScript = [IO.Path]::GetTempFileName()
try {
    Write-Host 'Generating the idempotent EF Core migration script...' -ForegroundColor Cyan
    & dotnet ef migrations script `
        --idempotent `
        --output $migrationScript `
        --project $apiProject `
        --startup-project $apiProject
    if ($LASTEXITCODE -ne 0) {
        throw "Migration script generation failed with exit code $LASTEXITCODE."
    }

    Write-Host 'Applying EF Core migrations with the reset administrator...' -ForegroundColor Cyan
    Invoke-DockerSql `
        -Sql (Get-Content -Raw -LiteralPath $migrationScript) `
        -Connection $adminBuilder `
        -Database $databaseName
}
finally {
    Remove-Item -LiteralPath $migrationScript -Force -ErrorAction SilentlyContinue
}

Write-Host 'Database reset, login provisioning, and migrations completed.' -ForegroundColor Green
Write-Host 'Start the API to run development seed data.'
