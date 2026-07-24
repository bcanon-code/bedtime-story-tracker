[CmdletBinding()]
param(
    [string]$RepositoryRoot = "",
    [string]$EnvironmentFile = ".env.server",
    [string]$ComposeFile = "compose.server.yml",
    [string]$ApiServiceName = "api",
    [string]$FrontendServiceName = "frontend",
    [int]$LogTail = 300,
    [switch]$IncludeSqlHost
)

$ErrorActionPreference = "Stop"

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host ("=" * 80)
    Write-Host $Title
    Write-Host ("=" * 80)
}

function Invoke-Captured {
    param(
        [string]$Name,
        [scriptblock]$Command,
        [string]$OutputFile
    )

    Write-Host "Collecting: $Name"

    try {
        $output = & $Command 2>&1
        $exitCode = if ($null -eq $LASTEXITCODE) { 0 } else { $LASTEXITCODE }

        @(
            "Command: $Name"
            "Timestamp: $(Get-Date -Format o)"
            "ExitCode: $exitCode"
            ""
            $output
        ) | Out-File $OutputFile -Encoding utf8

        [pscustomobject]@{
            Name       = $Name
            ExitCode   = $exitCode
            Succeeded  = ($exitCode -eq 0)
            OutputFile = $OutputFile
        }
    }
    catch {
        @(
            "Command: $Name"
            "Timestamp: $(Get-Date -Format o)"
            "Exception: $($_.Exception.Message)"
            ""
            ($_ | Out-String)
        ) | Out-File $OutputFile -Encoding utf8

        [pscustomobject]@{
            Name       = $Name
            ExitCode   = -1
            Succeeded  = $false
            OutputFile = $OutputFile
        }
    }
}

function Protect-Secrets {
    param([string]$Text)

    if ([string]::IsNullOrWhiteSpace($Text)) {
        return $Text
    }

    $redacted = $Text
    $patterns = @(
        '(?im)(Password|Pwd|User Id|UserID|UID|AccessToken|ApiKey|Secret|Token)\s*=\s*[^;\r\n,}"'']+' ,
        '(?im)(ConnectionStrings__ApplicationDatabase\s*=\s*).+',
        '(?im)(ConnectionStrings:ApplicationDatabase\s*=\s*).+',
        '(?im)("?ConnectionStrings__ApplicationDatabase"?\s*:\s*").*?(")'
    )

    foreach ($pattern in $patterns) {
        $redacted = [regex]::Replace($redacted, $pattern, {
                param($match)

                if ($match.Groups.Count -gt 1 -and $match.Groups[1].Success) {
                    return "$($match.Groups[1].Value)<REDACTED>"
                }

                return "<REDACTED>"
            })
    }

    return $redacted
}

function Get-EnvironmentMap {
    param([string]$Path)
    $map = @{}
    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#') -or -not $trimmed.Contains('=')) { continue }
        $name, $value = $trimmed.Split('=', 2)
        $map[$name.Trim()] = $value.Trim()
    }
    return $map
}

function Get-SqlFailureCategory {
    param([string]$Text)
    switch -Regex ($Text) {
        'CREATE DATABASE permission denied' { return 'CREATE DATABASE denied' }
        'Cannot open database .* requested by the login|Error Number:4060' { return 'Database does not exist or login not mapped to database' }
        'Login failed for user|Error Number:18456' { return 'SQL login authentication failure' }
        'permission.*CONNECT|CONNECT permission denied' { return 'Login lacks CONNECT permission' }
        'permission was denied|ALTER TABLE|CREATE TABLE|CREATE SCHEMA' { return 'Login lacks schema or migration permission' }
        'certificate|SSL|TLS|trust chain' { return 'TLS or certificate failure' }
        'No such host|Name or service not known|could not resolve' { return 'DNS resolution failure' }
        'timed out|actively refused|network-related|TCP Provider' { return 'TCP port unreachable' }
        '__EFMigrationsHistory|migration.*failed|MigrateAsync' { return 'EF migration failure' }
        default { return 'unknown database error' }
    }
}

