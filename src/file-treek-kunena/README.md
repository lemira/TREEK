# TreeK Kunena File Package Source

Source extracted from the current nested file package archive:

```text
pkg_treek/packages/file_treek_kunena.zip
```

The working Joomla package still installs the ZIP from `pkg_treek/packages`.
Until a build step exists, keep this source tree and the nested ZIP in sync
manually.

## Build check

Build a temporary ZIP from this source tree:

```powershell
powershell -ExecutionPolicy Bypass -File tools/build-file-treek-kunena.ps1
```

By default, the script writes `file_treek_kunena.zip` to the Windows temp
folder. It does not replace `pkg_treek/packages/file_treek_kunena.zip` unless an
explicit `-OutputPath` is passed.

## Current structure

```text
file_treek_kunena.xml
root/
```

- `file_treek_kunena.xml` is the Joomla file extension manifest.
- `root/` contains files installed into the Joomla site root according to the
  manifest fileset.

At the moment this package installs only `root/media/treek/dummy/index.html`.
