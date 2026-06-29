# Package Layout Notes

This document records the current package layout and the intended migration
path. It is deliberately descriptive: no installer behavior changes are implied.

## Current source of truth

`pkg_treek` is both:

- the editable source tree for the first cleanup phase
- the release-ready Joomla package directory

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
3. Move one resource group at a time.
4. Update `treek_install_script.php` path constants for that group.
5. Verify package installation behavior.
6. Introduce a build step only after the manual layout is understood.

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

