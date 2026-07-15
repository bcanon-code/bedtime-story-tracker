#requires -Version 7.0
<#
.SYNOPSIS
Generates a copy/paste-ready ChatGPT Project tracker update from a local Git repository.

.DESCRIPTION
Collects verified repository facts and optional manual verification notes, runs selected
validation commands, and produces a Markdown prompt for the ChatGPT Project control chat.

The script is intentionally read-only with respect to the repository. It does not:
- Stage files
- Create commits
- Push changes
- Install dependencies
- Modify application or Git configuration files

By default, the generated prompt is written to the console. It can also be copied to the
clipboard and/or saved to a file.

.PARAMETER RepositoryPath
Path to the local Git repository.

.PARAMETER Checkpoint
Human-readable name of the completed checkpoint.

.PARAMETER NextCheckpoint
The next bounded checkpoint to request from the Project tracker.

.PARAMETER ValidationCommand
One or more commands to run from the repository root. Defaults to:
- npx tsc --noEmit
- git diff --check

.PARAMETER BrowserVerification
Manual browser verification notes supplied by the user.

.PARAMETER KnownIssues
Known issues or unresolved risks.

.PARAMETER PushStatus
Push status, such as Succeeded, Not pushed yet, or Failed.

.PARAMETER Interactive
Prompts for missing or confirmable values.

.PARAMETER CopyToClipboard
Copies the generated prompt to the Windows clipboard.

.PARAMETER OutputPath
Optional file path for saving the generated Markdown prompt.

.PARAMETER SkipValidation
Skips validation command execution.

.PARAMETER RecentCommitCount
Number of recent commits to include. Defaults to 5.

.PARAMETER FailOnValidationError
Returns exit code 1 when one or more validation commands fail.

.EXAMPLE
.\scripts\New-ProjectTrackerUpdate.ps1 `
  -Interactive `
  -CopyToClipboard

.EXAMPLE
.\scripts\New-ProjectTrackerUpdate.ps1 `
  -Checkpoint "Added story reading timer" `
  -BrowserVerification "Timer started, updated, stopped, and refresh worked" `
  -PushStatus "Succeeded" `
  -NextCheckpoint "Add post-reading calmness and notes" `
  -CopyToClipboard

.EXAMPLE
.\scripts\New-ProjectTrackerUpdate.ps1 `
  -Checkpoint "Tooling-only update" `
  -SkipValidation `
  -OutputPath ".\artifacts\project-tracker-update.md"
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string]$RepositoryPath = "C:\repo\bedtime-story-tracker",

    [Parameter()]
    [string]$Checkpoint,

    [Parameter()]
    [string]$NextCheckpoint,

    [Parameter()]
    [ValidateNotNull()]
    [string[]]$ValidationCommand = @(
        "npx tsc --noEmit",
        "git diff --check"
    ),

    [Parameter()]
    [string]$BrowserVerification = "Not provided",

    [Parameter()]
    [string]$KnownIssues = "None reported",

    [Parameter()]
    [string]$PushStatus = "Not provided",

    [Parameter()]
    [switch]$Interactive,

    [Parameter()]
    [switch]$CopyToClipboard,

    [Parameter()]
    [string]$OutputPath,

    [Parameter()]
    [switch]$SkipValidation,

    [Parameter()]
    [ValidateRange(1, 25)]
    [int]$RecentCommitCount = 5,

    [Parameter()]
    [switch]$FailOnValidationError
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

function Read-InteractiveValue {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Prompt,

        [Parameter()]
        [AllowEmptyString()]
        [string]$DefaultValue = ""
    )

    $suffix = if ([string]::IsNullOrWhiteSpace($DefaultValue)) {
        ""
    }
    else {
        " [$DefaultValue]"
    }

    $value = Read-Host "$Prompt$suffix"

    if ([string]::IsNullOrWhiteSpace($value)) {
        return $DefaultValue
    }

    return $value.Trim()
}

function Invoke-NativeCommand {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,

        [Parameter()]
        [string[]]$ArgumentList = @(),

        [Parameter()]
        [string]$DisplayCommand
    )

    $startedAt = Get-Date

    $output = & $FilePath @ArgumentList 2>&1
    $exitCode = $LASTEXITCODE

    if ($null -eq $exitCode) {
        $exitCode = 0
    }

    [pscustomobject]@{
        Command    = if ($DisplayCommand) { $DisplayCommand } else { "$FilePath $($ArgumentList -join ' ')" }
        ExitCode   = [int]$exitCode
        Output     = (($output | Out-String).Trim())
        DurationMs = [math]::Round(((Get-Date) - $startedAt).TotalMilliseconds)
    }
}

