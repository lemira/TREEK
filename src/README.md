# Исходники TreeK

`src` — основной источник проекта.

## Разделы

```text
src/
  package/
  plugin-ajax-treek/
  file-treek-kunena/
  kunena-template/
  kunena-overrides/
```

- `package/` — manifest пакета, install script и языки package-расширения.
- `plugin-ajax-treek/` — исходники AJAX-плагина TreeK.
- `file-treek-kunena/` — исходники Joomla file-пакета TreeK/Kunena.
- `kunena-template/` — шаблон Kunena `treek`.
- `kunena-overrides/` — patched-файлы Kunena и языковые фрагменты.

Итоговый установочный ZIP собирается командой:

```powershell
powershell -ExecutionPolicy Bypass -File tools\build-package.ps1
```
