param(
    [Parameter(Mandatory = $true)]
    [string] $SourceRoot,

    [Parameter(Mandatory = $true)]
    [string] $DestinationRoot
)

$ErrorActionPreference = 'Stop'

function Resolve-ExistingPath {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Description
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        throw "$Description not found: $Path"
    }

    return (Resolve-Path -LiteralPath $Path).Path
}

function Get-MarkerFiles {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Root
    )

    return Get-ChildItem -LiteralPath $Root -File -Recurse |
        Where-Object {
            $_.Extension -in @('.js', '.php', '.xml', '.css', '.scss', '.ini', '.md')
        } |
        Sort-Object FullName
}

function Strip-ProBlocksFromFile {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path
    )

    $lines = Get-Content -LiteralPath $Path
    $output = New-Object System.Collections.Generic.List[string]
    $stack = New-Object System.Collections.Generic.Stack[object]
    $lineNo = 0
    $removedLines = 0

    foreach ($line in $lines) {
        $lineNo++

        if ($line -match 'TREEK-PRO-(START|END):\s*([a-z0-9_]+)') {
            $type = $matches[1]
            $name = $matches[2]

            if ($type -eq 'START') {
                $stack.Push([pscustomobject]@{
                    Name = $name
                    Line = $lineNo
                })
                $removedLines++
                continue
            }

            if ($stack.Count -eq 0) {
                throw "END without START: ${Path}:${lineNo} ($name)"
            }

            $start = $stack.Pop()
            if ($start.Name -ne $name) {
                throw "Mismatched marker: ${Path}:${lineNo} expected END $($start.Name), got END $name; START was at line $($start.Line)"
            }

            $removedLines++
            continue
        }

        if ($stack.Count -gt 0) {
            $removedLines++
            continue
        }

        $output.Add($line)
    }

    if ($stack.Count -gt 0) {
        $start = $stack.Pop()
        throw "START without END: ${Path}:$($start.Line) ($($start.Name))"
    }

    if ($removedLines -gt 0) {
        Set-Content -LiteralPath $Path -Value $output -Encoding UTF8
    }

    return $removedLines
}

$sourcePath = Resolve-ExistingPath -Path $SourceRoot -Description 'Source root'
$destinationFullPath = [System.IO.Path]::GetFullPath($DestinationRoot)

if (Test-Path -LiteralPath $destinationFullPath) {
    throw "Destination root already exists: $destinationFullPath"
}

$destinationParent = Split-Path -Parent $destinationFullPath
if (-not (Test-Path -LiteralPath $destinationParent)) {
    New-Item -ItemType Directory -Path $destinationParent | Out-Null
}

Copy-Item -LiteralPath $sourcePath -Destination $destinationFullPath -Recurse

$filesChanged = 0
$linesRemoved = 0

foreach ($file in Get-MarkerFiles -Root $destinationFullPath) {
    $removed = Strip-ProBlocksFromFile -Path $file.FullName

    if ($removed -gt 0) {
        $filesChanged++
        $linesRemoved += $removed
    }
}

Write-Output "Created Free source tree: $destinationFullPath"
Write-Output "Stripped Pro blocks from $filesChanged file(s), removed $linesRemoved line(s)."