function Invoke-PowerShellCommand {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Command
    )

    $startedAt = Get-Date

    $output = & pwsh -NoLogo -NoProfile -NonInteractive -Command $Command 2>&1
    $exitCode = $LASTEXITCODE

    if ($null -eq $exitCode) {
        $exitCode = 0
    }

    [pscustomobject]@{
        Command    = $Command
        ExitCode   = [int]$exitCode
        Output     = (($output | Out-String).Trim())
        DurationMs = [math]::Round(((Get-Date) - $startedAt).TotalMilliseconds)
    }
}

function Get-GitOutput {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string[]]$Arguments,

        [Parameter()]
        [switch]$AllowFailure
    )

    $result = Invoke-NativeCommand `
        -FilePath "git" `
        -ArgumentList $Arguments `
        -DisplayCommand "git $($Arguments -join ' ')"

    if (-not $AllowFailure -and $result.ExitCode -ne 0) {
        throw "Git command failed: $($result.Command)`n$($result.Output)"
    }

    return $result
}

function ConvertTo-CodeBlockValue {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [AllowEmptyString()]
        [string]$Value,

        [Parameter()]
        [string]$EmptyValue = "(none)"
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $EmptyValue
    }

    return $Value.Trim()
}

function Resolve-OutputFilePath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$BasePath,

        [Parameter(Mandatory)]
        [string]$RequestedPath
    )

    if ([System.IO.Path]::IsPathRooted($RequestedPath)) {
        return [System.IO.Path]::GetFullPath($RequestedPath)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $BasePath $RequestedPath))
}

if (-not (Test-Path -LiteralPath $RepositoryPath -PathType Container)) {
    throw "Repository path does not exist: $RepositoryPath"
}

$resolvedRepositoryPath = (Resolve-Path -LiteralPath $RepositoryPath).Path

Push-Location -LiteralPath $resolvedRepositoryPath

