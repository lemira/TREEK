# Kunena overrides TreeK

Здесь лежат patched-файлы Kunena и языковые фрагменты TreeK.

Это не шаблонные опции, а прямое вмешательство в Kunena. Главная задача этих
файлов — сохранить модель данных TreeK:

- `topic subject` задаётся первым постом темы и не должен меняться reply.
- `message subject` у reply должен сохраняться как собственный заголовок поста.
- Собственные заголовки reply разрешены и желательны, потому что они придают
  смысл дереву.

При сборке package этот каталог попадает в:

```text
treek_resources/kunena_overrides
```

## Файлы

| Файл | Куда устанавливается | Зачем нужен |
| --- | --- | --- |
| `components_com_kunena_src_Controllers_TopicController.php` | `components/com_kunena/src/Controllers/TopicController.php` | Не даёт reply менять topic subject и сохраняет древовидную структуру TreeK. |
| `components_com_kunena_src_Controller_Topic_Form_Reply_TopicFormReplyDisplay.php` | `components/com_kunena/src/Controller/Topic/Form/Reply/TopicFormReplyDisplay.php` | Меняет заголовок reply для контекста parent/child. |
| `libraries_kunena_src_Forum_Message_KunenaMessage.php` | `libraries/kunena/src/Forum/Message/KunenaMessage.php` | Сохраняет topic subject неизменным при сохранении reply-сообщений. |

Это patched-файлы Kunena, зависящие от версии. Их нужно пересматривать при
смене поддерживаемой версии Kunena.