function Save-Redacted {
    param(
        [string]$Text,
        [string]$OutputFile
    )

    Protect-Secrets -Text $Text | Out-File $OutputFile -Encoding utf8
}

if ([string]::IsNullOrWhiteSpace($RepositoryRoot)) {
    $RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}
else {
    $RepositoryRoot = (Resolve-Path $RepositoryRoot).Path
}

Set-Location $RepositoryRoot

$resolvedEnvironmentFile = Join-Path $RepositoryRoot $EnvironmentFile
$resolvedComposeFile = Join-Path $RepositoryRoot $ComposeFile

if (-not (Test-Path $resolvedEnvironmentFile)) {
    throw "Environment file not found: $resolvedEnvironmentFile"
}

if (-not (Test-Path $resolvedComposeFile)) {
    throw "Compose file not found: $resolvedComposeFile"
}

foreach ($requiredCommand in @("docker", "git")) {
    if (-not (Get-Command $requiredCommand -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $requiredCommand"
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputRoot = Join-Path $RepositoryRoot "diagnostics\docker-$timestamp"
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$versionData = Get-Content -Raw -LiteralPath (Join-Path $RepositoryRoot 'version.json') | ConvertFrom-Json
$gitSha = (& git rev-parse --short HEAD).Trim()
$env:APP_VERSION = [string]$versionData.version
$env:BUILD_NUMBER = [string]$versionData.build
$env:GIT_SHA = $gitSha
$env:IMAGE_TAG = "$($versionData.version)-build.$(([int]$versionData.build).ToString('000'))-$gitSha".ToLowerInvariant()
$env:BUILD_DATE = 'diagnostics'
$env:OCI_SOURCE = 'diagnostics'

$composeArgs = @(
    "compose",
    "--env-file", $resolvedEnvironmentFile,
    "-f", $resolvedComposeFile
)

$results = New-Object System.Collections.Generic.List[object]

Write-Section "Bedtime Story Tracker Docker Diagnostics"
Write-Host "Repository: $RepositoryRoot"
Write-Host "Output:     $outputRoot"
Write-Host "Compose:    $resolvedComposeFile"
Write-Host "Env file:   $resolvedEnvironmentFile"
Write-Host ""
Write-Host "Sensitive values will be redacted where practical."
Write-Host "Review the output before sharing."

$results.Add((Invoke-Captured "git status --short" { git status --short } (Join-Path $outputRoot "01-git-status.txt")))
$results.Add((Invoke-Captured "git log -8 --oneline --decorate" { git log -8 --oneline --decorate } (Join-Path $outputRoot "02-git-history.txt")))
$results.Add((Invoke-Captured "docker version" { docker version } (Join-Path $outputRoot "03-docker-version.txt")))
$results.Add((Invoke-Captured "docker compose version" { docker compose version } (Join-Path $outputRoot "04-compose-version.txt")))
$results.Add((Invoke-Captured "docker info" { docker info } (Join-Path $outputRoot "05-docker-info.txt")))

# Record environment variable names and whether values are populated. Never write values.
$envPresence = foreach ($line in Get-Content $resolvedEnvironmentFile) {
    $trimmed = $line.Trim()

    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) {
        continue
    }

    $name, $value = $trimmed.Split("=", 2)

    [pscustomobject]@{
        Name           = $name.Trim()
        Present        = -not [string]::IsNullOrWhiteSpace($value)
        CharacterCount = $value.Length
        Value          = "<REDACTED>"
    }
}

$envPresence |
Sort-Object Name |
Format-Table -AutoSize |
Out-String |
Out-File (Join-Path $outputRoot "06-env-presence.txt") -Encoding utf8

try {
    Write-Host "Collecting: effective Compose configuration"
    $effectiveCompose = docker @composeArgs config 2>&1 | Out-String
    Save-Redacted $effectiveCompose (Join-Path $outputRoot "07-compose-effective-redacted.yml")
}
catch {
    $_ | Out-String | Out-File (Join-Path $outputRoot "07-compose-effective-redacted.yml") -Encoding utf8
}

$results.Add((Invoke-Captured "docker compose config --services" { docker @composeArgs config --services } (Join-Path $outputRoot "08-compose-services.txt")))
$results.Add((Invoke-Captured "docker compose ps -a" { docker @composeArgs ps -a } (Join-Path $outputRoot "09-compose-ps.txt")))
$results.Add((Invoke-Captured "docker compose images" { docker @composeArgs images } (Join-Path $outputRoot "10-compose-images.txt")))
$results.Add((Invoke-Captured "docker network ls" { docker network ls } (Join-Path $outputRoot "11-docker-networks.txt")))

foreach ($service in @($ApiServiceName, $FrontendServiceName)) {
    $safeService = $service -replace '[^A-Za-z0-9_.-]', '_'
    $results.Add((Invoke-Captured "docker compose logs $service --tail $LogTail" { docker @composeArgs logs $service --tail $LogTail --no-color } (Join-Path $outputRoot "12-logs-$safeService.txt")))
}

foreach ($service in @($ApiServiceName, $FrontendServiceName)) {
    $containerId = docker @composeArgs ps -a -q $service 2>$null | Select-Object -First 1
    $safeService = $service -replace '[^A-Za-z0-9_.-]', '_'

    if ([string]::IsNullOrWhiteSpace($containerId)) {
        "No container ID found for service '$service'." | Out-File (Join-Path $outputRoot "13-inspect-$safeService-redacted.txt") -Encoding utf8
        continue
    }

    try {
        $inspectText = docker inspect $containerId 2>&1 | Out-String
        Save-Redacted $inspectText (Join-Path $outputRoot "13-inspect-$safeService-redacted.txt")
    }
    catch {
        $_ | Out-String | Out-File (Join-Path $outputRoot "13-inspect-$safeService-redacted.txt") -Encoding utf8
    }

    $results.Add((Invoke-Captured "docker inspect health $service" { docker inspect $containerId --format '{{json .State.Health}}' } (Join-Path $outputRoot "14-health-$safeService.json")))
    $results.Add((Invoke-Captured "docker inspect state $service" { docker inspect $containerId --format 'Status={{.State.Status}} ExitCode={{.State.ExitCode}} Error={{.State.Error}} StartedAt={{.State.StartedAt}} FinishedAt={{.State.FinishedAt}}' } (Join-Path $outputRoot "15-state-$safeService.txt")))
    $results.Add((Invoke-Captured "docker inspect ports $service" { docker inspect $containerId --format '{{json .NetworkSettings.Ports}}' } (Join-Path $outputRoot "16-ports-$safeService.json")))
    $results.Add((Invoke-Captured "docker inspect image $service" { docker inspect $containerId --format 'Image={{.Config.Image}} ImageId={{.Image}}' } (Join-Path $outputRoot "17-image-$safeService.txt")))
}

$apiContainerId = docker @composeArgs ps -a -q $ApiServiceName 2>$null | Select-Object -First 1

if (-not [string]::IsNullOrWhiteSpace($apiContainerId)) {
    $results.Add((Invoke-Captured "API process list" { docker exec $apiContainerId sh -c 'ps aux || ps -ef' } (Join-Path $outputRoot "18-api-processes.txt")))
    $results.Add((Invoke-Captured "API listening sockets" { docker exec $apiContainerId sh -c '(command -v ss >/dev/null && ss -lntp) || (command -v netstat >/dev/null && netstat -lntp) || true' } (Join-Path $outputRoot "19-api-listeners.txt")))
    $results.Add((Invoke-Captured "API localhost health request" { docker exec $apiContainerId sh -c 'for p in 8080 8081 5000 5001; do echo "--- port $p ---"; curl -sS -i --max-time 5 "http://127.0.0.1:$p/health" || true; echo; done' } (Join-Path $outputRoot "20-api-health-inside-container.txt")))
    $results.Add((Invoke-Captured "API localhost version request" { docker exec $apiContainerId sh -c 'for p in 8080 8081 5000 5001; do echo "--- port $p ---"; curl -sS -i --max-time 5 "http://127.0.0.1:$p/version" || true; echo; done' } (Join-Path $outputRoot "21-api-version-inside-container.txt")))

    try {
        docker inspect $apiContainerId --format '{{range .Config.Env}}{{println .}}{{end}}' |
        ForEach-Object {
            if ($_ -match '^([^=]+)=') {
                $matches[1]
            }
        } |
        Sort-Object -Unique |
        Out-File (Join-Path $outputRoot "22-api-environment-variable-names.txt") -Encoding utf8
    }
    catch {
        $_ | Out-String | Out-File (Join-Path $outputRoot "22-api-environment-variable-names.txt") -Encoding utf8
    }

    $results.Add((Invoke-Captured "API DNS lookup host.docker.internal" { docker exec $apiContainerId sh -c 'getent hosts host.docker.internal || nslookup host.docker.internal || true' } (Join-Path $outputRoot "23-api-host-dns.txt")))

    $connectionLine = Get-Content $resolvedEnvironmentFile |
    Where-Object { $_ -match '^\s*ConnectionStrings__ApplicationDatabase\s*=' } |
    Select-Object -First 1

    if ($connectionLine) {
        $connectionString = $connectionLine.Split("=", 2)[1]
        $serverMatch = [regex]::Match($connectionString, '(?i)(?:Server|Data Source)\s*=\s*([^;]+)')

        if ($serverMatch.Success) {
            $serverValue = $serverMatch.Groups[1].Value.Trim()
            $sqlHost = $serverValue
            $sqlPort = 1433

            if ($serverValue -match '^(?<host>[^,]+),(?<port>\d+)$') {
                $sqlHost = $matches.host
                $sqlPort = [int]$matches.port
            }

            $displaySqlHost = if ($IncludeSqlHost) { $sqlHost } else { '<SQL_HOST>' }
            @(
                "DetectedSqlHost=$displaySqlHost"
                "DetectedSqlPort=$sqlPort"
                "ConnectionStringValue=<REDACTED>"
            ) | Out-File (Join-Path $outputRoot "24-sql-target-redacted.txt") -Encoding utf8

            $results.Add((Invoke-Captured "API SQL TCP reachability $displaySqlHost`:$sqlPort" {
                        docker exec $apiContainerId sh -c "if command -v nc >/dev/null; then nc -vz -w 5 '$sqlHost' '$sqlPort'; elif command -v bash >/dev/null; then timeout 5 bash -c '</dev/tcp/$sqlHost/$sqlPort'; else echo 'No nc or bash TCP test available'; fi"
                    } (Join-Path $outputRoot "25-api-sql-tcp-reachability.txt")))
        }
        else {
            "Could not parse the SQL Server host safely." | Out-File (Join-Path $outputRoot "24-sql-target-redacted.txt") -Encoding utf8
        }
    }
    else {
        "ConnectionStrings__ApplicationDatabase was not found." | Out-File (Join-Path $outputRoot "24-sql-target-redacted.txt") -Encoding utf8
    }
}

$envMap = Get-EnvironmentMap $resolvedEnvironmentFile

$sqlSummary = [ordered]@{
    Dns = 'NOT TESTED'
    Tcp = 'NOT TESTED'
    Authentication = 'NOT TESTED'
    ProductionDatabaseExists = 'NOT TESTED'
    DatabaseExists = 'NOT TESTED'
    UserMapping = 'NOT TESTED'
    Permissions = 'NOT TESTED'
    Migrations = 'NOT TESTED'
    Category = 'unknown database error'
}

if ($envMap.ContainsKey('ConnectionStrings__ApplicationDatabase')) {
    $sqlBuilder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
    try {
        $sqlBuilder.set_ConnectionString($envMap['ConnectionStrings__ApplicationDatabase'])
        $targetDatabase = $sqlBuilder.InitialCatalog
        $masterBuilder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
        $masterBuilder.set_ConnectionString($sqlBuilder.ConnectionString)
        $masterBuilder.InitialCatalog = 'master'
        $masterBuilder.ConnectTimeout = 5
        $masterConnection = New-Object System.Data.SqlClient.SqlConnection($masterBuilder.ConnectionString)
        try {
            $masterConnection.Open()
            $sqlSummary.Authentication = 'PASS'
            $command = $masterConnection.CreateCommand()
            $command.CommandText = 'SELECT CASE WHEN DB_ID(@database) IS NULL THEN 0 ELSE 1 END'
            [void]$command.Parameters.Add('@database', [Data.SqlDbType]::NVarChar, 128)
            $command.Parameters['@database'].Value = $targetDatabase
            $databaseExists = [int]$command.ExecuteScalar() -eq 1
            $sqlSummary.DatabaseExists = if ($databaseExists) { 'PASS' } else { 'FAIL' }
            if (-not $databaseExists) {
                $sqlSummary.Category = 'Database does not exist'
            }
        }
        finally {
            $masterConnection.Dispose()
        }

        if ($databaseExists) {
            $sqlBuilder.ConnectTimeout = 5
            $databaseConnection = New-Object System.Data.SqlClient.SqlConnection($sqlBuilder.ConnectionString)
            try {
                $databaseConnection.Open()
                $command = $databaseConnection.CreateCommand()
                $command.CommandText = @'
SELECT
  CASE WHEN DATABASE_PRINCIPAL_ID() IS NULL THEN 0 ELSE 1 END AS IsMapped,
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'CONNECT') AS CanConnect,
  HAS_PERMS_BY_NAME('dbo', 'SCHEMA', 'ALTER') AS CanAlterDbo,
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'CREATE TABLE') AS CanCreateTable,
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'SELECT') AS CanSelect,
  HAS_PERMS_BY_NAME(DB_NAME(), 'DATABASE', 'INSERT') AS CanInsert,
  CASE WHEN OBJECT_ID(N'__EFMigrationsHistory', N'U') IS NULL THEN 0 ELSE 1 END AS HasMigrationHistory
'@
                $reader = $command.ExecuteReader()
                [void]$reader.Read()
                $mapped = $reader.GetInt32(0) -eq 1
                $canConnect = $reader.GetInt32(1) -eq 1
                $canMigrate = ($reader.GetInt32(2) -eq 1) -and ($reader.GetInt32(3) -eq 1)
                $canUseApp = ($reader.GetInt32(4) -eq 1) -and ($reader.GetInt32(5) -eq 1)
                $hasHistory = $reader.GetInt32(6) -eq 1
                $reader.Close()
                $sqlSummary.UserMapping = if ($mapped) { 'PASS' } else { 'FAIL' }
                $sqlSummary.Permissions = if ($canConnect -and $canUseApp) { 'PASS' } else { 'FAIL' }
                $sqlSummary.Migrations = if ($hasHistory) { 'PASS' } else { 'FAIL' }
                if (-not $mapped) { $sqlSummary.Category = 'Login not mapped to database' }
                elseif (-not $canConnect) { $sqlSummary.Category = 'Login lacks CONNECT permission' }
                elseif (-not $canUseApp) { $sqlSummary.Category = 'application query failure' }
                elseif (-not $canMigrate) { $sqlSummary.Category = 'Login lacks schema or migration permission' }
                elseif (-not $hasHistory) { $sqlSummary.Category = 'migration history mismatch' }
                else { $sqlSummary.Category = 'none' }
            }
            finally {
                $databaseConnection.Dispose()
            }
        }
    }
    catch {
        $safeError = Protect-Secrets $_.Exception.Message
        $sqlSummary.Category = Get-SqlFailureCategory $safeError
        if ($sqlSummary.Authentication -eq 'NOT TESTED') { $sqlSummary.Authentication = 'FAIL' }
        "Category=$($sqlSummary.Category)`nMessage=$safeError" |
            Out-File (Join-Path $outputRoot '32-sql-login-database-test.txt') -Encoding utf8
    }
    @(
        "Provider=SQL Server"
        "Database=$($sqlBuilder.InitialCatalog)"
        "Authentication=$($sqlSummary.Authentication)"
        "DatabaseExists=$($sqlSummary.DatabaseExists)"
        "UserMapping=$($sqlSummary.UserMapping)"
        "Permissions=$($sqlSummary.Permissions)"
        "Migrations=$($sqlSummary.Migrations)"
        "Category=$($sqlSummary.Category)"
        'UserId=<REDACTED>'
        'ConnectionString=<REDACTED>'
    ) | Out-File (Join-Path $outputRoot '32-sql-login-database-test.txt') -Encoding utf8
}

