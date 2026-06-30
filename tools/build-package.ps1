param(
    [string] $OutputPath = (Join-Path $PSScriptRoot '..\dist\pkg_treek.zip')
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

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$packageSource = Resolve-ExistingPath -Path (Join-Path $repoRoot 'pkg_treek') -Description 'Package source directory' -PathType Container
$pluginSource = Resolve-ExistingPath -Path (Join-Path $repoRoot 'src\plugin-ajax-treek') -Description 'AJAX plugin source directory' -PathType Container
$filePackageSource = Resolve-ExistingPath -Path (Join-Path $repoRoot 'src\file-treek-kunena') -Description 'Kunena file package source directory' -PathType Container
$overridesSource = Resolve-ExistingPath -Path (Join-Path $repoRoot 'src\kunena-overrides') -Description 'Kunena overrides source directory' -PathType Container
$templateSource = Resolve-ExistingPath -Path (Join-Path $repoRoot 'src\kunena-template\treek') -Description 'Kunena template source directory' -PathType Container

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('treek-package-build-' + [System.Guid]::NewGuid().ToString('N'))
$tempPackage = Join-Path $tempRoot 'pkg_treek'

New-Item -ItemType Directory -Path $tempPackage | Out-Null

try {
    Copy-Item -Path (Join-Path $packageSource '*') -Destination $tempPackage -Recurse -Force

    $tempPackagesDir = Join-Path $tempPackage 'packages'
    New-Item -ItemType Directory -Path $tempPackagesDir -Force | Out-Null

    & (Join-Path $PSScriptRoot 'build-plugin-ajax-treek.ps1') `
        -SourceDir $pluginSource `
        -OutputPath (Join-Path $tempPackagesDir 'plg_ajax_treek.zip')

    & (Join-Path $PSScriptRoot 'build-file-treek-kunena.ps1') `
        -SourceDir $filePackageSource `
        -OutputPath (Join-Path $tempPackagesDir 'file_treek_kunena.zip')

    $tempOverrides = Join-Path $tempPackage 'treek_resources\kunena_overrides'
    if (Test-Path -LiteralPath $tempOverrides) {
        Remove-Item -LiteralPath $tempOverrides -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempOverrides | Out-Null
    Copy-Item -Path (Join-Path $overridesSource '*') -Destination $tempOverrides -Recurse -Force

    $tempTemplate = Join-Path $tempPackage 'treek_resources\kunena_template\treek'
    if (Test-Path -LiteralPath $tempTemplate) {
        Remove-Item -LiteralPath $tempTemplate -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempTemplate | Out-Null
    Copy-Item -Path (Join-Path $templateSource '*') -Destination $tempTemplate -Recurse -Force

    & (Join-Path $PSScriptRoot 'verify-package.ps1') -PackageDir $tempPackage

    $outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
    $outputDir = Split-Path -Parent $outputFullPath

    if (-not (Test-Path -LiteralPath $outputDir)) {
        New-Item -ItemType Directory -Path $outputDir | Out-Null
    }

    if (Test-Path -LiteralPath $outputFullPath) {
        Remove-Item -LiteralPath $outputFullPath -Force
    }

    Compress-Archive -Path (Join-Path $tempPackage '*') -DestinationPath $outputFullPath -Force

    Assert-ZipHasEntry -ZipPath $outputFullPath -EntryName 'pkg_treek.xml'
    Assert-ZipHasEntry -ZipPath $outputFullPath -EntryName 'treek_install_script.php'
    Assert-ZipHasEntry -ZipPath $outputFullPath -EntryName 'packages/plg_ajax_treek.zip'
    Assert-ZipHasEntry -ZipPath $outputFullPath -EntryName 'packages/file_treek_kunena.zip'

    Write-Output "Built package ZIP: $outputFullPath"
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
