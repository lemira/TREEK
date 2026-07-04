# TODO: Kunena/Aurelia 7.0.6 sync

Отложено до завершения текущего цикла Free/Pro тестирования TreeK.

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

## Что проверить и перенести позже

При отдельном sync-этапе проверить и при необходимости перенести в TreeK:

- `layouts/topic/edit/default.php`: session token в URL `getusersmentions`;
- `layouts/topic/item/rating/default.php`: `catid` и token в `krating_url`;
- `layouts/announcement/listing/row/default.php`: escape для author username/name;
- `layouts/widget/editor/sceditor.php`: языковые опции SCEditor;
- `assets/js/sceditor.js`: locale для SCEditor и email-кнопка для private editor.

## Не считать upstream

Файл `assets/js/treek_subject.js`, найденный внутри локальной Aurelia на `jneu`,
выглядит как TreeK-примесь, а не как официальный upstream-файл Kunena/Aurelia.

## Решение сейчас

Не смешивать sync Aurelia 7.0.6 с текущей стабилизацией Free/Pro-сборок.
Вернуться к этому отдельным маленьким этапом после текущего тестирования.
