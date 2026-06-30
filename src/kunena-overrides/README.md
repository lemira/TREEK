# TreeK Kunena Overrides Source

Source copied from the current installer resource directory:

```text
pkg_treek/treek_resources/kunena_overrides
```

The working installer still reads override files from `pkg_treek`. Until a
build step exists, keep this source tree and the installer resource directory in
sync manually.

## Files

| Source file | Installed target | Purpose |
| --- | --- | --- |
| `components_com_kunena_src_Controllers_TopicController.php` | `components/com_kunena/src/Controllers/TopicController.php` | Prevents topic subject changes from replies and keeps TreeK topic structure stable. |
| `components_com_kunena_src_Controller_Topic_Form_Reply_TopicFormReplyDisplay.php` | `components/com_kunena/src/Controller/Topic/Form/Reply/TopicFormReplyDisplay.php` | Changes reply header text for TreeK parent/child reply context. |
| `libraries_kunena_src_Forum_Message_KunenaMessage.php` | `libraries/kunena/src/Forum/Message/KunenaMessage.php` | Keeps topic subject immutable when reply messages are saved. |
| `language_en-GB_com_kunena_add-treek.ini` | `language/en-GB/com_kunena.ini` | Adds English TreeK language strings to Kunena language file. |
| `language_ru-RU_com_kunena_add-treek.ini` | `language/ru-RU/com_kunena.ini` | Adds Russian TreeK language strings to Kunena language file. |
| `language_de-DE_com_kunena_add-treek.ini` | `language/de-DE/com_kunena.ini` | Adds German TreeK language strings to Kunena language file. |

## Current installer path

```text
pkg_treek/treek_resources/kunena_overrides
```

These are version-sensitive patched Kunena files. Review them whenever the
supported Kunena version changes.
