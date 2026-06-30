param(
    [string] $SourceDir = (Join-Path $PSScriptRoot '..\src\plugin-ajax-treek'),
    [string] $OutputPath = (Join-Path ([System.IO.Path]::GetTempPath()) 'plg_ajax_treek.zip')
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

function Assert-ManifestFileExists {
    param(
        [Parameter(Mandatory = $true)]
        [xml] $Manifest,

        [Parameter(Mandatory = $true)]
        [string] $Root
    )

    foreach ($filename in @($Manifest.extension.files.filename)) {
        $relativePath = [string] $filename.InnerText
        if ([string]::IsNullOrWhiteSpace($relativePath)) {
            continue
        }

        $path = Join-Path $Root $relativePath
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "Manifest file entry not found: $relativePath"
        }
    }

    foreach ($folder in @($Manifest.extension.files.folder)) {
        $relativePath = [string] $folder.InnerText
        if ([string]::IsNullOrWhiteSpace($relativePath)) {
            continue
        }

        $path = Join-Path $Root $relativePath
        if (-not (Test-Path -LiteralPath $path -PathType Container)) {
            throw "Manifest folder entry not found: $relativePath"
        }
    }

    $mediaNode = $Manifest.extension.media
    if ($mediaNode -ne $null) {
        $mediaFolder = [string] $mediaNode.GetAttribute('folder')
        $mediaRoot = Join-Path $Root $mediaFolder

        if (-not (Test-Path -LiteralPath $mediaRoot -PathType Container)) {
            throw "Manifest media folder not found: $mediaFolder"
        }

        foreach ($folder in @($mediaNode.SelectNodes('folder'))) {
            $relativePath = [string] $folder.InnerText
            if ([string]::IsNullOrWhiteSpace($relativePath)) {
                continue
            }

            $path = Join-Path $mediaRoot $relativePath
            if (-not (Test-Path -LiteralPath $path -PathType Container)) {
                throw "Manifest media subfolder not found: $mediaFolder/$relativePath"
            }
        }
    }
}

function Assert-ZipHasEntry {
    param(
        [Parameter(Mandatory = $true)]
        [string] $ZipPath,

        [Parameter(Mandatory = $true)]
        [string] $EntryName
    )

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        if ($archive.GetEntry($EntryName) -eq $null) {
            throw "Built ZIP does not contain expected entry: $EntryName"
        }
    } finally {
        $archive.Dispose()
    }
}

function Add-ZipDirectoryEntry {
    param(
        [Parameter(Mandatory = $true)]
        [System.IO.Compression.ZipArchive] $Archive,

        [Parameter(Mandatory = $true)]
        [string] $EntryName
    )

    $normalizedName = $EntryName.TrimEnd('/') + '/'
    $Archive.CreateEntry($normalizedName) | Out-Null
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

$sourceRoot = Resolve-ExistingPath -Path $SourceDir -Description 'Plugin source directory'
$manifestPath = Resolve-ExistingPath -Path (Join-Path $sourceRoot 'treek.xml') -Description 'Plugin manifest'

[xml] $manifest = Get-Content -LiteralPath $manifestPath -Raw

if ($manifest.extension -eq $null) {
    throw 'Plugin manifest has no <extension> root.'
}

if ([string] $manifest.extension.type -ne 'plugin') {
    throw "Plugin manifest type is not plugin: $($manifest.extension.type)"
}

if ([string] $manifest.extension.group -ne 'ajax') {
    throw "Plugin manifest group is not ajax: $($manifest.extension.group)"
}

Assert-ManifestFileExists -Manifest $manifest -Root $sourceRoot

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
    Add-ZipFileEntry -Archive $archive -SourceFile (Join-Path $sourceRoot 'treek.xml') -EntryName 'treek.xml'
    Add-ZipFileEntry -Archive $archive -SourceFile (Join-Path $sourceRoot 'treek.php') -EntryName 'treek.php'

    Add-ZipDirectoryTree -Archive $archive -SourceDir (Join-Path $sourceRoot 'language') -EntryRoot 'language'
    Add-ZipDirectoryTree -Archive $archive -SourceDir (Join-Path $sourceRoot 'media') -EntryRoot 'media'
    Add-ZipDirectoryTree -Archive $archive -SourceDir (Join-Path $sourceRoot 'src') -EntryRoot 'src'
} finally {
    $archive.Dispose()
}

Assert-ZipHasEntry -ZipPath $outputFullPath -EntryName 'treek.xml'
Assert-ZipHasEntry -ZipPath $outputFullPath -EntryName 'treek.php'

Write-Output "Built plugin ZIP: $outputFullPath"
