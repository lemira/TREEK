# Аудит вмешательств TreeK в Kunena и шаблон

Документ разделяет только те TreeK-изменения, которые вмешиваются в Kunena и
Kunena template.

Опции самого дерева внутри popover не рассматриваются здесь. Они живут в
`src/plugin-ajax-treek/media/js/treek.js` и будут отдельно обсуждаться при
делении сборок на free / non-free или другие редакции.

## Короткий вывод

`assets/js/treek_view.js` сейчас не строит дерево постов.

Фактическое дерево, popover, AJAX-загрузка, настройки, export, grid, teaser и
highlight находятся в:

```text
src/plugin-ajax-treek/media/js/treek.js
```

`treek_view.js` сейчас отвечает за косметику страницы Kunena:

- сворачивание блока attachments;
- счётчик attachments;
- превращение dropdown `Action` в inline-кнопки Reply / Quote / Edit;
- повторную инициализацию этих улучшений после AJAX-рендера Kunena.

Поэтому название `treek_view.js` вводит в заблуждение. При следующем рефакторинге
его лучше переименовать по смыслу, например в `kunena_ui_tweaks.js`.

## Важное различие subject

В TreeK есть два разных subject, и их нельзя смешивать:

```text
topic subject
```

Название темы. Оно задаётся при создании первого поста темы и должно оставаться
стабильным. Reply-сообщения не должны менять topic subject.

```text
message subject
```

Заголовок конкретного поста или reply. Для TreeK это содержательная часть
дерева. Собственные заголовки reply разрешены и желательны, потому что именно
они придают смысл веткам дерева.

Цель будущих настроек формы:

```text
TreeK может выглядеть как штатная Kunena-форма,
но reply subject должен сохраняться как subject сообщения,
а topic subject не должен перезаписываться reply-сообщением.
```

## Обязательное ядро вмешательств

Это изменения, без которых TreeK нельзя нормально использовать как дерево
ответов в Kunena.

### Открытие дерева из списка тем

Файл:

```text
src/kunena-template/treek/layouts/topic/row/default.php
```

Сейчас:

- число ответов превращается в `button.treek-trigger`;
- кнопка получает `data-topic-id`, token и `data-topic-url`;
- `src/plugin-ajax-treek/media/js/treek.js` ловит `.treek-trigger` и открывает дерево.

Будущий условный флаг:

```text
tree_entry_topic_reply_count
```

Рекомендация: оставить включённым всегда.

### Открытие дерева из поста

Файл:

```text
src/kunena-template/treek/layouts/message/item/default.php
```

Сейчас:

- в заголовке поста есть кнопка `button.treek-trigger.treek-icon-trigger`;
- кнопка передаёт topic id, текущий post id, token и URL темы.

Будущий условный флаг:

```text
tree_entry_post_icon
```

Рекомендация: оставить включённым всегда.

### Стабильный subject темы и собственные subject reply

Файлы:

```text
src/kunena-overrides/components_com_kunena_src_Controllers_TopicController.php
src/kunena-overrides/libraries_kunena_src_Forum_Message_KunenaMessage.php
src/kunena-overrides/components_com_kunena_src_Controller_Topic_Form_Reply_TopicFormReplyDisplay.php
```

Сейчас:

- patched Kunena-файлы не дают reply-сообщениям менять topic subject;
- reply-сообщения при этом должны сохранять собственный message subject;
- display-контроллер меняет заголовок reply-формы;
- это связано с тем, что TreeK использует message subject reply как элемент дерева.

Будущий условный флаг:

```text
stable_topic_subject
```

Рекомендация: оставить включённым всегда. Это не косметика, а защита модели
данных TreeK.

## Опциональные шаблонные группы

Эти функции полезны, но их стоит сделать управляемыми отдельно.

### Переход к родительскому посту

Файлы:

```text
src/kunena-template/treek/layouts/message/item/default.php
src/kunena-template/treek/layouts/message/item/top/default.php
src/plugin-ajax-treek/media/js/treek.js
```

Сейчас:

- reply-заголовок получает ссылку `.treek-parent-link`;
- JS вызывает AJAX-task `parent_url`;
- после ответа Joomla/Kunena открывает URL родителя.

Это не обязательное условие работы дерева. Это улучшение навигации по постам
Kunena из контекста TreeK.

Будущий условный флаг:

```text
parent_post_navigation
```

Рекомендация: сделать управляемым отдельно от открытия дерева.

### Subject suffix в формах ответа

Файлы:

```text
src/kunena-template/treek/layouts/message/edit/full.php
src/kunena-template/treek/layouts/message/edit/quickreply.php
src/kunena-template/treek/layouts/topic/edit/default.php
src/kunena-template/treek/assets/js/treek_subject.js
```

Сейчас:

- reply subject получает защищённый суффикс с parent subject;
- суффикс ограничен максимум двумя стрелками;
- JS защищает суффикс от ручного редактирования;
- кнопка рядом с label переключает режимы суффикса;
- состояние отключения суффиксов хранится в `sessionStorage`.

Будущий условный флаг:

```text
subject_suffix
```

Возможная детализация:

```text
subject_suffix_button
subject_suffix_session_disable
subject_suffix_max_depth
```

Если отключать группу, PHP должен выводить обычное subject-поле Kunena, а
`treek_subject.js` не должен подключаться.

