#requires -Version 5.1

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateSet('Major', 'Minor', 'Patch', 'BuildOnly')]
    [string] $Increment
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$versionPath = Join-Path $repositoryRoot 'version.json'
$versionData = Get-Content -Raw -LiteralPath $versionPath | ConvertFrom-Json

if ($null -eq $versionData.version -or $versionData.version -notmatch '^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$') {
    throw 'version.json version must be a SemVer core value such as 1.4.2.'
}
$buildNumber = 0
if ($null -eq $versionData.build -or
    -not [int]::TryParse([string] $versionData.build, [ref] $buildNumber) -or
    $buildNumber -lt 1) {
    throw 'version.json build must be a positive integer.'
}

$oldVersion = [string] $versionData.version
$oldBuild = $buildNumber
$parts = $oldVersion.Split('.') | ForEach-Object { [int] $_ }
switch ($Increment) {
    'Major' { $parts[0]++; $parts[1] = 0; $parts[2] = 0 }
    'Minor' { $parts[1]++; $parts[2] = 0 }
    'Patch' { $parts[2]++ }
    'BuildOnly' { }
}

$newVersion = $parts -join '.'
$newBuild = $oldBuild + 1
[ordered]@{ version = $newVersion; build = $newBuild } |
    ConvertTo-Json |
    Set-Content -LiteralPath $versionPath -Encoding utf8

Write-Host "Version: $oldVersion -> $newVersion"
Write-Host "Build:   $oldBuild -> $newBuild"
