# Kunena/Aurelia 7.0.6 / 7.0.7 sync

Синхронизация выполнена точечно: TreeK сохраняет совместимость с Kunena 7.0.4/7.0.5
и добавляет upstream-правки, появившиеся в Kunena 7.0.6/7.0.7.

## Контекст

На момент первичной разведки использовались локальные сайты:

- `loctemp`: Kunena/Aurelia 7.0.5, дата 2026-05-18;
- `jneu`: Kunena/Aurelia 7.0.6, дата 2026-06-08.

После этой разведки `loctemp` тоже был обновлен до Kunena/Aurelia 7.0.6.
Поэтому для повторного сравнения 7.0.5 -> 7.0.6 нельзя полагаться на текущее
состояние `loctemp` как на чистую копию 7.0.5.

В установщике Kunena встречается промежуточный DB-шаг `7.0.6-DEV`
от 2026-05-30, но в манифестах установленной Kunena указано:

- version: `7.0.6`;
- versionname: `Serebriya`;
- creationDate: `2026-06-08`.

В релизном пакете Kunena 7.0.7 аналогично встречается внутренний DB-шаг
`7.0.7-DEV` от 2026-06-18, но манифест компонента указывает:

- version: `7.0.7`;
- versionname: `Fuchiade`;
- creationDate: `2026-07-08`.

По GitHub release asset download counters версии не выглядят малозначимыми:

- `pkg_kunena_v7.0.4_2026-04-19.zip`: 741 download;
- `pkg_kunena_v7.0.5_2026-05-18.zip`: 666 downloads;
- `pkg_kunena_v7.0.6_2026-06-08.zip`: 917 downloads;
- `pkg_kunena_v7.0.7_2026-07-08.zip`: 781 download.

Это счетчики скачиваний, а не установок.

## Перенесено

- `layouts/topic/edit/default.php`: session token в URL `getusersmentions`;
- `layouts/topic/item/rating/default.php`: `catid` и token в rating URLs;
- `layouts/announcement/listing/row/default.php`: escape для author username/name;
- `layouts/widget/editor/sceditor.php`: языковые опции SCEditor и загрузка TreeK `sceditor.js`;
- `assets/js/sceditor.js`: locale для SCEditor и email-кнопка для private editor;
- `TopicController.php`: совместимые security/rating endpoint фрагменты из Kunena 7.0.7.

## Не считать upstream

Файл `assets/js/treek_subject.js`, найденный внутри локальной Aurelia на `jneu`,
выглядит как TreeK-примесь, а не как официальный upstream-файл Kunena/Aurelia.

## Решение

Не заменять TreeK-файлы полными Aurelia 7.0.7-копиями. TreeK содержит свои
изменения формы ответа и subject/parent-семантики, поэтому переносить только
необходимые upstream-фрагменты.

## Post-sync follow-ups

Закрыто 2026-07-27:

- `Replies:` сделан кликабельным в `topic/row/category.php`,
  `topic/row/user.php` и `message/row/default.php`, по образцу Recent Topics.
- Настройка `Show post excerpt` переименована в `Show post beginning`,
  включая варианты text/screenshot.
