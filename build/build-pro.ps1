param(
    [string] $OutputPath = (Join-Path $PSScriptRoot '..\dist\pkg_treek_pro.zip')
)

$ErrorActionPreference = 'Stop'

$defaultOutputPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\dist\pkg_treek_pro.zip'))
$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)
$buildOutputPath = $outputFullPath

if ($outputFullPath -ieq $defaultOutputPath) {
    $buildOutputPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ('..\pkg_treek_pro.' + [guid]::NewGuid().ToString('N') + '.publish.zip')))
}

try {
& (Join-Path $PSScriptRoot 'build-common.ps1') `
    -Edition Pro `
    -OutputPath $buildOutputPath

    if ($buildOutputPath -ine $outputFullPath) {
        if (Test-Path -LiteralPath $outputFullPath) {
            Remove-Item -LiteralPath $outputFullPath -Force
        }

        Copy-Item -LiteralPath $buildOutputPath -Destination $outputFullPath -Force

        $buildLength = (Get-Item -LiteralPath $buildOutputPath).Length
        $outputLength = (Get-Item -LiteralPath $outputFullPath).Length

        if ($buildLength -ne $outputLength) {
            throw "Published ZIP size mismatch. Build: $buildLength bytes, output: $outputLength bytes"
        }

        Write-Output "Published TreeK Pro package ZIP: $outputFullPath"
    }
} finally {
    if ($buildOutputPath -ine $outputFullPath -and (Test-Path -LiteralPath $buildOutputPath)) {
        Remove-Item -LiteralPath $buildOutputPath -Force
    }
}
