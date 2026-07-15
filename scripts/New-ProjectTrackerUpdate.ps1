#requires -Version 7.0
<#
.SYNOPSIS
Generates a copy/paste-ready ChatGPT Project tracker update.

.DESCRIPTION
Collects Git facts, optional validation results, manual browser verification,
and the requested next checkpoint. It does not stage, commit, push, install
packages, or modify repository files.

.EXAMPLE
.\New-ProjectTrackerUpdate.ps1 -Interactive -CopyToClipboard

.EXAMPLE
.\New-ProjectTrackerUpdate.ps1 `
  -Checkpoint "Minimal Expo baseline" `
  -NextCheckpoint "Add story selection and pre-reading check-in" `
  -BrowserVerification "App rendered; refresh worked; no runtime errors" `
  -PushStatus "Succeeded" `
  -CopyToClipboard
#>

[CmdletBinding()]
param(
    [string]$RepositoryPath = "C:\repo\bedtime-story-tracker",
    [string]$Checkpoint,
    [string]$NextCheckpoint,
    [string[]]$ValidationCommand = @("npx tsc --noEmit", "git diff --check"),
    [string]$BrowserVerification = "Not provided",
    [string]$KnownIssues = "None reported",
    [string]$PushStatus = "Not provided",
    [switch]$Interactive,
    [switch]$CopyToClipboard,
    [string]$OutputPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Invoke-CapturedCommand {
    param([Parameter(Mandatory)][string]$Command)

    try {
        $output = & pwsh -NoLogo -NoProfile -Command $Command 2>&1 | Out-String
        $exitCode = $LASTEXITCODE
        if ($null -eq $exitCode) { $exitCode = 0 }

        [pscustomobject]@{
            Command  = $Command
            ExitCode = $exitCode
            Output   = $output.Trim()
        }
    }
    catch {
        [pscustomobject]@{
            Command  = $Command
            ExitCode = 1
            Output   = $_.Exception.Message
        }
    }
}

function Get-GitValue {
    param([Parameter(Mandatory)][string[]]$Arguments)

    $result = & git @Arguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Git command failed: git $($Arguments -join ' ')`n$($result | Out-String)"
    }

    return ($result | Out-String).Trim()
}

function Read-Value {
    param(
        [Parameter(Mandatory)][string]$Prompt,
        [string]$DefaultValue = ""
    )

    $suffix = if ([string]::IsNullOrWhiteSpace($DefaultValue)) { "" } else { " [$DefaultValue]" }
    $value = Read-Host "$Prompt$suffix"
    if ([string]::IsNullOrWhiteSpace($value)) { return $DefaultValue }
    return $value
}

if (-not (Test-Path -LiteralPath $RepositoryPath -PathType Container)) {
    throw "Repository path does not exist: $RepositoryPath"
}

Push-Location $RepositoryPath

