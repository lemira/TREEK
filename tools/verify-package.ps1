param(
    [string] $PackageDir = (Join-Path $PSScriptRoot '..\pkg_treek')
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

function Assert-ZipHasXmlManifest {
    param(
        [Parameter(Mandatory = $true)]
        [string] $ZipPath,

        [Parameter(Mandatory = $true)]
        [string] $ExpectedManifest
    )

    Add-Type -AssemblyName System.IO.Compression.FileSystem

    $archive = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        $entryNames = @($archive.Entries | ForEach-Object { $_.FullName })

        if ($entryNames.Count -eq 0) {
            throw "ZIP archive is empty: $ZipPath"
        }

        if ($entryNames -notcontains $ExpectedManifest) {
            throw "ZIP archive $ZipPath does not contain expected manifest: $ExpectedManifest"
        }

        $manifestEntry = $archive.GetEntry($ExpectedManifest)
        $reader = New-Object System.IO.StreamReader($manifestEntry.Open())
        try {
            [xml] $manifestXml = $reader.ReadToEnd()
        } finally {
            $reader.Dispose()
        }

        if ($manifestXml.extension -eq $null) {
            throw "Nested manifest has no <extension> root: $ExpectedManifest"
        }
    } finally {
        $archive.Dispose()
    }
}

$packageRoot = Resolve-ExistingPath -Path $PackageDir -Description 'Package directory'
$manifestPath = Resolve-ExistingPath -Path (Join-Path $packageRoot 'pkg_treek.xml') -Description 'Package manifest'

[xml] $manifest = Get-Content -LiteralPath $manifestPath -Raw

if ($manifest.extension -eq $null) {
    throw 'Package manifest has no <extension> root.'
}

if ([string] $manifest.extension.type -ne 'package') {
    throw "Package manifest type is not package: $($manifest.extension.type)"
}

$scriptFile = [string] $manifest.extension.scriptfile
if ([string]::IsNullOrWhiteSpace($scriptFile)) {
    throw 'Package manifest does not define <scriptfile>.'
}

Resolve-ExistingPath -Path (Join-Path $packageRoot $scriptFile) -Description 'Install script' | Out-Null

$languageNodes = @($manifest.extension.languages.language)
foreach ($language in $languageNodes) {
    $languagesFolder = [string] $language.ParentNode.folder
    $relativePath = [string] $language.InnerText
    Resolve-ExistingPath -Path (Join-Path (Join-Path $packageRoot $languagesFolder) $relativePath) -Description 'Language file' | Out-Null
}

$nestedPackageExpectations = @{
    'plg_ajax_treek.zip' = 'treek.xml'
    'file_treek_kunena.zip' = 'file_treek_kunena.xml'
}

$fileGroups = @($manifest.extension.files)
foreach ($fileGroup in $fileGroups) {
    $folder = [string] $fileGroup.folder
    foreach ($fileNode in @($fileGroup.file)) {
        $fileName = [string] $fileNode.InnerText
        $nestedPath = Resolve-ExistingPath -Path (Join-Path (Join-Path $packageRoot $folder) $fileName) -Description 'Nested package'

        if ($nestedPackageExpectations.ContainsKey($fileName)) {
            Assert-ZipHasXmlManifest -ZipPath $nestedPath -ExpectedManifest $nestedPackageExpectations[$fileName]
        }
    }
}

$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ('treek-package-verify-' + [System.Guid]::NewGuid().ToString('N'))
$tempZip = Join-Path $tempRoot 'pkg_treek.zip'

New-Item -ItemType Directory -Path $tempRoot | Out-Null
try {
    Compress-Archive -Path (Join-Path $packageRoot '*') -DestinationPath $tempZip -Force
    Assert-ZipHasXmlManifest -ZipPath $tempZip -ExpectedManifest 'pkg_treek.xml'
} finally {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
}

Write-Output 'TreeK package verification passed.'

