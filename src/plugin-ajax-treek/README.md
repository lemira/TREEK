# TreeK AJAX Plugin Source

Source extracted from the current nested plugin archive:

```text
pkg_treek/packages/plg_ajax_treek.zip
```

The working Joomla package still installs the ZIP from `pkg_treek/packages`.
Until a build step exists, keep this source tree and the nested ZIP in sync
manually.

## Build check

Build a temporary ZIP from this source tree:

```powershell
powershell -ExecutionPolicy Bypass -File tools/build-plugin-ajax-treek.ps1
```

By default, the script writes `plg_ajax_treek.zip` to the Windows temp folder.
It does not replace `pkg_treek/packages/plg_ajax_treek.zip` unless an explicit
`-OutputPath` is passed.

## Current structure

```text
treek.xml
treek.php
src/
language/
media/
```

- `treek.xml` is the Joomla plugin manifest.
- `treek.php` is the plugin entry point.
- `src/` contains PHP classes used by the plugin.
- `language/` contains plugin language files.
- `media/` contains browser-accessible CSS and JavaScript.
