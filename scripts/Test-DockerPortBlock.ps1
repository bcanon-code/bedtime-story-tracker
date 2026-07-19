#requires -Version 5.1

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateRange(1, 65535)]
    [int] $StartPort = 12000,

    [Parameter()]
    [ValidateRange(1, 1000)]
    [int] $BlockSize = 10,

    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string] $ComposeProjectName = 'bedtime-story-tracker'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$endPort = $StartPort + $BlockSize - 1
if ($endPort -gt 65535) {
    throw "Port block $StartPort-$endPort exceeds TCP port 65535."
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Required command 'docker' was not found on PATH."
}

$ownedPorts = [Collections.Generic.HashSet[int]]::new()
$ownedMappings = & docker ps `
    --filter "label=com.docker.compose.project=$ComposeProjectName" `
    --format '{{.Ports}}'
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to inspect Docker port mappings.'
}

foreach ($mapping in $ownedMappings) {
    foreach ($match in [regex]::Matches($mapping, '(?<!\d)(\d{1,5})->\d{1,5}/tcp')) {
        [void] $ownedPorts.Add([int] $match.Groups[1].Value)
    }
}

$conflicts = [Collections.Generic.List[string]]::new()
$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -ge $StartPort -and $_.LocalPort -le $endPort }

foreach ($listener in $listeners) {
    if ($ownedPorts.Contains([int] $listener.LocalPort)) { continue }

    $processName = 'unknown'
    $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    if ($null -ne $process) { $processName = $process.ProcessName }
    $conflicts.Add(
        "TCP $($listener.LocalPort) is listening on $($listener.LocalAddress) " +
        "(PID $($listener.OwningProcess), $processName).")
}

$excludedOutput = & netsh interface ipv4 show excludedportrange protocol=tcp
if ($LASTEXITCODE -eq 0) {
    foreach ($line in $excludedOutput) {
        if ($line -match '^\s*(\d+)\s+(\d+)\s*\*?\s*$') {
            $excludedStart = [int] $Matches[1]
            $excludedEnd = [int] $Matches[2]
            if ($excludedStart -le $endPort -and $excludedEnd -ge $StartPort) {
                $conflicts.Add(
                    "Windows excludes TCP range $excludedStart-$excludedEnd, which overlaps the reserved block.")
            }
        }
    }
}

if ($conflicts.Count -gt 0) {
    $details = $conflicts | Sort-Object -Unique | ForEach-Object { "- $_" }
    throw "Reserved Docker port block $StartPort-$endPort is not available:`n$($details -join "`n")"
}

Write-Host "Reserved Docker port block $StartPort-$endPort is available." -ForegroundColor Green
if ($ownedPorts.Count -gt 0) {
    Write-Host "Existing ports owned by Compose project '$ComposeProjectName' were allowed: $($ownedPorts -join ', ')."
}