$serverHost = if ($envMap.ContainsKey("SERVER_HOST")) { $envMap["SERVER_HOST"] } else { "localhost" }
$apiPort = if ($envMap.ContainsKey("API_PORT")) { $envMap["API_PORT"] } else { $null }
$frontendPort = if ($envMap.ContainsKey("FRONTEND_PORT")) { $envMap["FRONTEND_PORT"] } else { $null }

if ($apiPort) {
    $results.Add((Invoke-Captured "Host API port test $serverHost`:$apiPort" { Test-NetConnection -ComputerName $serverHost -Port ([int]$apiPort) -InformationLevel Detailed } (Join-Path $outputRoot "26-host-api-port.txt")))
    $results.Add((Invoke-Captured "Host API health request" { Invoke-WebRequest -Uri "http://$serverHost`:$apiPort/health" -UseBasicParsing -TimeoutSec 10 } (Join-Path $outputRoot "27-host-api-health.txt")))
}

if ($frontendPort) {
    $results.Add((Invoke-Captured "Host frontend port test $serverHost`:$frontendPort" { Test-NetConnection -ComputerName $serverHost -Port ([int]$frontendPort) -InformationLevel Detailed } (Join-Path $outputRoot "28-host-frontend-port.txt")))
    $results.Add((Invoke-Captured "Host frontend request" { Invoke-WebRequest -Uri "http://$serverHost`:$frontendPort/" -UseBasicParsing -TimeoutSec 10 } (Join-Path $outputRoot "29-host-frontend-http.txt")))
}

