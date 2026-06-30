# TreeK-изменения в шаблоне Kunena

Этот документ фиксирует известные изменения в шаблоне `treek`.

Цель документа: не потерять смысл правок при дальнейшей разработке TreeK,
обновлении Kunena и возможном решении вопроса об удалении `treek_view`.

## Как искать TreeK-правки

Большинство изменённых файлов содержит маркеры `treek`, `TreeK` или `TREEK`.
Быстрый поиск:

```powershell
rg -l "treek|TreeK|TREEK" src\kunena-template\treek
```

Проверено командой `rg -i -l "treek" src\kunena-template\treek`.
На момент составления документа такой поиск находит 11 файлов:

```text
template.php
config/kunena_tmpl_treek.xml
config/template.xml
layouts/topic/row/default.php
layouts/message/item/default.php
layouts/message/item/top/default.php
layouts/message/edit/full.php
layouts/message/edit/quickreply.php
layouts/topic/edit/default.php
assets/js/treek_view.js
assets/js/treek_subject.js
```

Список ниже описывает функциональные правки, смысл которых уже установлен.

## layouts/topic/row/default.php

Путь в установленной Joomla:

```text
components/com_kunena/template/treek/layouts/topic/row/default.php
```

Изменение:

- Активировано число ответов как кнопка TreeK.
- Если у темы есть ответы, число replies оборачивается в `button.treek-trigger`.
- Кнопка получает `data-topic-id`, CSRF-token и URL темы.
- Нажатие должно открывать TreeK-представление темы.

## layouts/message/item/default.php

Путь в установленной Joomla:

```text
components/com_kunena/template/treek/layouts/message/item/default.php
```

Изменения:

- Для reply-сообщений заголовок поста заменяет стандартное `Replied by X on topic Y`.
- Вместо стандартного текста выводится стрелка вверх `COM_KUNENA_TREEK_ARROW_UP` и subject текущего поста.
- Стрелка оформлена как `a.treek-parent-link` с `data-post-id`, `data-topic-id` и token.
- Tooltip берётся из `COM_KUNENA_TREEK_GOTO_PARENT`.
- Для первого поста темы стандартное отображение сохранено.
- В заголовок также добавлена кнопка `button.treek-trigger` для показа дерева.

Примечание: в текущем файле parent-ссылка реализована через TreeK JS/data-атрибуты, а не прямым `KunenaMessageHelper::get($message->parent)->getUrl()`.

## layouts/message/item/top/default.php

Путь в установленной Joomla:

```text
components/com_kunena/template/treek/layouts/message/item/top/default.php
```

Изменения:

- Повторяет смысл правок из `layouts/message/item/default.php` для alternate/top layout.
- Reply-заголовок показывает TreeK-стрелку к родителю и subject сообщения.
- Первый пост темы остаётся на стандартном отображении.

## layouts/message/edit/full.php

Путь в установленной Joomla:

```text
components/com_kunena/template/treek/layouts/message/edit/full.php
```

Изменения:

- Удалён скрытый `input name="subject"` для режима `allowChangeSubject`.
- Поле subject для reply начинается с пустого `value=""`.
- Поле получает класс `treek-subject-field`.
- В поле добавляется `data-treek-suffix`.
- Установлен `autocomplete="off"`, чтобы браузер не восстанавливал старый subject.
- Рядом с label добавлена кнопка управления суффиксом.
- Иконки и tooltip-кнопки берутся из `COM_KUNENA_TREEK_ARROW_CANCEL`, `COM_KUNENA_TREEK_ARROW_CANCEL_ONE`, `COM_KUNENA_TREEK_ARROW_SUFFIX_OFF` и связанных tooltip-строк.
- Суффикс формируется с ограничением максимум двух стрелок `COM_KUNENA_TREEK_ARROW_RIGHT`.
- `parentid` исправлен через `$message->displayField('id')`.
- Подключён `assets/js/treek_subject.js`.

## layouts/message/edit/quickreply.php

Путь в установленной Joomla:

```text
components/com_kunena/template/treek/layouts/message/edit/quickreply.php
```

Изменения:

- Повторяет TreeK-логику subject из `layouts/message/edit/full.php`.
- Правки применены для обоих вариантов quick reply.
- Убраны скрытые `input name="subject"` для `allowChangeSubject`.
- Subject-поле получает `treek-subject-field`, `data-treek-suffix` и `autocomplete="off"`.
- Добавлена кнопка управления суффиксом.
- Суффикс ограничивается максимум двумя стрелками `COM_KUNENA_TREEK_ARROW_RIGHT`.
- Подключён `assets/js/treek_subject.js`.

## layouts/topic/edit/default.php

Путь в установленной Joomla:

```text
components/com_kunena/template/treek/layouts/topic/edit/default.php
```

Изменения:

- Заголовок страницы изменён с `h1` на `h5`.
- Убран `$this->escape()` в месте, где ссылка автора должна отображаться как HTML.
- Удалён скрытый input для `allowChangeSubject`.
- Исправлена структура `if/else/endif` для `task=post/edit`.
- `parentid` для reply берётся из `$this->message->parent`.
- Для reply-формы subject-поле получает `treek-subject-field`, `data-treek-suffix` и `autocomplete="off"`.
- Рядом с label добавлена кнопка управления суффиксом.
- Суффикс формируется через `KunenaMessageHelper::get($this->message->parent)` с ограничением максимум двух стрелок `COM_KUNENA_TREEK_ARROW_RIGHT`.
- Добавлен импорт `KunenaMessageHelper`.
- Для новой темы и редактирования темы стандартное subject-поле оставлено без TreeK-логики.

## assets/js/treek_subject.js

Путь в установленной Joomla:

```text
components/com_kunena/template/treek/assets/js/treek_subject.js
```

Назначение:

- Управляет subject-полями в формах ответа.
- Читает полный суффикс из `data-treek-suffix`.
- Защищает суффикс от ручного редактирования.
- При вводе текста укорачивает суффикс справа, освобождая место под пользовательский subject.
- При Backspace восстанавливает доступную часть суффикса.
- Не даёт курсору уходить в зону суффикса.
- Позволяет корректно редактировать пользовательский текст в середине строки.
- Поддерживает три состояния кнопки:
  - суффикс включён для текущего ответа;
  - суффикс отключён только для текущего ответа;
  - суффиксы отключены для всех ответов текущей browser-сессии.
- Session-level состояние хранится в `sessionStorage`.
- При открытии modal через `shown.bs.modal` восстанавливает состояние поля и кнопки.
- `autocomplete="off"` на PHP-стороне помогает не получить старый subject из browser cache.

## Файлы для отдельного разбора

Эти файлы тоже содержат TreeK-маркеры, но их роль нужно описывать отдельно:

- `template.php`
- `config/kunena_tmpl_treek.xml`
- `config/template.xml`
- `assets/js/treek_view.js`

Особенно важно отдельно описать `assets/js/treek_view.js`, потому что он связан
с вопросом, можно ли исключить TreeK-view из шаблона или заменить его другой
реализацией.

См. также общий аудит обязательных и опциональных групп TreeK:

```text
docs/treek-feature-audit.md
```
