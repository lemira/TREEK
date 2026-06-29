# TreeK Joomla Package

This directory is the current release-ready Joomla package layout.

Do not move files out of this directory without updating both:

- `pkg_treek.xml`
- `treek_install_script.php`

## Contents

```text
pkg_treek.xml
treek_install_script.php
language/
packages/
treek_resources/
```

## Package files

- `pkg_treek.xml` defines the Joomla package metadata, nested extension
  archives, administrator language files, and installer script.
- `treek_install_script.php` performs the TreeK-specific install, update, and
  uninstall steps.

## Nested packages

`packages/` contains ZIP files installed by Joomla through the package manifest:

- `plg_ajax_treek.zip`
- `file_treek_kunena.zip`

These ZIP files are referenced from the manifest with `<files folder="packages">`.

## Runtime resources

`treek_resources/` contains resources copied directly by the package installer:

- `kunena_template/treek/` is copied to
  `components/com_kunena/template/treek`.
- `kunena_overrides/` contains patched Kunena files and language fragments that
  are copied or appended during installation.

This folder is not a clean source tree yet. It mirrors the installer's current
expectations and should be split only in small steps.