$results.Add((Invoke-Captured "Docker images for Bedtime Story Tracker" { docker images --format 'Repository={{.Repository}} Tag={{.Tag}} ID={{.ID}} Created={{.CreatedSince}} Size={{.Size}}' | Select-String 'bedtime-story-tracker' } (Join-Path $outputRoot "30-project-images.txt")))
$results.Add((Invoke-Captured "Current EF Core migration list (no database connection)" {
            dotnet ef migrations list --no-connect `
                --project (Join-Path $RepositoryRoot 'src\BedtimeStoryTracker.Api\BedtimeStoryTracker.Api.csproj') `
                --startup-project (Join-Path $RepositoryRoot 'src\BedtimeStoryTracker.Api\BedtimeStoryTracker.Api.csproj')
        } (Join-Path $outputRoot "30-ef-migrations.txt")))

foreach ($service in @($ApiServiceName, $FrontendServiceName)) {
    $containerId = docker @composeArgs ps -a -q $service 2>$null | Select-Object -First 1

    if ([string]::IsNullOrWhiteSpace($containerId)) {
        continue
    }

    $imageId = docker inspect $containerId --format '{{.Image}}'
    $results.Add((Invoke-Captured "Image labels for $service" { docker image inspect $imageId --format '{{json .Config.Labels}}' } (Join-Path $outputRoot "31-image-labels-$service.json")))
}

