#requires -Version 7.0
<#
.SYNOPSIS
Creates a copy/paste-ready ChatGPT Project tracker update from a local Git repository.

.DESCRIPTION
Collects repository facts, optionally runs validation commands, accepts manual
checkpoint notes, and generates a Markdown prompt for the ChatGPT Project control chat.

This script is read-only with respect to the repository. It does not stage, commit,
push, install dependencies, or modify application files.

.PARAMETER RepositoryPath
Path to the local Git repository.

.PARAMETER Checkpoint
Human-readable completed checkpoint.

.PARAMETER NextCheckpoint
Next bounded checkpoint to request.

.PARAMETER ValidationCommand
Validation commands to run from the repository root.

.PARAMETER BrowserVerification
Manual browser verification supplied by the user.

.PARAMETER KnownIssues
Known issues or unresolved risks.

.PARAMETER PushStatus
Push state, such as Succeeded, Not pushed yet, or Failed.

.PARAMETER Interactive
Prompts for checkpoint values.

.PARAMETER CopyToClipboard
Copies the generated prompt to the clipboard.

.PARAMETER OutputPath
Optional path for saving the generated prompt.

.PARAMETER SkipValidation
Skips validation command execution.

.PARAMETER RecentCommitCount
Number of recent commits to include.

.PARAMETER FailOnValidationError
Returns exit code 1 if any validation command fails.

.EXAMPLE
.\scripts\New-ProjectTrackerUpdate.ps1 -Interactive -CopyToClipboard

.EXAMPLE
.\scripts\New-ProjectTrackerUpdate.ps1 `
    -Checkpoint 'Added story timer' `
    -BrowserVerification 'Timer started, stopped, and refreshed successfully.' `
    -KnownIssues 'None currently reported' `
    -PushStatus 'Succeeded' `
    -NextCheckpoint 'Add post-reading check-in' `
    -RecentCommitCount 8 `
    -CopyToClipboard
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string] $RepositoryPath = 'C:\repo\bedtime-story-tracker',

    [Parameter()]
    [AllowEmptyString()]
    [string] $Checkpoint = '',

    [Parameter()]
    [AllowEmptyString()]
    [string] $NextCheckpoint = '',

    [Parameter()]
    [ValidateNotNull()]
    [string[]] $ValidationCommand = @(
        'npx tsc --noEmit',
        'git diff --check'
    ),

    [Parameter()]
    [AllowEmptyString()]
    [string] $BrowserVerification = 'Not provided',

    [Parameter()]
    [AllowEmptyString()]
    [string] $KnownIssues = 'None currently reported',

    [Parameter()]
    [AllowEmptyString()]
    [string] $PushStatus = 'Succeeded',

    [Parameter()]
    [switch] $Interactive,

    [Parameter()]
    [switch] $CopyToClipboard,

    [Parameter()]
    [AllowEmptyString()]
    [string] $OutputPath = '',

    [Parameter()]
    [switch] $SkipValidation,

    [Parameter()]
    [ValidateRange(1, 25)]
    [int] $RecentCommitCount = 5,

    [Parameter()]
    [switch] $FailOnValidationError
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

function Read-TrackerValue {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $Label,

        [Parameter()]
        [AllowEmptyString()]
        [string] $Default = ''
    )

    $prompt = if ([string]::IsNullOrWhiteSpace($Default)) {
        $Label
    }
    else {
        '{0} [{1}]' -f $Label, $Default
    }

    $value = Read-Host $prompt

    if ([string]::IsNullOrWhiteSpace($value)) {
        return $Default
    }

    return $value.Trim()
}

function Invoke-ExternalCommand {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $FilePath,

        [Parameter()]
        [string[]] $ArgumentList = @(),

        [Parameter()]
        [AllowEmptyString()]
        [string] $DisplayName = ''
    )

    $startedAt = Get-Date

    $output = & $FilePath @ArgumentList 2>&1
    $exitCode = $LASTEXITCODE

    if ($null -eq $exitCode) {
        $exitCode = 0
    }

    $commandName = if ([string]::IsNullOrWhiteSpace($DisplayName)) {
        ('{0} {1}' -f $FilePath, ($ArgumentList -join ' ')).Trim()
    }
    else {
        $DisplayName
    }

    return [pscustomobject] @{
        Command    = $commandName
        ExitCode   = [int] $exitCode
        Output     = (($output | Out-String).Trim())
        DurationMs = [math]::Round(((Get-Date) - $startedAt).TotalMilliseconds)
    }
}

function Invoke-GitCommand {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string[]] $ArgumentList,

        [Parameter()]
        [switch] $AllowFailure
    )

    $result = Invoke-ExternalCommand `
        -FilePath 'git' `
        -ArgumentList $ArgumentList `
        -DisplayName ('git {0}' -f ($ArgumentList -join ' '))

    if (-not $AllowFailure -and $result.ExitCode -ne 0) {
        throw "Git command failed: $($result.Command)`n$($result.Output)"
    }

    return $result
}

