#requires -Version 7.0
<#
.SYNOPSIS
Runs syntax and edge-case tests for New-ProjectTrackerUpdate.ps1.
#>

[CmdletBinding()]
param(
    [Parameter()]
    [ValidateNotNullOrEmpty()]
    [string] $ScriptPath = (
        Join-Path $PSScriptRoot 'New-ProjectTrackerUpdate.ps1'
    ),

    [Parameter()]
    [switch] $KeepTestRepository
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $false

function Assert-True {
    param(
        [Parameter(Mandatory)]
        [bool] $Condition,

        [Parameter(Mandatory)]
        [string] $Message
    )

    if (-not $Condition) {
        throw "ASSERTION FAILED: $Message"
    }
}

function Invoke-Git {
    param(
        [Parameter(Mandatory)]
        [string[]] $Arguments
    )

    $output = & git @Arguments 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        throw "git $($Arguments -join ' ') failed:`n$($output | Out-String)"
    }

    return (($output | Out-String).Trim())
}

$resolvedScriptPath = (Resolve-Path -LiteralPath $ScriptPath).Path

Write-Host '1. Parsing script...' -ForegroundColor Cyan

$tokens = $null
$parseErrors = $null

[System.Management.Automation.Language.Parser]::ParseFile(
    $resolvedScriptPath,
    [ref] $tokens,
    [ref] $parseErrors
) | Out-Null

if ($parseErrors.Count -gt 0) {
    $parseErrors |
        Format-Table Message, @{
            Name = 'Line'
            Expression = { $_.Extent.StartLineNumber }
        }, @{
            Name = 'Text'
            Expression = { $_.Extent.Text }
        } -AutoSize

    throw 'PowerShell parser errors were found.'
}

Write-Host '   PASS: syntax is valid.' -ForegroundColor Green

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) (
    'ProjectTrackerTest-{0}' -f ([guid]::NewGuid().ToString('N'))
)

New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null