### Формы ответа и штатный вид Kunena

Файлы:

```text
src/kunena-template/treek/layouts/message/edit/full.php
src/kunena-template/treek/layouts/message/edit/quickreply.php
src/kunena-template/treek/layouts/topic/edit/default.php
```

Сейчас в этих файлах смешаны несколько типов изменений:

- защита от перезаписи topic subject;
- сохранение собственного message subject для reply;
- подготовка поля subject для суффикса;
- `autocomplete="off"`;
- исправления `parentid`;
- визуальные правки формы;
- исправление структуры `if/else/endif`.

Будущий условный флаг:

```text
native_kunena_reply_form
```

Смысл флага: дать администратору режим, в котором формы выглядят максимально
как штатные формы Kunena, но TreeK-семантика subject остаётся правильной.

В этом режиме должны сохраняться:

- reply может иметь собственный message subject;
- reply не меняет topic subject;
- технические исправления, нужные для корректного parent/child-контекста.

В этом режиме должны отключаться:

- суффикс subject;
- кнопка управления суффиксом;
- лишние визуальные изменения формы, если они не нужны для корректной работы.

Возможная детализация:

```text
reply_message_subject
topic_subject_protection
reply_form_parentid_fix
reply_form_visual_cleanup
```

`quickreply.php`, `full.php` и `topic/edit/default.php` относятся сразу к двум
группам: `subject_suffix` и `native_kunena_reply_form`. Это первый кандидат на
будущее обособление общей subject/suffix-логики.

### Attachments UI

Файл:

```text
src/kunena-template/treek/assets/js/treek_view.js
```

Сейчас:

- ищет `h2` с текстом `Attachments`;
- оборачивает связанный блок вложений в collapse wrapper;
- добавляет счётчик вложений;
- добавляет стрелку раскрытия/сворачивания;
- реагирует на изменения через `MutationObserver`.

Будущий условный флаг:

```text
attachments_toggle
```

Рекомендация: сделать полностью опциональным.

### Inline action buttons

Файл:

```text
src/kunena-template/treek/assets/js/treek_view.js
```

Сейчас:

- ищет `.btn-group` с `a.kbutton-reply`, `a.kbutton-quote`, `a.kbutton-edit`;
- клонирует эти пункты как inline-кнопки;
- скрывает исходный dropdown;
- повторяет инициализацию после AJAX-изменений DOM.

Будущий условный флаг:

```text
inline_action_buttons
```

Рекомендация: сделать полностью опциональным.

## Где ставить будущие условия

### PHP/layout уровень

Подходит для функций, которые меняют HTML ещё до загрузки JS:

- кнопка дерева в списке тем;
- кнопка дерева в посте;
- subject suffix attributes;
- удаление hidden subject input;
- подключение `treek_subject.js`;
- подключение `treek_view.js`.

Возможная форма будущего условия:

```php
if ($this->treekFeature('subject_suffix')) {
    // TreeK subject suffix markup
}
```

Такого helper пока нет. Перед внедрением нужно решить, где хранить настройки:
в параметрах шаблона, параметрах плагина или в отдельной TreeK-конфигурации.

### JS уровень

Подходит для косметики и поведения, которое можно безопасно выключить после
рендера страницы:

- attachments toggle;
- inline action buttons;

Возможная форма будущего условия:

```js
const features = window.treekFeatures || {};

if (features.attachmentsToggle !== false) {
    initAllAttachments();
}
```

### Installer/package уровень

Подходит для выбора, какие файлы устанавливать. Пока не рекомендуется: TreeK
ещё развивается, и проще устанавливать полный набор файлов, а поведение
включать/выключать параметрами.

## Что относится не к этому аудиту

Эти группы относятся к самому дереву и должны обсуждаться отдельно:

```text
tree_popover_teasers
tree_popover_export
tree_popover_comfort_tools
tree_popover_user_params
tree_popover_live_polling
```

Они важны, но это не вмешательства в Kunena layout. Их место в будущем аудите
функций самого TreeK popover.

## Предлагаемый порядок работ

1. Зафиксировать этот аудит.
2. Подробно описать `treek_view.js`.
3. Переименовать `treek_view.js` в более точное имя, если решим, что он остаётся.
4. Ввести read-only карту template-фич в JS без изменения UI.
5. Добавить первый реальный флаг, вероятно `attachments_toggle`.
6. Потом отдельно разбирать subject suffix и формы ответа.

## Предварительная классификация

| Группа | Обязательность | Где сейчас живёт | Будущий флаг |
| --- | --- | --- | --- |
| Открытие дерева из числа replies | ядро | template layout + plugin JS | `tree_entry_topic_reply_count` |
| Открытие дерева из поста | ядро | template layout + plugin JS | `tree_entry_post_icon` |
| Стабильный topic subject и собственный reply subject | ядро | Kunena overrides | `stable_topic_subject` |
| Переход к родителю | опциональная навигация | template layout + plugin JS | `parent_post_navigation` |
| Subject suffix | опционально | template layouts + `treek_subject.js` | `subject_suffix` |
| Штатный вид reply-форм при TreeK-семантике subject | смешанная группа | template layouts | `native_kunena_reply_form` |
| Attachments collapse/count | опционально | `treek_view.js` | `attachments_toggle` |
| Inline action buttons | опционально | `treek_view.js` | `inline_action_buttons` |
