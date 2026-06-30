# Joomla file-пакет TreeK/Kunena

Исходники вложенного Joomla file-пакета:

```text
file_treek_kunena
```

При сборке package этот каталог упаковывается во вложенный архив
`packages/file_treek_kunena.zip`.

## Проверка сборки

Собрать временный ZIP из этого каталога:

```powershell
powershell -ExecutionPolicy Bypass -File tools/build-file-treek-kunena.ps1
```

По умолчанию скрипт пишет `file_treek_kunena.zip` во временную папку Windows.

## Структура

```text
file_treek_kunena.xml
root/
```

- `file_treek_kunena.xml` — manifest Joomla file extension.
- `root/` — файлы, устанавливаемые в корень сайта по fileset из manifest.

Сейчас пакет устанавливает только `root/media/treek/dummy/index.html`.
