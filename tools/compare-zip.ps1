param(
    [Parameter(Mandatory = $true)]
    [string] $ReferenceZip,

    [Parameter(Mandatory = $true)]
    [string] $CandidateZip
)

$ErrorActionPreference = 'Stop'

function Resolve-ExistingPath {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Description
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Description not found: $Path"
    }

    return (Resolve-Path -LiteralPath $Path).Path
}

function Get-ZipEntryRows {
    param(
        [Parameter(Mandatory = $true)]
        [string] $ZipPath
    )

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        $sha = [System.Security.Cryptography.SHA256]::Create()
        $rows = @()

        foreach ($entry in $archive.Entries) {
            $normalizedName = $entry.FullName -replace '\\', '/'
            $isDirectory = $normalizedName.EndsWith('/')
            $hash = $null

            if (-not $isDirectory) {
                $stream = $entry.Open()
                try {
                    $hash = [System.BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()
                } finally {
                    $stream.Dispose()
                }
            }

            $rows += [pscustomobject] @{
                Name = $normalizedName
                IsDirectory = $isDirectory
                Length = $entry.Length
                Hash = $hash
            }
        }

        return $rows | Sort-Object Name
    } finally {
        $archive.Dispose()
    }
}

$referencePath = Resolve-ExistingPath -Path $ReferenceZip -Description 'Reference ZIP'
$candidatePath = Resolve-ExistingPath -Path $CandidateZip -Description 'Candidate ZIP'

$referenceRows = @(Get-ZipEntryRows -ZipPath $referencePath)
$candidateRows = @(Get-ZipEntryRows -ZipPath $candidatePath)

$referenceNames = @($referenceRows | ForEach-Object { $_.Name })
$candidateNames = @($candidateRows | ForEach-Object { $_.Name })

$missingInCandidate = @($referenceNames | Where-Object { $candidateNames -notcontains $_ })
$extraInCandidate = @($candidateNames | Where-Object { $referenceNames -notcontains $_ })

$contentDifferences = @()
foreach ($referenceRow in $referenceRows | Where-Object { -not $_.IsDirectory }) {
    $candidateRow = $candidateRows | Where-Object { $_.Name -eq $referenceRow.Name } | Select-Object -First 1

    if ($candidateRow -eq $null) {
        continue
    }

    if ($candidateRow.IsDirectory -ne $referenceRow.IsDirectory -or
        $candidateRow.Length -ne $referenceRow.Length -or
        $candidateRow.Hash -ne $referenceRow.Hash) {
        $contentDifferences += [pscustomobject] @{
            Name = $referenceRow.Name
            ReferenceLength = $referenceRow.Length
            CandidateLength = $candidateRow.Length
            ReferenceHash = $referenceRow.Hash
            CandidateHash = $candidateRow.Hash
        }
    }
}

Write-Output "Reference ZIP: $referencePath"
Write-Output "Candidate ZIP: $candidatePath"
Write-Output "reference entries=$($referenceRows.Count)"
Write-Output "candidate entries=$($candidateRows.Count)"
Write-Output "missing in candidate=$($missingInCandidate.Count)"

foreach ($name in $missingInCandidate) {
    Write-Output "  - $name"
}

Write-Output "extra in candidate=$($extraInCandidate.Count)"

foreach ($name in $extraInCandidate) {
    Write-Output "  + $name"
}

Write-Output "content differences=$($contentDifferences.Count)"

foreach ($difference in $contentDifferences) {
    Write-Output "  * $($difference.Name)"
}

if ($missingInCandidate.Count -gt 0 -or $extraInCandidate.Count -gt 0 -or $contentDifferences.Count -gt 0) {
    throw 'ZIP comparison failed.'
}

Write-Output 'ZIP comparison passed.'

