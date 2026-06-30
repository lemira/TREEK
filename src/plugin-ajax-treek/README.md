# AJAX-плагин TreeK

Исходники Joomla-плагина:

```text
plg_ajax_treek
```

При сборке package этот каталог упаковывается во вложенный архив
`packages/plg_ajax_treek.zip`.

## Проверка сборки

Собрать временный ZIP из этого каталога:

```powershell
powershell -ExecutionPolicy Bypass -File tools/build-plugin-ajax-treek.ps1
```

По умолчанию скрипт пишет `plg_ajax_treek.zip` во временную папку Windows.

## Структура

```text
treek.xml
treek.php
src/
language/
media/
```

- `treek.xml` — manifest плагина Joomla.
- `treek.php` — входной файл плагина.
- `src/` — PHP-классы плагина.
- `language/` — языковые файлы плагина.
- `media/` — CSS и JavaScript для браузера.