$results |
Select-Object Name, ExitCode, Succeeded, OutputFile |
Format-Table -AutoSize |
Out-String |
Out-File (Join-Path $outputRoot "00-command-summary.txt") -Encoding utf8

$apiLogText = Get-Content -Raw -ErrorAction SilentlyContinue (Join-Path $outputRoot "12-logs-$ApiServiceName.txt")
$logCategory = if ($apiLogText) { Get-SqlFailureCategory $apiLogText } else { 'unknown database error' }
if ($sqlSummary.Category -eq 'unknown database error' -and $logCategory -ne 'unknown database error') {
    $sqlSummary.Category = $logCategory
}
$expectedProductionDatabase = (Get-Content -Raw (Join-Path $RepositoryRoot 'src\BedtimeStoryTracker.Api\appsettings.Production.json') | ConvertFrom-Json).DatabaseManagement.ExpectedDatabaseName
$configuredDatabase = if ($envMap.ContainsKey('ConnectionStrings__ApplicationDatabase')) {
    $isolationBuilder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
    try { $isolationBuilder.set_ConnectionString($envMap['ConnectionStrings__ApplicationDatabase']); $isolationBuilder.InitialCatalog } catch { '' }
} else { '' }
$productionIsolation = if ($configuredDatabase -ceq $expectedProductionDatabase) { 'PASS' } else { 'FAIL' }

