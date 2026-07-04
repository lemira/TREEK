param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Free', 'Pro')]
    [string] $Edition,

    [Parameter(Mandatory = $true)]
    [string] $OutputPath
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

function Set-PackageUpdateServer {
    param(
        [Parameter(Mandatory = $true)]
        [string] $ManifestPath,

        [Parameter(Mandatory = $true)]
        [ValidateSet('Free', 'Pro')]
        [string] $Edition
    )

    $serverName = if ($Edition -eq 'Free') { 'TreeK Free Updates' } else { 'TreeK Pro Updates' }
    $serverUrl = if ($Edition -eq 'Free') {
        'https://raw.githubusercontent.com/lemira/TREEK/main/updates/treek-free.xml'
    } else {
        'https://treek.support/updates/treek-pro.xml'
    }

    $updateservers = @"
    <updateservers>
        <server type="extension" priority="1" name="$serverName">$serverUrl</server>
    </updateservers>
"@

    $content = Get-Content -LiteralPath $ManifestPath -Raw

    if ($content -match '(?s)\s*<updateservers>.*?</updateservers>') {
        $content = [regex]::Replace($content, '(?s)\s*<updateservers>.*?</updateservers>', "`r`n$updateservers", 1)
    } else {
        $content = $content -replace '\s*</extension>\s*$', "`r`n$updateservers`r`n`r`n</extension>`r`n"
    }

    Set-Content -LiteralPath $ManifestPath -Value $content -Encoding utf8
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
        $normalizedEntryName = $EntryName -replace '\\', '/'
        $entryNames = @($archive.Entries | ForEach-Object { $_.FullName -replace '\\', '/' })

        if ($entryNames -notcontains $normalizedEntryName) {
            throw "Built package ZIP does not contain expected entry: $EntryName"
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

function Compress-DirectoryForJoomla {
    param(
        [Parameter(Mandatory = $true)]
        [string] $SourceDir,

        [Parameter(Mandatory = $true)]
        [string] $OutputPath
    )

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $archive = [System.IO.Compression.ZipFile]::Open($OutputPath, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        $directories = Get-ChildItem -LiteralPath $SourceDir -Directory -Recurse | Sort-Object FullName
        foreach ($directory in $directories) {
            $relative = Get-RelativeZipPath -Root $SourceDir -Path $directory.FullName
            Add-ZipDirectoryEntry -Archive $archive -EntryName $relative
        }

        $files = Get-ChildItem -LiteralPath $SourceDir -File -Recurse | Sort-Object FullName
        foreach ($file in $files) {
            $relative = Get-RelativeZipPath -Root $SourceDir -Path $file.FullName
            Add-ZipFileEntry -Archive $archive -SourceFile $file.FullName -EntryName $relative
        }
    } finally {
        $archive.Dispose()
    }
}

function Assert-NoProMarkersInZip {
    param(
        [Parameter(Mandatory = $true)]
        [string] $ZipPath
    )

    Add-Type -AssemblyName System.IO.Compression
    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        foreach ($entry in $archive.Entries) {
            if ($entry.FullName -notmatch '\.(js|php|xml|css|scss|ini|md)$') {
                continue
            }

            $reader = New-Object System.IO.StreamReader($entry.Open())
            try {
                $content = $reader.ReadToEnd()
            } finally {
                $reader.Dispose()
            }

            if ($content -match 'TREEK-PRO-(START|END)') {
                throw "Free package contains Pro marker in ZIP entry: $($entry.FullName)"
            }
        }
    } finally {
        $archive.Dispose()
    }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$toolsRoot = Resolve-ExistingPath -Path (Join-Path $repoRoot 'tools') -Description 'Tools directory' -PathType Container
$sourceRoot = Resolve-ExistingPath -Path (Join-Path $repoRoot 'src') -Description 'Source directory' -PathType Container

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('treek-edition-build-' + [System.Guid]::NewGuid().ToString('N'))
$buildSourceRoot = $sourceRoot

New-Item -ItemType Directory -Path $tempRoot | Out-Null

try {
    if ($Edition -eq 'Free') {
        $buildSourceRoot = Join-Path $tempRoot 'src-free'
        & (Join-Path $toolsRoot 'strip-pro-blocks.ps1') -SourceRoot $sourceRoot -DestinationRoot $buildSourceRoot
    }

    $packageSource = Resolve-ExistingPath -Path (Join-Path $buildSourceRoot 'package') -Description 'Package source directory' -PathType Container
    $pluginSource = Resolve-ExistingPath -Path (Join-Path $buildSourceRoot 'plugin-ajax-treek') -Description 'AJAX plugin source directory' -PathType Container
    $filePackageSource = Resolve-ExistingPath -Path (Join-Path $buildSourceRoot 'file-treek-kunena') -Description 'Kunena file package source directory' -PathType Container
    $overridesSource = Resolve-ExistingPath -Path (Join-Path $buildSourceRoot 'kunena-overrides') -Description 'Kunena overrides source directory' -PathType Container
    $templateSource = Resolve-ExistingPath -Path (Join-Path $buildSourceRoot 'kunena-template\treek') -Description 'Kunena template source directory' -PathType Container

    $tempPackage = Join-Path $tempRoot 'pkg_treek'
    New-Item -ItemType Directory -Path $tempPackage | Out-Null

    $tempPackageManifest = Join-Path $tempPackage 'pkg_treek.xml'
    Copy-Item -LiteralPath (Join-Path $packageSource 'pkg_treek.xml') -Destination $tempPackageManifest -Force
    Set-PackageUpdateServer -ManifestPath $tempPackageManifest -Edition $Edition
    Copy-Item -LiteralPath (Join-Path $packageSource 'treek_install_script.php') -Destination $tempPackage -Force
    Copy-Item -LiteralPath (Join-Path $packageSource 'language') -Destination $tempPackage -Recurse -Force

    $tempPackagesDir = Join-Path $tempPackage 'packages'
    New-Item -ItemType Directory -Path $tempPackagesDir -Force | Out-Null

    & (Join-Path $toolsRoot 'build-plugin-ajax-treek.ps1') `
        -SourceDir $pluginSource `
        -OutputPath (Join-Path $tempPackagesDir 'plg_ajax_treek.zip')

    & (Join-Path $toolsRoot 'build-file-treek-kunena.ps1') `
        -SourceDir $filePackageSource `
        -OutputPath (Join-Path $tempPackagesDir 'file_treek_kunena.zip')

    $tempOverrides = Join-Path $tempPackage 'treek_resources\kunena_overrides'
    New-Item -ItemType Directory -Path $tempOverrides | Out-Null
    Get-ChildItem -LiteralPath $overridesSource -File |
        Where-Object { $_.Name -ne 'README.md' } |
        ForEach-Object {
            Copy-Item -LiteralPath $_.FullName -Destination $tempOverrides -Force
        }

    $tempTemplate = Join-Path $tempPackage 'treek_resources\kunena_template\treek'
    New-Item -ItemType Directory -Path $tempTemplate | Out-Null
    Copy-Item -Path (Join-Path $templateSource '*') -Destination $tempTemplate -Recurse -Force

    & (Join-Path $toolsRoot 'verify-package.ps1') -PackageDir $tempPackage

    $outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
    $outputDir = Split-Path -Parent $outputFullPath

    if (-not (Test-Path -LiteralPath $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir | Out-Null
    }

    if (Test-Path -LiteralPath $outputFullPath) {
        Remove-Item -LiteralPath $outputFullPath -Force
    }

    Compress-DirectoryForJoomla -SourceDir $tempPackage -OutputPath $outputFullPath

    Assert-ZipHasEntry -ZipPath $outputFullPath -EntryName 'pkg_treek.xml'
    Assert-ZipHasEntry -ZipPath $outputFullPath -EntryName 'treek_install_script.php'
    Assert-ZipHasEntry -ZipPath $outputFullPath -EntryName 'packages/plg_ajax_treek.zip'
    Assert-ZipHasEntry -ZipPath $outputFullPath -EntryName 'packages/file_treek_kunena.zip'

    if ($Edition -eq 'Free') {
        Assert-NoProMarkersInZip -ZipPath $outputFullPath
    }

    Write-Output "Built TreeK $Edition package ZIP: $outputFullPath"
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