try {
    $isGitRepo = (& git rev-parse --is-inside-work-tree 2>$null) -eq "true"
    if (-not $isGitRepo) {
        throw "The selected folder is not a Git repository: $RepositoryPath"
    }

    if ($Interactive) {
        $Checkpoint = Read-Value -Prompt "Completed checkpoint" -DefaultValue $Checkpoint
        $BrowserVerification = Read-Value -Prompt "Manual browser verification" -DefaultValue $BrowserVerification
        $KnownIssues = Read-Value -Prompt "Known issues" -DefaultValue $KnownIssues
        $PushStatus = Read-Value -Prompt "Push status" -DefaultValue $PushStatus
        $NextCheckpoint = Read-Value -Prompt "Next checkpoint" -DefaultValue $NextCheckpoint
    }

    if ([string]::IsNullOrWhiteSpace($Checkpoint)) {
        $Checkpoint = "Not provided"
    }

    if ([string]::IsNullOrWhiteSpace($NextCheckpoint)) {
        $NextCheckpoint = "Ask the Project tracker to select the next smallest safe checkpoint."
    }

    $branch = Get-GitValue -Arguments @("branch", "--show-current")
    $latestCommit = Get-GitValue -Arguments @("log", "-1", "--oneline")
    $recentCommits = Get-GitValue -Arguments @("log", "--oneline", "--decorate", "-5")
    $status = Get-GitValue -Arguments @("status", "--short")
    $remote = (& git remote get-url origin 2>$null | Out-String).Trim()

    if ([string]::IsNullOrWhiteSpace($remote)) { $remote = "No origin remote configured" }
    if ([string]::IsNullOrWhiteSpace($status)) { $status = "(clean)" }

    $changedFiles = (& git diff --name-status 2>$null | Out-String).Trim()
    $stagedFiles = (& git diff --cached --name-status 2>$null | Out-String).Trim()
    $untrackedFiles = (& git ls-files --others --exclude-standard 2>$null | Out-String).Trim()

    if ([string]::IsNullOrWhiteSpace($changedFiles)) { $changedFiles = "(none)" }
    if ([string]::IsNullOrWhiteSpace($stagedFiles)) { $stagedFiles = "(none)" }
    if ([string]::IsNullOrWhiteSpace($untrackedFiles)) { $untrackedFiles = "(none)" }

    $validationResults = @()
    foreach ($command in $ValidationCommand) {
        if (-not [string]::IsNullOrWhiteSpace($command)) {
            $validationResults += Invoke-CapturedCommand -Command $command
        }
    }

    if ($validationResults.Count -eq 0) {
        $validationText = "- No validation commands were supplied."
    }
    else {
        $validationBlocks = foreach ($result in $validationResults) {
            $resultLabel = if ($result.ExitCode -eq 0) { "PASSED" } else { "FAILED" }
            $displayOutput = if ([string]::IsNullOrWhiteSpace($result.Output)) { "(no output)" } else { $result.Output }

            @"
- ``$($result.Command)``
  - Result: $resultLabel
  - Exit code: $($result.ExitCode)
  - Output:
``````text
$displayOutput
``````
"@
        }
        $validationText = $validationBlocks -join "`n"
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"

    $prompt = @"
The following checkpoint information was generated from the local repository.

Repository:
``$RepositoryPath``

Generated:
$timestamp

Completed checkpoint:
$Checkpoint

Confirmed repository facts:
- Branch: $branch
- Origin: $remote
- Latest commit: $latestCommit
- Push status: $PushStatus

Manual browser verification:
$BrowserVerification

Validation results:
$validationText

Current Git status:
``````text
$status
``````

Changed tracked files:
``````text
$changedFiles
``````

Staged files:
``````text
$stagedFiles
``````

Untracked files:
``````text
$untrackedFiles
``````

Recent Git history:
``````text
$recentCommits
``````

Known issues:
$KnownIssues

Requested next checkpoint:
$NextCheckpoint

Update ``00 — Project Control and Checkpoint Tracker``.

Then:

1. Reconcile this information against the uploaded approved specification.
2. Clearly distinguish verified facts from anything still unverified.
3. Update:
   - Current stable checkpoint
   - Last verified commands
   - Last verified commit
   - Next checkpoint
   - Known issues
   - Deferred
4. Determine whether the completed checkpoint is stable and ready to remain in Git history.
5. If the working tree is not clean, identify what still needs review.
6. Prepare one bounded, copy/paste-ready Codex prompt for only the next checkpoint.
7. Do not assume browser behavior beyond the manual verification stated above.
8. Do not combine multiple checkpoints or add optional features prematurely.
"@

    Write-Host ""
    Write-Host "===== PROJECT TRACKER UPDATE =====" -ForegroundColor Cyan
    Write-Output $prompt

    if ($CopyToClipboard) {
        try {
            Set-Clipboard -Value $prompt
            Write-Host ""
            Write-Host "Copied prompt to clipboard." -ForegroundColor Green
        }
        catch {
            Write-Warning "Unable to copy to clipboard: $($_.Exception.Message)"
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
        $resolvedOutputPath = if ([System.IO.Path]::IsPathRooted($OutputPath)) {
            $OutputPath
        }
        else {
            Join-Path $RepositoryPath $OutputPath
        }

        $outputDirectory = Split-Path -Parent $resolvedOutputPath
        if ($outputDirectory -and -not (Test-Path -LiteralPath $outputDirectory)) {
            New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
        }

        Set-Content -LiteralPath $resolvedOutputPath -Value $prompt -Encoding utf8
        Write-Host ""
        Write-Host "Saved prompt to: $resolvedOutputPath" -ForegroundColor Green
    }

    if (($validationResults | Where-Object ExitCode -ne 0).Count -gt 0) {
        Write-Warning "One or more validation commands failed. Review the generated prompt before committing."
        exit 1
    }
}
finally {
    Pop-Location
}