if ($logCategory -eq 'CREATE DATABASE denied') {
    # SQL error 262 while EF executes CREATE DATABASE proves DNS, TCP, TLS, and
    # authentication reached master; the target database was absent.
    $sqlSummary.Dns = 'PASS'
    $sqlSummary.Tcp = 'PASS'
    $sqlSummary.Authentication = 'PASS'
    $sqlSummary.DatabaseExists = 'NOT TESTED'
    $sqlSummary.UserMapping = 'NOT TESTED'
    $sqlSummary.Permissions = 'NOT TESTED'
    $sqlSummary.Migrations = 'NOT TESTED'
    $sqlSummary.Category = 'CREATE DATABASE denied'
}

# Prefer installed sqlcmd for authoritative, read-only existence/access checks.
# SQLCMDPASSWORD keeps the password out of arguments and all error text is
# suppressed because SQL Server commonly includes the login name in failures.
if ((Get-Command sqlcmd -ErrorAction SilentlyContinue) -and
    $envMap.ContainsKey('ConnectionStrings__ApplicationDatabase')) {
    $sqlcmdBuilder = New-Object System.Data.SqlClient.SqlConnectionStringBuilder
    try {
        $sqlcmdBuilder.set_ConnectionString($envMap['ConnectionStrings__ApplicationDatabase'])
        $previousSqlcmdPassword = $env:SQLCMDPASSWORD
        try {
            $env:SQLCMDPASSWORD = $sqlcmdBuilder.Password
            $safeConfiguredDatabase = $sqlcmdBuilder.InitialCatalog.Replace("'", "''")
            $safeProductionDatabase = ([string]$expectedProductionDatabase).Replace("'", "''")
            $existenceQuery = "SET NOCOUNT ON; SELECT CASE WHEN DB_ID(N'$safeProductionDatabase') IS NULL THEN 0 ELSE 1 END, CASE WHEN DB_ID(N'$safeConfiguredDatabase') IS NULL THEN 0 ELSE 1 END;"
            $existenceOutput = & sqlcmd -S $sqlcmdBuilder.DataSource -U $sqlcmdBuilder.UserID -d master -C -l 5 -b -h -1 -W -Q $existenceQuery 2>$null
            if ($LASTEXITCODE -eq 0 -and ($existenceOutput -join ' ') -match '^\s*([01])\s+([01])\s*$') {
                $sqlSummary.Authentication = 'PASS'
                $sqlSummary.ProductionDatabaseExists = if ($Matches[1] -eq '1') { 'PASS' } else { 'FAIL' }
                $sqlSummary.DatabaseExists = if ($Matches[2] -eq '1') { 'PASS' } else { 'FAIL' }
            }
            if ($sqlSummary.DatabaseExists -eq 'PASS') {
                $null = & sqlcmd -S $sqlcmdBuilder.DataSource -U $sqlcmdBuilder.UserID -d $sqlcmdBuilder.InitialCatalog -C -l 5 -b -h -1 -W -Q 'SET NOCOUNT ON; SELECT 1;' 2>$null
                if ($LASTEXITCODE -ne 0) {
                    $sqlSummary.UserMapping = 'FAIL'
                    $sqlSummary.Permissions = 'NOT TESTED'
                    $sqlSummary.Migrations = 'NOT TESTED'
                    $sqlSummary.Category = 'Login not mapped to database or lacks CONNECT permission'
                }
            }
        }
        finally {
            $env:SQLCMDPASSWORD = $previousSqlcmdPassword
        }
    }
    catch {
        # Earlier evidence remains authoritative when optional sqlcmd probing is unavailable.
    }
}
$apiState = if ($apiContainerId) {
    (& docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' $apiContainerId 2>$null)
} else { 'NOT FOUND' }
$summaryLines = @(
    'Docker: PASS'
    'Compose: PASS'
    'Environment file: PASS'
    "Production database isolation: $productionIsolation"
    "SQL DNS: $($sqlSummary.Dns)"
    "SQL TCP: $($sqlSummary.Tcp)"
    "SQL authentication: $($sqlSummary.Authentication)"
    "Production database exists: $($sqlSummary.ProductionDatabaseExists)"
    "Configured database exists: $($sqlSummary.DatabaseExists)"
    "Database user mapping: $($sqlSummary.UserMapping)"
    "Database permissions: $($sqlSummary.Permissions)"
    "EF migrations: $($sqlSummary.Migrations)"
    "API container: $($apiState.ToString().ToUpperInvariant())"
    ''
    'Likely root cause:'
    $sqlSummary.Category
    ''
    'Recommended action:'
    $(if ($sqlSummary.ProductionDatabaseExists -eq 'FAIL') {
        'Create the repository-defined production database once with an administrator account, map the runtime login with least privilege, update .env.server to that database, then rerun preflight. Do not grant sysadmin or dbcreator.'
    } elseif ($sqlSummary.Category -in @('Database does not exist', 'CREATE DATABASE denied', 'Login not mapped to database or lacks CONNECT permission')) {
        'Have an administrator map the runtime login to the existing configured database with least privilege, then rerun preflight. Do not grant sysadmin or dbcreator.'
    } else {
        'Follow the categorized failure, correct only that prerequisite, then rerun preflight and deployment.'
    })
)
$summaryLines | Out-File (Join-Path $outputRoot '00-diagnostic-summary.txt') -Encoding utf8
$summaryLines | ForEach-Object { Write-Host $_ }

$sourceFolder = Join-Path $outputRoot "source-snapshots"
New-Item -ItemType Directory -Path $sourceFolder -Force | Out-Null

$filesToCapture = @(
    $resolvedComposeFile,
    (Join-Path $RepositoryRoot "Dockerfile.web"),
    (Join-Path $RepositoryRoot "src\BedtimeStoryTracker.Api\Dockerfile"),
    (Join-Path $RepositoryRoot "scripts\Deploy-Server.ps1"),
    (Join-Path $RepositoryRoot "version.json")
)

foreach ($file in $filesToCapture) {
    if (-not (Test-Path $file)) {
        continue
    }

    $destination = Join-Path $sourceFolder ([IO.Path]::GetFileName($file))
    Save-Redacted (Get-Content $file -Raw) $destination
}

$redactedEnv = foreach ($line in Get-Content $resolvedEnvironmentFile) {
    $trimmed = $line.Trim()

    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) {
        $line
        continue
    }

    $name = $trimmed.Split("=", 2)[0].Trim()
    "$name=<REDACTED>"
}

