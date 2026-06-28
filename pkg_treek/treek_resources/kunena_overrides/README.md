\# Kunena Overrides



This folder contains Kunena core files adapted for TreeK installation.



The installer copies these files into the corresponding Kunena locations and creates backups before replacing existing files.



\## Files



| Source file in package | Target in installed Joomla | Purpose |

| --- | --- | --- |

| `components\_com\_kunena\_src\_Controllers\_TopicController.php` | `components/com\_kunena/src/Controllers/TopicController.php` | Prevents topic subject from being changed by replies and keeps TreeK topic structure stable. |

| `components\_com\_kunena\_src\_Controller\_Topic\_Form\_Reply\_TopicFormReplyDisplay.php` | `components/com\_kunena/src/Controller/Topic/Form/Reply/TopicFormReplyDisplay.php` | Changes reply header text for TreeK parent/child reply context. |

| `libraries\_kunena\_src\_Forum\_Message\_KunenaMessage.php` | `libraries/kunena/src/Forum/Message/KunenaMessage.php` | Keeps topic subject immutable when reply messages are saved. |

| `language\_en-GB\_com\_kunena\_add-treek.ini` | `language/en-GB/com\_kunena.ini` | Adds English TreeK language strings to Kunena language file. |

| `language\_ru-RU\_com\_kunena\_add-treek.ini` | `language/ru-RU/com\_kunena.ini` | Adds Russian TreeK language strings to Kunena language file. |

| `language\_de-DE\_com\_kunena\_add-treek.ini` | `language/de-DE/com\_kunena.ini` | Adds German TreeK language strings to Kunena language file. |



\## Notes



These files are not independent TreeK source files. They are patched Kunena files and should be reviewed whenever the supported Kunena version changes.

