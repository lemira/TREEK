param(
    [string] $OutputPath = (Join-Path $PSScriptRoot '..\dist\pkg_treek_pro.zip')
)

$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'build-common.ps1') `
    -Edition Pro `
    -OutputPath $OutputPath