try {
    Push-Location -LiteralPath $tempRoot

    Write-Host '2. Creating temporary Git repository...' -ForegroundColor Cyan

    Invoke-Git -Arguments @('init', '--initial-branch=main') | Out-Null
    Invoke-Git -Arguments @('config', 'user.name', 'Project Tracker Test') | Out-Null
    Invoke-Git -Arguments @('config', 'user.email', 'tracker-test@example.invalid') | Out-Null

    Set-Content -LiteralPath 'README.md' -Value '# Temporary tracker test' -Encoding utf8NoBOM
    Invoke-Git -Arguments @('add', 'README.md') | Out-Null
    Invoke-Git -Arguments @('commit', '-m', 'test: initialize temporary repository') | Out-Null

    $beforeStatus = Invoke-Git -Arguments @('status', '--porcelain')

    Write-Host '3. Testing special-character arguments...' -ForegroundColor Cyan

    $checkpoint = @'
Checkpoint "quotes", apostrophe's, $dollar, `backtick, & ampersand,
| pipe; semicolon: colon, (parentheses), [brackets], {braces},
Unicode: café — résumé — 中文 — emoji 🚀
'@.Trim()

    $browser = @'
Rendered text: "Bedtime Story Tracker"
Path-like text: C:\repo\demo
PowerShell-looking text: $(Get-Date), ${HOME}, `$literal
Markdown: **bold**, `inline code`, [link](https://example.invalid)
Second line with <tags> & symbols.
'@.Trim()

    $knownIssues = @'
Issue 1: None currently reported.
Issue 2: Text includes "double quotes" and user's apostrophe.
'@.Trim()

    $nextCheckpoint = @'
Add timer: start → update → stop; preserve 00:05 and clean up interval.
Do not add routing, Redux/Zustand, or backend APIs.
'@.Trim()

    $outputPath = Join-Path $tempRoot 'tracker-output.md'

    $result = & $resolvedScriptPath `
        -RepositoryPath $tempRoot `
        -Checkpoint $checkpoint `
        -BrowserVerification $browser `
        -KnownIssues $knownIssues `
        -PushStatus 'Succeeded (test only)' `
        -NextCheckpoint $nextCheckpoint `
        -ValidationCommand @(
            'Write-Output ''validation "quotes" $literal & pipe | text''',
            'exit 0'
        ) `
        -RecentCommitCount 8 `
        -OutputPath $outputPath 2>&1

    $exitCode = $LASTEXITCODE

    Assert-True `
        -Condition ($exitCode -eq 0) `
        -Message "Expected exit code 0; received $exitCode. Output: $($result | Out-String)"

    Assert-True `
        -Condition (Test-Path -LiteralPath $outputPath -PathType Leaf) `
        -Message 'Expected output Markdown file was not created.'

    $outputText = Get-Content -LiteralPath $outputPath -Raw

    Assert-True -Condition ($outputText.Contains($checkpoint)) -Message 'Checkpoint text was not preserved.'
    Assert-True -Condition ($outputText.Contains($browser)) -Message 'Browser text was not preserved.'
    Assert-True -Condition ($outputText.Contains($knownIssues)) -Message 'Known-issues text was not preserved.'
    Assert-True -Condition ($outputText.Contains($nextCheckpoint)) -Message 'Next-checkpoint text was not preserved.'
    Assert-True -Condition ($outputText.Contains('No origin remote configured')) -Message 'Missing-origin state was not reported.'
    Assert-True -Condition ($outputText.Contains('PASSED')) -Message 'Successful validation was not reported.'
    Assert-True -Condition ($outputText.Contains('🚀')) -Message 'Unicode/emoji text was not preserved.'

    Write-Host '   PASS: special-character and multiline inputs were preserved.' -ForegroundColor Green

    Write-Host '4. Testing failed-validation reporting...' -ForegroundColor Cyan

    $failedOutputPath = Join-Path $tempRoot 'tracker-output-failed-validation.md'

    $failedResult = & $resolvedScriptPath `
        -RepositoryPath $tempRoot `
        -Checkpoint 'Failed validation test' `
        -BrowserVerification 'Not applicable' `
        -KnownIssues 'Intentional validation failure' `
        -PushStatus 'Not pushed' `
        -NextCheckpoint 'Fix validation' `
        -ValidationCommand @(
            'Write-Error ''intentional failure''; exit 7'
        ) `
        -OutputPath $failedOutputPath 2>&1

    Assert-True `
        -Condition (Test-Path -LiteralPath $failedOutputPath -PathType Leaf) `
        -Message 'Failed-validation output file was not created.'

    $failedOutputText = Get-Content -LiteralPath $failedOutputPath -Raw

    Assert-True -Condition ($failedOutputText.Contains('FAILED')) -Message 'Failed validation was not reported.'
    Assert-True -Condition ($failedOutputText.Contains('Exit code: 7')) -Message 'Failed exit code was not preserved.'

    Write-Host '   PASS: validation failures were reported without terminating by default.' -ForegroundColor Green

    Write-Host '5. Confirming repository was not modified...' -ForegroundColor Cyan

    Remove-Item -LiteralPath $outputPath, $failedOutputPath -Force

    $afterStatus = Invoke-Git -Arguments @('status', '--porcelain')

    Assert-True `
        -Condition ($beforeStatus -eq $afterStatus) `
        -Message "Repository status changed. Before='$beforeStatus'; After='$afterStatus'."

    Write-Host '   PASS: tracker did not modify repository state.' -ForegroundColor Green
    Write-Host ''
    Write-Host 'ALL TESTS PASSED' -ForegroundColor Green
}
finally {
    Pop-Location

    if ($KeepTestRepository) {
        Write-Host "Temporary repository retained at: $tempRoot" -ForegroundColor Yellow
    }
    elseif (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
