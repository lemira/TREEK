# TreeK Kunena Template Source

Source copied from the current installer resource directory:

```text
pkg_treek/treek_resources/kunena_template/treek
```

The working installer still copies the template from `pkg_treek`. Until a build
step exists, keep this source tree and the installer resource directory in sync
manually.

## Current structure

```text
treek/
  assets/
  config/
  layouts/
  pages/
  template.php
```

The `treek/README.md` file inside the template still contains upstream Aurelia
template notes and should be reviewed separately from this source-layout
migration.