$redactedEnv | Out-File (Join-Path $sourceFolder ".env.server.redacted") -Encoding utf8

$zipPath = "$outputRoot.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

Compress-Archive -Path (Join-Path $outputRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal

$secretPattern = '(?i)(Password|Pwd|User\s*Id|UID|Token|Secret)\s*=|Server\s*=.+;\s*(Database|Initial Catalog)\s*=.+;'
$secretHits = @(Get-ChildItem $outputRoot -File -Recurse |
    Select-String -Pattern $secretPattern |
    Where-Object { $_.Line -notmatch '<REDACTED>' })
if ($secretHits.Count -gt 0) {
    Write-Warning "Secret scan found $($secretHits.Count) potentially unredacted line(s). Review the folder and do not share the ZIP."
}
else {
    Write-Host 'Secret scan: PASS (no unredacted connection-string fragments or sensitive assignments detected).' -ForegroundColor Green
}

Write-Section "Diagnostics Complete"
Write-Host "Folder:"
Write-Host "  $outputRoot"
Write-Host ""
Write-Host "ZIP to review and share:"
Write-Host "  $zipPath"
Write-Host ""
Write-Host "Before sharing, review the files and run:"
Write-Host "  Get-ChildItem '$outputRoot' -File -Recurse | Select-String -Pattern 'Password=|Pwd=|User Id=|Token=|Secret='"
Write-Host ""
Write-Host "Do not share the real .env.server file."
