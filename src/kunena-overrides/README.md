# Kunena overrides TreeK

Здесь лежат patched-файлы Kunena и языковые фрагменты TreeK.

При сборке package этот каталог попадает в:

```text
treek_resources/kunena_overrides
```

## Файлы

| Файл | Куда устанавливается | Зачем нужен |
| --- | --- | --- |
| `components_com_kunena_src_Controllers_TopicController.php` | `components/com_kunena/src/Controllers/TopicController.php` | Не даёт reply менять subject темы и сохраняет древовидную структуру TreeK. |
| `components_com_kunena_src_Controller_Topic_Form_Reply_TopicFormReplyDisplay.php` | `components/com_kunena/src/Controller/Topic/Form/Reply/TopicFormReplyDisplay.php` | Меняет заголовок reply для контекста parent/child. |
| `libraries_kunena_src_Forum_Message_KunenaMessage.php` | `libraries/kunena/src/Forum/Message/KunenaMessage.php` | Сохраняет subject темы неизменным при сохранении reply-сообщений. |
| `language_en-GB_com_kunena_add-treek.ini` | `language/en-GB/com_kunena.ini` | Добавляет английские строки TreeK в языковой файл Kunena. |
| `language_ru-RU_com_kunena_add-treek.ini` | `language/ru-RU/com_kunena.ini` | Добавляет русские строки TreeK в языковой файл Kunena. |
| `language_de-DE_com_kunena_add-treek.ini` | `language/de-DE/com_kunena.ini` | Добавляет немецкие строки TreeK в языковой файл Kunena. |

Это patched-файлы Kunena, зависящие от версии. Их нужно пересматривать при
смене поддерживаемой версии Kunena.
