# Package Layout Notes

This document records the current package layout and the intended migration
path. It is deliberately descriptive: no installer behavior changes are implied.

## Current source of truth

Originally, `pkg_treek` was both:

- the editable source tree for the first cleanup phase
- the release-ready Joomla package directory

The current package builder now reads source files from `src` and writes the
installable ZIP to `dist/pkg_treek.zip`. The `pkg_treek` directory remains as a
legacy release-layout reference while the migration is in progress.

The installer depends on these paths:

| Current path | Used by | Purpose |
| --- | --- | --- |
| `pkg_treek/pkg_treek.xml` | Joomla package installer | Package metadata, nested ZIP list, language files, install script |
| `pkg_treek/treek_install_script.php` | Joomla package installer | TreeK install/update/uninstall lifecycle |
| `pkg_treek/language/` | `pkg_treek.xml` | Administrator package language files |
| `pkg_treek/packages/` | `pkg_treek.xml` | Nested extension ZIP files |
| `pkg_treek/treek_resources/kunena_template/treek` | `treek_install_script.php` | Kunena template copied into Joomla |
| `pkg_treek/treek_resources/kunena_overrides` | `treek_install_script.php` | Patched Kunena files and language additions |

## Suggested migration sequence

1. Document the existing package layout.
2. Add source-oriented directories without changing installer paths.
3. Add local package structure verification.
4. Move one resource group at a time.
5. Update `treek_install_script.php` path constants for that group.
6. Verify package installation behavior.
7. Introduce a build step only after the manual layout is understood.

## Local verification

Run this from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File tools/verify-package.ps1
```

The script checks that:

- `pkg_treek/pkg_treek.xml` is a package manifest.
- The installer script and package language files referenced by the manifest
  exist.
- Nested ZIP packages referenced by the manifest exist and contain their XML
  manifests.
- A temporary `pkg_treek.zip` can be built from the current package directory.

Build a temporary AJAX plugin ZIP from `src/plugin-ajax-treek`:

```powershell
powershell -ExecutionPolicy Bypass -File tools/build-plugin-ajax-treek.ps1
```

This writes to the Windows temp folder by default and does not replace the
working nested package ZIP.

Compare two ZIP files by entry names and file contents:

```powershell
powershell -ExecutionPolicy Bypass -File tools/compare-zip.ps1 -ReferenceZip pkg_treek/packages/plg_ajax_treek.zip -CandidateZip $env:LOCALAPPDATA\Temp\plg_ajax_treek.zip
```

This is meant for build verification. It ignores ZIP container metadata such as
timestamps, compression level, and entry order.

Build a temporary Kunena file package ZIP from `src/file-treek-kunena`:

```powershell
powershell -ExecutionPolicy Bypass -File tools/build-file-treek-kunena.ps1
```

Kunena overrides are currently copied into `src/kunena-overrides` for source
visibility. The installer still reads the working copies from
`pkg_treek/treek_resources/kunena_overrides`.

The Kunena template is currently copied into `src/kunena-template/treek` for
source visibility. The installer still reads the working template from
`pkg_treek/treek_resources/kunena_template/treek`.

Build a release package ZIP from `src` into `dist/pkg_treek.zip`:

```powershell
powershell -ExecutionPolicy Bypass -File tools/build-package.ps1
```

The package builder creates a temporary release layout, rebuilds both nested ZIP
packages from `src`, copies Kunena resources from `src`, verifies the temporary
package layout, then writes the final ZIP to `dist`.

## Candidate target layout

```text
src/
  package/
    language/
    install-script/
  kunena-template/
    treek/
  kunena-overrides/

build/
  pkg_treek/

pkg_treek/
  ...temporary release-ready package layout until build is introduced...
```

The exact target can still change. The important rule is that `pkg_treek` should
not be partially moved unless the manifest, install script, and package ZIP are
updated together.