function Invoke-ValidationCommand {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string] $Command
    )

    return Invoke-ExternalCommand `
        -FilePath 'pwsh' `
        -ArgumentList @(
            '-NoLogo'
            '-NoProfile'
            '-NonInteractive'
            '-Command'
            $Command
        ) `
        -DisplayName $Command
}

function Get-TextOrFallback {
    [CmdletBinding()]
    param(
        [Parameter()]
        [AllowNull()]
        [AllowEmptyString()]
        [string] $Value,

        [Parameter()]
        [string] $Fallback = '(none)'
    )

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return $Fallback
    }

    return $Value.Trim()
}

if (-not (Test-Path -LiteralPath $RepositoryPath -PathType Container)) {
    throw "Repository path does not exist: $RepositoryPath"
}

$resolvedRepositoryPath = (Resolve-Path -LiteralPath $RepositoryPath).Path

Push-Location -LiteralPath $resolvedRepositoryPath

try {
    $gitCheck = Invoke-GitCommand -ArgumentList @(
        'rev-parse'
        '--is-inside-work-tree'
    )

    if ($gitCheck.Output -ne 'true') {
        throw "The selected path is not a Git repository: $resolvedRepositoryPath"
    }

    if ($Interactive) {
        $Checkpoint = Read-TrackerValue `
            -Label 'Completed checkpoint' `
            -Default $Checkpoint

        $BrowserVerification = Read-TrackerValue `
            -Label 'Manual browser verification' `
            -Default $BrowserVerification

        $KnownIssues = Read-TrackerValue `
            -Label 'Known issues' `
            -Default $KnownIssues

        $PushStatus = Read-TrackerValue `
            -Label 'Push status' `
            -Default $PushStatus

        $NextCheckpoint = Read-TrackerValue `
            -Label 'Next checkpoint' `
            -Default $NextCheckpoint
    }

    if ([string]::IsNullOrWhiteSpace($Checkpoint)) {
        $Checkpoint = 'Not provided'
    }

    if ([string]::IsNullOrWhiteSpace($NextCheckpoint)) {
        $NextCheckpoint = 'Ask the Project tracker to select the next smallest safe checkpoint.'
    }

    $branchResult = Invoke-GitCommand -ArgumentList @(
        'branch'
        '--show-current'
    )

    $latestCommitResult = Invoke-GitCommand -ArgumentList @(
        'log'
        '-1'
        '--oneline'
    )

    $recentCommitsResult = Invoke-GitCommand -ArgumentList @(
        'log'
        '--oneline'
        '--decorate'
        "-$RecentCommitCount"
    )

    $statusResult = Invoke-GitCommand -ArgumentList @(
        'status'
        '--short'
    )

    $trackedChangesResult = Invoke-GitCommand -ArgumentList @(
        'diff'
        '--name-status'
    )

    $stagedChangesResult = Invoke-GitCommand -ArgumentList @(
        'diff'
        '--cached'
        '--name-status'
    )

    $untrackedFilesResult = Invoke-GitCommand -ArgumentList @(
        'ls-files'
        '--others'
        '--exclude-standard'
    )

    $remoteResult = Invoke-GitCommand `
        -ArgumentList @(
            'remote'
            'get-url'
            'origin'
        ) `
        -AllowFailure

    $upstreamResult = Invoke-GitCommand `
        -ArgumentList @(
            'rev-list'
            '--left-right'
            '--count'
            'HEAD...@{upstream}'
        ) `
        -AllowFailure

    $remoteText = if (
        $remoteResult.ExitCode -eq 0 -and
        -not [string]::IsNullOrWhiteSpace($remoteResult.Output)
    ) {
        $remoteResult.Output
    }
    else {
        'No origin remote configured'
    }

    $upstreamText = 'No upstream tracking branch available'

    if (
        $upstreamResult.ExitCode -eq 0 -and
        -not [string]::IsNullOrWhiteSpace($upstreamResult.Output)
    ) {
        $upstreamParts = @($upstreamResult.Output -split '\s+')

        if ($upstreamParts.Count -ge 2) {
            $upstreamText = 'Ahead: {0}; Behind: {1}' -f `
                $upstreamParts[0], `
                $upstreamParts[1]
        }
        else {
            $upstreamText = $upstreamResult.Output
        }
    }

    $validationResults = [System.Collections.Generic.List[object]]::new()

    if (-not $SkipValidation) {
        foreach ($command in $ValidationCommand) {
            if (-not [string]::IsNullOrWhiteSpace($command)) {
                [void] $validationResults.Add(
                    (Invoke-ValidationCommand -Command $command)
                )
            }
        }
    }

    $failedValidationResults = @(
        $validationResults |
            Where-Object { $_.ExitCode -ne 0 }
    )

    $failedValidationCount = $failedValidationResults.Count

    $statusText = Get-TextOrFallback `
        -Value $statusResult.Output `
        -Fallback '(clean)'

    $trackedText = Get-TextOrFallback -Value $trackedChangesResult.Output
    $stagedText = Get-TextOrFallback -Value $stagedChangesResult.Output
    $untrackedText = Get-TextOrFallback -Value $untrackedFilesResult.Output
    $recentText = Get-TextOrFallback -Value $recentCommitsResult.Output

    $branchText = Get-TextOrFallback `
        -Value $branchResult.Output `
        -Fallback '(detached HEAD)'

    $latestCommitText = Get-TextOrFallback `
        -Value $latestCommitResult.Output `
        -Fallback '(no commits)'

    $repositoryIsClean = (
        $statusText -eq '(clean)' -and
        $trackedText -eq '(none)' -and
        $stagedText -eq '(none)' -and
        $untrackedText -eq '(none)'
    )

    $repositoryState = if ($repositoryIsClean) {
        'Clean'
    }
    else {
        'Changes require review'
    }

    $lines = [System.Collections.Generic.List[string]]::new()

    [void] $lines.Add('The following checkpoint information was generated from the local repository.')
    [void] $lines.Add('')
    [void] $lines.Add('Repository:')
    [void] $lines.Add($resolvedRepositoryPath)
    [void] $lines.Add('')
    [void] $lines.Add('Generated:')
    [void] $lines.Add((Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'))
    [void] $lines.Add('')
    [void] $lines.Add('Completed checkpoint:')
    [void] $lines.Add($Checkpoint)
    [void] $lines.Add('')
    [void] $lines.Add('Confirmed repository facts:')
    [void] $lines.Add("- Branch: $branchText")
    [void] $lines.Add("- Origin: $remoteText")
    [void] $lines.Add("- Upstream status: $upstreamText")
    [void] $lines.Add("- Latest commit: $latestCommitText")
    [void] $lines.Add("- Repository state: $repositoryState")
    [void] $lines.Add("- Push status: $PushStatus")
    [void] $lines.Add('')
    [void] $lines.Add('Manual browser verification:')
    [void] $lines.Add($BrowserVerification)
    [void] $lines.Add('')
    [void] $lines.Add('Validation results:')

    if ($SkipValidation) {
        [void] $lines.Add('- Validation was skipped by request.')
    }
    elseif ($validationResults.Count -eq 0) {
        [void] $lines.Add('- No validation commands were supplied.')
    }
    else {
        foreach ($validationResult in $validationResults) {
            $resultLabel = if ($validationResult.ExitCode -eq 0) {
                'PASSED'
            }
            else {
                'FAILED'
            }

            $outputText = Get-TextOrFallback `
                -Value $validationResult.Output `
                -Fallback '(no output)'

            [void] $lines.Add("- $($validationResult.Command)")
            [void] $lines.Add("  - Result: $resultLabel")
            [void] $lines.Add("  - Exit code: $($validationResult.ExitCode)")
            [void] $lines.Add("  - Duration: $($validationResult.DurationMs) ms")
            [void] $lines.Add('  - Output:')
            [void] $lines.Add('~~~text')
            [void] $lines.Add($outputText)
            [void] $lines.Add('~~~')
        }
    }

    [void] $lines.Add('')

    [void] $lines.Add('Current Git status:')
    [void] $lines.Add('~~~text')
    [void] $lines.Add($statusText)
    [void] $lines.Add('~~~')
    [void] $lines.Add('')

    [void] $lines.Add('Changed tracked files:')
    [void] $lines.Add('~~~text')
    [void] $lines.Add($trackedText)
    [void] $lines.Add('~~~')
    [void] $lines.Add('')

    [void] $lines.Add('Staged files:')
    [void] $lines.Add('~~~text')
    [void] $lines.Add($stagedText)
    [void] $lines.Add('~~~')
    [void] $lines.Add('')

    [void] $lines.Add('Untracked files:')
    [void] $lines.Add('~~~text')
    [void] $lines.Add($untrackedText)
    [void] $lines.Add('~~~')
    [void] $lines.Add('')

    [void] $lines.Add('Recent Git history:')
    [void] $lines.Add('~~~text')
    [void] $lines.Add($recentText)
    [void] $lines.Add('~~~')
    [void] $lines.Add('')

    [void] $lines.Add('Known issues:')
    [void] $lines.Add($KnownIssues)
    [void] $lines.Add('')
    [void] $lines.Add('Requested next checkpoint:')
    [void] $lines.Add($NextCheckpoint)
    [void] $lines.Add('')
    [void] $lines.Add('Update 00 — Project Control and Checkpoint Tracker.')
    [void] $lines.Add('')
    [void] $lines.Add('Then:')
    [void] $lines.Add('')
    [void] $lines.Add('1. Reconcile this information against the uploaded approved specification.')
    [void] $lines.Add('2. Clearly distinguish verified facts from anything still unverified.')
    [void] $lines.Add('3. Update Current stable checkpoint, Last verified commands, Last verified commit, Next checkpoint, Known issues, and Deferred.')
    [void] $lines.Add('4. Determine whether the completed checkpoint is stable and ready to remain in Git history.')
    [void] $lines.Add('5. If the working tree is not clean, identify exactly what still needs review.')
    [void] $lines.Add('6. Check recent Git history so the requested checkpoint does not repeat committed work.')
    [void] $lines.Add('7. Prepare one bounded, copy/paste-ready Codex prompt for only the next checkpoint.')
    [void] $lines.Add('8. Do not assume browser behavior beyond the manual verification stated above.')
    [void] $lines.Add('9. Do not combine multiple checkpoints or add optional features prematurely.')

    $prompt = $lines -join [Environment]::NewLine

    Write-Host ''
    Write-Host '===== PROJECT TRACKER UPDATE =====' -ForegroundColor Cyan
    Write-Output $prompt

    if ($CopyToClipboard) {
        $clipboardCommand = Get-Command `
            -Name 'Set-Clipboard' `
            -ErrorAction SilentlyContinue

        if ($null -eq $clipboardCommand) {
            Write-Warning 'Set-Clipboard is unavailable in this PowerShell session.'
        }
        else {
            Set-Clipboard -Value $prompt
            Write-Host ''
            Write-Host 'Copied prompt to clipboard.' -ForegroundColor Green
        }
    }

    if (-not [string]::IsNullOrWhiteSpace($OutputPath)) {
        $resolvedOutputPath = if (
            [System.IO.Path]::IsPathRooted($OutputPath)
        ) {
            [System.IO.Path]::GetFullPath($OutputPath)
        }
        else {
            [System.IO.Path]::GetFullPath(
                (Join-Path $resolvedRepositoryPath $OutputPath)
            )
        }

        $outputDirectory = Split-Path -Parent $resolvedOutputPath

        if (
            -not [string]::IsNullOrWhiteSpace($outputDirectory) -and
            -not (Test-Path -LiteralPath $outputDirectory)
        ) {
            New-Item `
                -ItemType Directory `
                -Path $outputDirectory `
                -Force | Out-Null
        }

        Set-Content `
            -LiteralPath $resolvedOutputPath `
            -Value $prompt `
            -Encoding utf8NoBOM

        Write-Host ''
        Write-Host "Saved prompt to: $resolvedOutputPath" -ForegroundColor Green
    }

    if ($failedValidationCount -gt 0) {
        Write-Warning (
            '{0} validation command(s) failed. Review the generated prompt.' -f `
                $failedValidationCount
        )

        if ($FailOnValidationError) {
            exit 1
        }
    }
}
finally {
    Pop-Location
}
