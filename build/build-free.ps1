param(
    [string] $OutputPath = (Join-Path $PSScriptRoot '..\dist\pkg_treek_free.zip')
)

$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'build-common.ps1') `
    -Edition Free `
    -OutputPath $OutputPath
