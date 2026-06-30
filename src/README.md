# TreeK Source Layout

This directory is the planned source-oriented layout for TreeK.

For now, it is documentation only. The release-ready package layout in
`pkg_treek` remains the source of truth for installation until the build flow is
introduced.

## Planned areas

```text
src/
  package/
  plugin-ajax-treek/
  file-treek-kunena/
  kunena-template/
  kunena-overrides/
```

- `package/` contains package-level source files: manifest, installer script,
  and package language files.
- `plugin-ajax-treek/` contains source extracted from
  `pkg_treek/packages/plg_ajax_treek.zip`.
- `file-treek-kunena/` contains source extracted from
  `pkg_treek/packages/file_treek_kunena.zip`.
- `kunena-template/` contains the TreeK Kunena template copied from
  `pkg_treek/treek_resources/kunena_template/treek`.
- `kunena-overrides/` contains patched Kunena files and Kunena language
  fragments copied from `pkg_treek/treek_resources/kunena_overrides`.

## Rule for the cleanup phase

Do not move working installer inputs into `src` until the corresponding package
manifest, installer script, and build/package process are updated together.
