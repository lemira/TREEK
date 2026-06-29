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
  kunena-template/
  kunena-overrides/
```

- `package/` is reserved for package-level source files: manifest, installer
  script, package language files, and future packaging/build notes.
- `plugin-ajax-treek/` is reserved for the TreeK AJAX plugin source that is
  currently present only as `pkg_treek/packages/plg_ajax_treek.zip`.
- `kunena-template/` is reserved for the TreeK Kunena template source that is
  currently installed from `pkg_treek/treek_resources/kunena_template/treek`.
- `kunena-overrides/` is reserved for patched Kunena files and Kunena language
  fragments that are currently installed from
  `pkg_treek/treek_resources/kunena_overrides`.

## Rule for the cleanup phase

Do not move working installer inputs into `src` until the corresponding package
manifest, installer script, and build/package process are updated together.

