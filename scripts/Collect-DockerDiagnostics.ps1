[CmdletBinding()]
param(
    [string]$RepositoryRoot = "",
    [string]$EnvironmentFile = ".env.server",
    [string]$ComposeFile = "compose.server.yml",
    [string]$ApiServiceName = "api",
    [string]$FrontendServiceName = "frontend",
    [int]$LogTail = 300
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
        '(?im)(Password|Pwd|User Id|UserID|UID|AccessToken|ApiKey|Secret|Token)\s*=\s*[^;\r\n]+' ,
        '(?im)(ConnectionStrings__ApplicationDatabase\s*=\s*).+',
        '(?im)(ConnectionStrings:ApplicationDatabase\s*=\s*).+'
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
    $containerId = docker @composeArgs ps -q $service 2>$null | Select-Object -First 1
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

$apiContainerId = docker @composeArgs ps -q $ApiServiceName 2>$null | Select-Object -First 1

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

            @(
                "DetectedSqlHost=$sqlHost"
                "DetectedSqlPort=$sqlPort"
                "ConnectionStringValue=<REDACTED>"
            ) | Out-File (Join-Path $outputRoot "24-sql-target-redacted.txt") -Encoding utf8

            $results.Add((Invoke-Captured "API SQL TCP reachability $sqlHost`:$sqlPort" {
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

$envMap = @{}
foreach ($line in Get-Content $resolvedEnvironmentFile) {
    $trimmed = $line.Trim()

    if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#") -or -not $trimmed.Contains("=")) {
        continue
    }

    $name, $value = $trimmed.Split("=", 2)
    $envMap[$name.Trim()] = $value.Trim()
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

foreach ($service in @($ApiServiceName, $FrontendServiceName)) {
    $containerId = docker @composeArgs ps -q $service 2>$null | Select-Object -First 1

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