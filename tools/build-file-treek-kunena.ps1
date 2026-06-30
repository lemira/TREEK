param(
    [string] $SourceDir = (Join-Path $PSScriptRoot '..\src\file-treek-kunena'),
    [string] $OutputPath = (Join-Path ([System.IO.Path]::GetTempPath()) 'file_treek_kunena.zip')
)

$ErrorActionPreference = 'Stop'

function Resolve-ExistingPath {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Path,

        [Parameter(Mandatory = $true)]
        [string] $Description,

        [ValidateSet('Any', 'Leaf', 'Container')]
        [string] $PathType = 'Any'
    )

    $testPathType = if ($PathType -eq 'Any') { @{} } else { @{ PathType = $PathType } }

    if (-not (Test-Path -LiteralPath $Path @testPathType)) {
        throw "$Description not found: $Path"
    }

    return (Resolve-Path -LiteralPath $Path).Path
}

function Add-ZipDirectoryEntry {
    param(
        [Parameter(Mandatory = $true)]
        [System.IO.Compression.ZipArchive] $Archive,

        [Parameter(Mandatory = $true)]
        [string] $EntryName
    )

    $Archive.CreateEntry($EntryName.TrimEnd('/') + '/') | Out-Null
}

function Add-ZipFileEntry {
    param(
        [Parameter(Mandatory = $true)]
        [System.IO.Compression.ZipArchive] $Archive,

        [Parameter(Mandatory = $true)]
        [string] $SourceFile,

        [Parameter(Mandatory = $true)]
        [string] $EntryName
    )

    $normalizedName = $EntryName -replace '\\', '/'
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($Archive, $SourceFile, $normalizedName) | Out-Null
}

function Get-RelativeZipPath {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Root,

        [Parameter(Mandatory = $true)]
        [string] $Path
    )

    $rootFullPath = [System.IO.Path]::GetFullPath($Root).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    $pathFullPath = [System.IO.Path]::GetFullPath($Path)

    if (-not $pathFullPath.StartsWith($rootFullPath, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path is not inside root: $Path"
    }

    return $pathFullPath.Substring($rootFullPath.Length) -replace '\\', '/'
}

function Add-ZipDirectoryTree {
    param(
        [Parameter(Mandatory = $true)]
        [System.IO.Compression.ZipArchive] $Archive,

        [Parameter(Mandatory = $true)]
        [string] $SourceDir,

        [Parameter(Mandatory = $true)]
        [string] $EntryRoot
    )

    Add-ZipDirectoryEntry -Archive $Archive -EntryName $EntryRoot

    $directories = Get-ChildItem -LiteralPath $SourceDir -Directory -Recurse | Sort-Object FullName
    foreach ($directory in $directories) {
        $relative = Get-RelativeZipPath -Root $SourceDir -Path $directory.FullName
        Add-ZipDirectoryEntry -Archive $Archive -EntryName ($EntryRoot.TrimEnd('/') + '/' + $relative)
    }

    $files = Get-ChildItem -LiteralPath $SourceDir -File -Recurse | Sort-Object FullName
    foreach ($file in $files) {
        $relative = Get-RelativeZipPath -Root $SourceDir -Path $file.FullName
        Add-ZipFileEntry -Archive $Archive -SourceFile $file.FullName -EntryName ($EntryRoot.TrimEnd('/') + '/' + $relative)
    }
}

$sourceRoot = Resolve-ExistingPath -Path $SourceDir -Description 'File package source directory' -PathType Container
$manifestPath = Resolve-ExistingPath -Path (Join-Path $sourceRoot 'file_treek_kunena.xml') -Description 'File package manifest' -PathType Leaf
$rootDir = Resolve-ExistingPath -Path (Join-Path $sourceRoot 'root') -Description 'File package root directory' -PathType Container

[xml] $manifest = Get-Content -LiteralPath $manifestPath -Raw

if ($manifest.extension -eq $null) {
    throw 'File package manifest has no <extension> root.'
}

if ([string] $manifest.extension.type -ne 'file') {
    throw "File package manifest type is not file: $($manifest.extension.type)"
}

$filesetNodes = @($manifest.extension.fileset.files)
foreach ($filesNode in $filesetNodes) {
    $folderRoot = [string] $filesNode.GetAttribute('folder')
    Resolve-ExistingPath -Path (Join-Path $sourceRoot $folderRoot) -Description 'Manifest fileset folder' -PathType Container | Out-Null

    foreach ($folder in @($filesNode.SelectNodes('folder'))) {
        $relativePath = [string] $folder.InnerText
        if ([string]::IsNullOrWhiteSpace($relativePath)) {
            continue
        }

        Resolve-ExistingPath -Path (Join-Path (Join-Path $sourceRoot $folderRoot) $relativePath) -Description 'Manifest fileset subfolder' -PathType Container | Out-Null
    }
}

$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
$outputDir = Split-Path -Parent $outputFullPath

if (-not (Test-Path -LiteralPath $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

if (Test-Path -LiteralPath $outputFullPath) {
    Remove-Item -LiteralPath $outputFullPath -Force
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$archive = [System.IO.Compression.ZipFile]::Open($outputFullPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    Add-ZipFileEntry -Archive $archive -SourceFile $manifestPath -EntryName 'file_treek_kunena.xml'
    Add-ZipDirectoryTree -Archive $archive -SourceDir $rootDir -EntryRoot 'root'
} finally {
    $archive.Dispose()
}

Write-Output "Built file package ZIP: $outputFullPath"

