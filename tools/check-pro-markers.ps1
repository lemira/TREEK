param(
    [string] $Root = (Join-Path $PSScriptRoot '..\src')
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

function New-MarkerRecord {
    param(
        [Parameter(Mandatory = $true)]
        [string] $File,

        [Parameter(Mandatory = $true)]
        [int] $Line,

        [Parameter(Mandatory = $true)]
        [string] $Type,

        [Parameter(Mandatory = $true)]
        [string] $Name
    )

    return [pscustomobject]@{
        File = $File
        Line = $Line
        Type = $Type
        Name = $Name
    }
}

$rootPath = Resolve-ExistingPath -Path $Root -Description 'Marker check root'
$errors = New-Object System.Collections.Generic.List[string]
$markerCounts = @{}
$filesChecked = 0

$files = Get-ChildItem -LiteralPath $rootPath -File -Recurse |
    Where-Object {
        $_.Extension -in @('.js', '.php', '.xml', '.css', '.scss', '.ini', '.md')
    } |
    Sort-Object FullName

foreach ($file in $files) {
    $filesChecked++
    $stack = New-Object System.Collections.Generic.Stack[object]
    $lineNo = 0

    foreach ($line in Get-Content -LiteralPath $file.FullName) {
        $lineNo++

        if ($line -match 'TREEK-PRO-(START|END):\s*([a-z0-9_]+)') {
            $type = $matches[1]
            $name = $matches[2]

            if (-not $markerCounts.ContainsKey($name)) {
                $markerCounts[$name] = [pscustomobject]@{
                    Start = 0
                    End = 0
                }
            }

            if ($type -eq 'START') {
                $markerCounts[$name].Start++
                $stack.Push((New-MarkerRecord -File $file.FullName -Line $lineNo -Type $type -Name $name))
                continue
            }

            $markerCounts[$name].End++

            if ($stack.Count -eq 0) {
                $errors.Add("END without START: $($file.FullName):$lineNo ($name)")
                continue
            }

            $start = $stack.Pop()
            if ($start.Name -ne $name) {
                $errors.Add("Mismatched marker: $($file.FullName):$lineNo expected END $($start.Name), got END $name; START was at $($start.File):$($start.Line)")
            }
        }
    }

    while ($stack.Count -gt 0) {
        $start = $stack.Pop()
        $errors.Add("START without END: $($start.File):$($start.Line) ($($start.Name))")
    }
}

foreach ($name in ($markerCounts.Keys | Sort-Object)) {
    if ($markerCounts[$name].Start -ne $markerCounts[$name].End) {
        $errors.Add("Marker count mismatch for ${name}: START=$($markerCounts[$name].Start), END=$($markerCounts[$name].End)")
    }
}

if ($errors.Count -gt 0) {
    $errors | ForEach-Object { Write-Error $_ }
    throw "Pro marker check failed with $($errors.Count) error(s)."
}

Write-Output "Checked $filesChecked file(s). Pro marker pairs are valid."

foreach ($name in ($markerCounts.Keys | Sort-Object)) {
    Write-Output ("{0}: {1} pair(s)" -f $name, $markerCounts[$name].Start)
}