try {
    $insideWorkTree = Get-GitOutput -Arguments @("rev-parse", "--is-inside-work-tree")

    if ($insideWorkTree.Output -ne "true") {
        throw "The selected folder is not a Git repository: $resolvedRepositoryPath"
    }

    if ($Interactive) {
        $Checkpoint = Read-InteractiveValue `
            -Prompt "Completed checkpoint" `
            -DefaultValue $Checkpoint

        $BrowserVerification = Read-InteractiveValue `
            -Prompt "Manual browser verification" `
            -DefaultValue $BrowserVerification

        $KnownIssues = Read-InteractiveValue `
            -Prompt "Known issues" `
            -DefaultValue $KnownIssues

        $PushStatus = Read-InteractiveValue `
            -Prompt "Push status" `
            -DefaultValue $PushStatus

        $NextCheckpoint = Read-InteractiveValue `
            -Prompt "Next checkpoint" `
            -DefaultValue $NextCheckpoint
    }

    if ([string]::IsNullOrWhiteSpace($Checkpoint)) {
        $Checkpoint = "Not provided"
    }

    if ([string]::IsNullOrWhiteSpace($NextCheckpoint)) {
        $NextCheckpoint = "Ask the Project tracker to select the next smallest safe checkpoint."
    }

    $branchResult = Get-GitOutput -Arguments @("branch", "--show-current")
    $latestCommitResult = Get-GitOutput -Arguments @("log", "-1", "--oneline")
    $recentCommitsResult = Get-GitOutput -Arguments @(
        "log",
        "--oneline",
        "--decorate",
        "-$RecentCommitCount"
    )
    $statusResult = Get-GitOutput -Arguments @("status", "--short")
    $trackedChangesResult = Get-GitOutput -Arguments @("diff", "--name-status")
    $stagedChangesResult = Get-GitOutput -Arguments @("diff", "--cached", "--name-status")
    $untrackedFilesResult = Get-GitOutput -Arguments @(
        "ls-files",
        "--others",
        "--exclude-standard"
    )

    $remoteResult = Get-GitOutput `
        -Arguments @("remote", "get-url", "origin") `
        -AllowFailure

    $upstreamResult = Get-GitOutput `
        -Arguments @(
        "rev-list",
        "--left-right",
        "--count",
        "HEAD...@{upstream}"
    ) `
        -AllowFailure

    $remote = if ($remoteResult.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($remoteResult.Output)) {
        $remoteResult.Output
    }
    else {
        "No origin remote configured"
    }

    $upstreamStatus = if ($upstreamResult.ExitCode -eq 0 -and -not [string]::IsNullOrWhiteSpace($upstreamResult.Output)) {
        $parts = $upstreamResult.Output -split "\s+"

        if ($parts.Count -ge 2) {
            "Ahead: $($parts[0]); Behind: $($parts[1])"
        }
        else {
            $upstreamResult.Output
        }
    }
    else {
        "No upstream tracking branch available"
    }

    $validationResults = @()

    if (-not $SkipValidation) {
        foreach ($command in $ValidationCommand) {
            if ([string]::IsNullOrWhiteSpace($command)) {
                continue
            }

            $validationResults += Invoke-PowerShellCommand -Command $command
        }
    }

    $validationText = if ($SkipValidation) {
        "- Validation was skipped by request."
    }
    elseif ($validationResults.Count -eq 0) {
        "- No validation commands were supplied."
    }
    else {
        ($validationResults | ForEach-Object {
            $resultLabel = if ($_.ExitCode -eq 0) { "PASSED" } else { "FAILED" }
            $displayOutput = if ([string]::IsNullOrWhiteSpace($_.Output)) {
                "(no output)"
            }
            else {
                $_.Output
            }

            @"
- `$($_.Command)`
  - Result: $resultLabel
  - Exit code: $($_.ExitCode)
  - Duration: $($_.DurationMs) ms
  - Output:
```text
$displayOutput
```
"@
        }) -join "`n"
    }

    $failedValidationCount = @(
        $validationResults | Where-Object { $_.ExitCode -ne 0 }
    ).Count

    $status = ConvertTo-CodeBlockValue -Value $statusResult.Output -EmptyValue "(clean)"
    $trackedChanges = ConvertTo-CodeBlockValue -Value $trackedChangesResult.Output
    $stagedChanges = ConvertTo-CodeBlockValue -Value $stagedChangesResult.Output
    $untrackedFiles = ConvertTo-CodeBlockValue -Value $untrackedFilesResult.Output
    $recentCommits = ConvertTo-CodeBlockValue -Value $recentCommitsResult.Output
    $branch = ConvertTo-CodeBlockValue -Value $branchResult.Output -EmptyValue "(detached HEAD)"
    $latestCommit = ConvertTo-CodeBlockValue -Value $latestCommitResult.Output -EmptyValue "(no commits)"

    $repositoryClean = (
        $status -eq "(clean)" -and
        $trackedChanges -eq "(none)" -and
        $stagedChanges -eq "(none)" -and
        $untrackedFiles -eq "(none)"
    )

    $repositoryStateLabel = if ($repositoryClean) {
        "Clean"
    }
    else {
        "Changes require review"
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"

    $prompt = @"
The following checkpoint information was generated from the local repository.

Repository:
`$resolvedRepositoryPath`

Generated:
$timestamp

Completed checkpoint:
$Checkpoint

Confirmed repository facts:
- Branch: $branch
- Origin: $remote
- Upstream status: $upstreamStatus
- Latest commit: $latestCommit
- Repository state: $repositoryStateLabel
- Push status: $PushStatus

Manual browser verification:
$BrowserVerification

Validation results:
$validationText

Current Git status:
```text
$status
```

Changed tracked files:
```text
$trackedChanges
```

Staged files:
```text
$stagedChanges
```

Untracked files:
```text
$untrackedFiles
```

Recent Git history:
```text
$recentCommits
```

Known issues:
$KnownIssues

Requested next checkpoint:
$NextCheckpoint

Update `00 — Project Control and Checkpoint Tracker`.

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
5. If the working tree is not clean, identify exactly what still needs review.
6. Check the recent Git history so the requested next checkpoint does not repeat already committed work.
7. Prepare one bounded, copy/paste-ready Codex prompt for only the next checkpoint.
8. Do not assume browser behavior beyond the manual verification stated above.
9. Do not combine multiple checkpoints or add optional features prematurely.
"@

    Write-Host ""
    Write-Host "===== PROJECT TRACKER UPDATE =====" -ForegroundColor Cyan
    Write-Output $prompt

    if ($CopyToClipboard) {
        if (-not (Get-Command Set-Clipboard -ErrorAction SilentlyContinue)) {
            Write-Warning "Set-Clipboard is unavailable in this PowerShell session."
        }
        else {
            try {
                Set-Clipboard -Value $prompt
                Write-Host ""
                Write-Host "Copied prompt to clipboard." -ForegroundColor Green
            }
            catch {
                Write-Warning "Unable to copy the prompt to the clipboard: $($_.Exception.Message)"
            }
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
        $resolvedOutputPath = Resolve-OutputFilePath `
            -BasePath $resolvedRepositoryPath `
            -RequestedPath $OutputPath

        $outputDirectory = Split-Path -Parent $resolvedOutputPath

        if (-not [string]::IsNullOrWhiteSpace($outputDirectory) -and
            -not (Test-Path -LiteralPath $outputDirectory)) {
            New-Item `
                -ItemType Directory `
                -Path $outputDirectory `
                -Force | Out-Null
        }

        Set-Content `
            -LiteralPath $resolvedOutputPath `
            -Value $prompt `
            -Encoding utf8NoBOM

        Write-Host ""
        Write-Host "Saved prompt to: $resolvedOutputPath" -ForegroundColor Green
    }

    if ($failedValidationCount -gt 0) {
        Write-Warning "$failedValidationCount validation command(s) failed. Review the generated prompt before committing."

        if ($FailOnValidationError) {
            exit 1
        }
    }
}
finally {
    Pop-Location
}
