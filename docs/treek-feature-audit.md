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

## Модель будущих TreeKView-флагов

TreeKView-флаги должны быть пользовательскими настройками, а не только
глобальными настройками сайта. Один пользователь может включить суффиксы и
inline-кнопки, другой может оставить формы ближе к штатной Kunena.

Глобальное поведение администратора можно получить тем же механизмом: админ
назначает всем пользователям одинаковые значения флагов.

Текущая таблица:

```text
#__treek_user_parameters
```

уже содержит `user_id`, `context` и JSON-поле `settings`. Этого достаточно для
первого этапа. Чтобы не смешивать настройки popover и настройки вмешательства в
Kunena/template, будущие значения лучше хранить либо в отдельном разделе JSON,
либо в отдельном `context`.

Предпочтительный вариант для сопровождения:

```text
context = default
context = treek_view
```

`default` сейчас используется существующими настройками дерева. `treek_view`
добавляется для пользовательских флагов вмешательства в Kunena/template. Так
таблица остаётся одной, но смысл настроек не смешивается.

Если флаги называются положительно, например:

```text
subject_suffix
attachments_toggle
inline_action_buttons
```

то естественная семантика значения:

```text
0 = выключено
1 = включено
```

Если понадобится сохранить обратную семантику `1 = выключено`, параметры лучше
называть отрицательно:

```text
disable_subject_suffix
disable_attachments_toggle
disable_inline_action_buttons
```

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

Статус: подключён как runtime-флаг TreeKView. Если флаг включён, reply-заголовок
показывает TreeK-стрелку к родительскому посту и subject сообщения. Если флаг
выключен, используется штатный Aurelia/Kunena-заголовок reply.

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

Эта группа считается самостоятельной опцией TreeKView. Она действительно меняет
форму, но меняет её как единый независимый функциональный кусок: суффикс,
стрелки, кнопку отмены, атрибуты subject-поля и JS-защиту суффикса.

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
reply_form_treek_look
```

Смысл флага: дать пользователю режим, в котором формы ответа и quick reply
получают TreeK-оформление верхней части формы. Если флаг выключен, форма должна
выглядеть максимально как штатная Kunena, но TreeK-семантика subject остаётся
правильной.

Статус: подключён для чистой визуальной части в
`layouts/topic/edit/default.php`. Если флаг включён, заголовок reply-формы
выводится как TreeK-вариант `h5` с HTML-ссылкой автора. Если флаг выключен,
используется `h1` с plain-текстом из `headerTextPlain`, чтобы HTML-ссылка автора
не выводилась как буквальный текст.

Остальные изменения в `quickreply.php`, `full.php` и subject-поле пока не
включены в этот флаг, потому что они связаны с `subject_suffix` и обязательной
TreeK-семантикой subject.

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
группам: `subject_suffix` и `reply_form_treek_look`. Это первый кандидат на
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

Статус: подключён как первый runtime-флаг TreeKView. Если
`window.treekViewFeatures.attachments_toggle` выключен или отсутствует,
attachments остаются в штатном виде Kunena.

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

Статус: подключён как runtime-флаг TreeKView. Если
`window.treekViewFeatures.inline_action_buttons` выключен или отсутствует,
dropdown `Action` остаётся штатным Kunena. Если флаг включён, Reply / Quote /
Edit дополнительно выводятся как inline-кнопки.

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
в текущей пользовательской таблице под отдельным `context` или в отдельном
разделе JSON.

### JS уровень

Подходит для косметики и поведения, которое можно безопасно выключить после
рендера страницы:

- attachments toggle;
- inline action buttons;

Возможная форма будущего условия:

```js
const features = window.treekViewFeatures || {};

if (features.attachments_toggle) {
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
5. Добавить первый реальный флаг `attachments_toggle`.
6. Потом отдельно разбирать subject suffix и формы ответа.

## Предварительная классификация

| Группа | Обязательность | Где сейчас живёт | Будущий флаг |
| --- | --- | --- | --- |
| Открытие дерева из числа replies | ядро | template layout + plugin JS | `tree_entry_topic_reply_count` |
| Открытие дерева из поста | ядро | template layout + plugin JS | `tree_entry_post_icon` |
| Стабильный topic subject и собственный reply subject | ядро | Kunena overrides | `stable_topic_subject` |
| Переход к родителю | опциональная навигация | template layout + plugin JS | `parent_post_navigation` |
| Subject suffix | опционально | template layouts + `treek_subject.js` | `subject_suffix` |
| TreeK-оформление reply-форм при TreeK-семантике subject | опционально | template layouts | `reply_form_treek_look` |
| Attachments collapse/count | опционально | `treek_view.js` | `attachments_toggle` |
| Inline action buttons | опционально | `treek_view.js` | `inline_action_buttons` |
