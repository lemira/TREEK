<?php
defined('_JEXEC') or die;

use Joomla\CMS\Installer\InstallerScript;
use Joomla\Filesystem\File;
use Joomla\Filesystem\Folder;
use Joomla\CMS\Factory;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Log\Log;

class Pkg_TreekInstallerScript extends InstallerScript
{
    protected $minimumJoomla = '6.0.0';
    protected $minimumKunena = '7.0.0';
    
    protected $paths = [
        'kunena_template_source' => 'treek_resources/kunena_template/treek',
        'kunena_template_target' => 'components/com_kunena/template/treek',
        'backup_folder' => 'administrator/components/com_kunena/treek_backup',
        'language_fragment_pattern' => 'language_*_com_kunena_add-treek.ini',
        'overrides' => [
            [
                'source' => 'components_com_kunena_src_Controllers_TopicController.php',
                'target' => 'components/com_kunena/src/Controllers/TopicController.php',
                'type' => 'component'
            ],
            [
                'source' => 'components_com_kunena_src_Controller_Topic_Form_Reply_TopicFormReplyDisplay.php',
                'target' => 'components/com_kunena/src/Controller/Topic/Form/Reply/TopicFormReplyDisplay.php',
                'type' => 'component'
            ],
            [
                'source' => 'libraries_kunena_src_Forum_Message_KunenaMessage.php',
                'target' => 'libraries/kunena/src/Forum/Message/KunenaMessage.php',
                'type' => 'library'
            ]
        ]
    ];

    protected function isPackage($parent)
    {
        $manifest = $parent->getParent()->getManifest();
        if ($manifest === null) {
            return false;
        }
        $type = (string) $manifest->attributes()->type;
        return $type === 'package';
    }

    protected function initLogger()
    {
        static $initialized = false;
        if (!$initialized) {
            $options = [
                'text_file' => 'treek_install.php',
                'text_entry_format' => '{DATE} {TIME} {PRIORITY} {MESSAGE}'
            ];
            Log::addLogger($options, Log::ALL, ['treek']);
            $initialized = true;
        }
    }

    protected function log($message, $priority = Log::INFO)
    {
        $this->initLogger();
        Log::add($message, $priority, 'treek');
    }

protected function loadTreekLanguage(): void
{
    $lang = Factory::getApplication()->getLanguage();
    $lang->load('pkg_treek', JPATH_ADMINISTRATOR, null, true, true);
    $lang->load('pkg_treek.sys', JPATH_ADMINISTRATOR, null, true, true);
}

public function preflight($type, $parent)
{
    $this->loadTreekLanguage();

    $this->log('Начало preflight. Тип: ' . $type);

    if ($type === 'uninstall') {
        if ($this->isTreekDefaultKunenaTemplate()) {
            $msg = Text::_('PKG_TREEK_WARNING_TEMPLATE_DEFAULT');
            $hint = Text::_('PKG_TREEK_HINT_TEMPLATE_SWITCH');

            Factory::getApplication()->enqueueMessage($msg, 'warning');
            Factory::getApplication()->enqueueMessage($hint, 'notice');

            $this->log($msg, Log::WARNING);

            throw new \RuntimeException($msg);
        }

        return true;
    }
        
        if (!Folder::exists(JPATH_ROOT . '/components/com_kunena')) {
            $msg = Text::_('PKG_TREEK_ERROR_KUNENA_NOT_FOUND');
            Factory::getApplication()->enqueueMessage($msg, 'error');
            $this->log($msg, Log::ERROR);
            return false;
        }
        
        $kunenaVersion = $this->getKunenaVersion();
        $this->log('Версия Kunena: ' . $kunenaVersion);
        
        if (version_compare($kunenaVersion, $this->minimumKunena, '<')) {
            $msg = Text::sprintf('PKG_TREEK_ERROR_KUNENA_VERSION', $this->minimumKunena);
            Factory::getApplication()->enqueueMessage($msg, 'error');
            $this->log($msg, Log::ERROR);
            return false;
        }
        
        $this->log('preflight успешен');
        return true;
    }

    public function install($parent)
    {
        $this->loadTreekLanguage();

        $this->log('Начало установки TreeK');
       
        if (!$this->installKunenaTemplate($parent)) {
            return false;
        }
        
        if (!$this->installOverrides($parent)) {
            return false;
        }
        
        
if (!$this->createUserParametersTable()) {
    return false;
}

if (!$this->createGlobalParametersTable()) {
    return false;
}
        
        $this->log('Установка TreeK завершена успешно');
        
        Factory::getApplication()->enqueueMessage(Text::_('PKG_TREEK_SUCCESS_INSTALL'), 'success');
        Factory::getApplication()->enqueueMessage(Text::_('PKG_TREEK_POSTINSTALL_INFO'), 'notice');
        Factory::getApplication()->enqueueMessage(Text::_('PKG_TREEK_POSTINSTALL_TEMPLATE'), 'notice');
        Factory::getApplication()->enqueueMessage(Text::_('PKG_TREEK_POSTINSTALL_PLUGIN'), 'notice');
        
        return true;
    }

    public function update($parent)
{
    $this->loadTreekLanguage();

    $this->log('Начало обновления TreeK');

    return $this->install($parent);
}

public function uninstall($parent)
{
    $this->loadTreekLanguage();

    $this->log('Начало удаления TreeK');

    $this->restoreOriginalFiles();

    if (!$this->removeKunenaTemplate()) {
        return false;
    }

    $this->keepUserParametersTable();

    $this->cleanupBackups();

    $this->log('Удаление TreeK завершено');
    Factory::getApplication()->enqueueMessage(Text::_('PKG_TREEK_SUCCESS_UNINSTALL'), 'success');

    return true;
}

    protected function installKunenaTemplate($parent)
    {
        $source = $parent->getParent()->getPath('source') . '/' . $this->paths['kunena_template_source'];
        $target = JPATH_ROOT . '/' . $this->paths['kunena_template_target'];
        
        $this->log('Установка шаблона Kunena. Источник: ' . $source . ', Цель: ' . $target);
        
        if (!Folder::exists($source)) {
            $msg = Text::_('PKG_TREEK_ERROR_TEMPLATE_NOT_FOUND');
            Factory::getApplication()->enqueueMessage($msg, 'error');
            $this->log($msg, Log::ERROR);
            return false;
        }
        
        if (Folder::exists($target)) {
            $this->log('Удаление предыдущей версии шаблона');
            Folder::delete($target);
        }
        
        if (!Folder::copy($source, $target)) {
            $msg = Text::_('PKG_TREEK_ERROR_TEMPLATE_COPY');
            Factory::getApplication()->enqueueMessage($msg, 'error');
            $this->log($msg, Log::ERROR);
            return false;
        }
        
        $this->log('Шаблон успешно установлен');
        Factory::getApplication()->enqueueMessage(Text::_('PKG_TREEK_TEMPLATE_INSTALLED'), 'success');
        return true;
    }
    
    protected function isTreekDefaultKunenaTemplate(): bool
{
    $db = Factory::getDbo();

    $query = $db->getQuery(true)
        ->select($db->quoteName('params'))
        ->from($db->quoteName('#__extensions'))
        ->where($db->quoteName('element') . ' = ' . $db->quote('com_kunena'))
        ->where($db->quoteName('type') . ' = ' . $db->quote('component'));

    $db->setQuery($query);
    $params = (string) $db->loadResult();

    if ($params === '') {
        return false;
    }

    $kunenaParams = json_decode($params, true);

    return is_array($kunenaParams)
        && isset($kunenaParams['template'])
        && $kunenaParams['template'] === 'treek';
}

    protected function installOverrides($parent)
    {
        $sourceBase = $parent->getParent()->getPath('source') . '/treek_resources/kunena_overrides';
        $this->log('Установка переопределений. Базовая папка: ' . $sourceBase);
        
        foreach ($this->paths['overrides'] as $override) {
            $source = $sourceBase . '/' . $override['source'];
            $target = JPATH_ROOT . '/' . $override['target'];
            
            $this->log('Обработка: ' . $override['source']);
            
            if (!File::exists($source)) {
                $msg = Text::sprintf('PKG_TREEK_WARNING_SOURCE_NOT_FOUND', $override['source']);
                Factory::getApplication()->enqueueMessage($msg, 'warning');
                $this->log('Файл не найден: ' . $source, Log::WARNING);
                continue;
            }
            
            if (File::exists($target)) {
                $backupPath = JPATH_ROOT . '/tmp/' . $this->paths['backup_folder'];
                if (!Folder::exists($backupPath)) {
                    Folder::create($backupPath);
                    $this->log('Создана папка бэкапа: ' . $backupPath);
                }
                
                $backupFile = $backupPath . '/' . str_replace(['/', '\\'], '_', $override['target']);
                if (File::copy($target, $backupFile)) {
                    $this->log('Создан бэкап: ' . $backupFile);
                } else {
                    $msg = Text::sprintf('PKG_TREEK_ERROR_BACKUP', $override['target']);
                    Factory::getApplication()->enqueueMessage($msg, 'warning');
                    $this->log($msg, Log::WARNING);
                }
            }
            
            if (!File::copy($source, $target)) {
                $msg = Text::sprintf('PKG_TREEK_ERROR_FILE_COPY', $override['target']);
                Factory::getApplication()->enqueueMessage($msg, 'error');
                $this->log($msg, Log::ERROR);
            } else {
                $this->log('Файл успешно заменен: ' . $override['target']);
            }
        }

        $this->installLanguageFragments($sourceBase);
        
        Factory::getApplication()->enqueueMessage(Text::_('PKG_TREEK_OVERRIDES_INSTALLED'), 'success');
        return true;
    }

    protected function installLanguageFragments(string $sourceBase): void
    {
        $pattern = $sourceBase . '/' . $this->paths['language_fragment_pattern'];
        $fragments = glob($pattern) ?: [];

        foreach ($fragments as $source) {
            $sourceName = basename($source);

            if (!preg_match('/^language_([^_]+)_com_kunena_add-treek\.ini$/', $sourceName, $matches)) {
                $this->log('Некорректное имя языкового фрагмента: ' . $sourceName, Log::WARNING);
                continue;
            }

            $languageTag = $matches[1];
            $targetRelative = 'language/' . $languageTag . '/com_kunena.ini';
            $target = JPATH_ROOT . '/' . $targetRelative;

            if (!File::exists($target)) {
                $this->log('Языковой файл Kunena не найден, фрагмент пропущен: ' . $targetRelative, Log::WARNING);
                continue;
            }

            $this->backupTargetFile($target, $targetRelative);

            $original = file_get_contents($target);
            $fragment = trim((string) file_get_contents($source));

            if ($fragment === '') {
                $this->log('Пустой языковой фрагмент пропущен: ' . $sourceName, Log::WARNING);
                continue;
            }

            $content = rtrim((string) $original) . "\n\n"
                . '; BEGIN TREEK LANGUAGE ADDITIONS' . "\n"
                . $fragment . "\n"
                . '; END TREEK LANGUAGE ADDITIONS' . "\n";

            if (file_put_contents($target, $content) === false) {
                $msg = Text::sprintf('PKG_TREEK_ERROR_FILE_COPY', $targetRelative);
                Factory::getApplication()->enqueueMessage($msg, 'error');
                $this->log($msg, Log::ERROR);
            } else {
                $this->log('Языковой фрагмент добавлен: ' . $targetRelative);
            }
        }
    }

    protected function backupTargetFile(string $target, string $targetRelative): void
    {
        $backupPath = JPATH_ROOT . '/tmp/' . $this->paths['backup_folder'];

        if (!Folder::exists($backupPath)) {
            Folder::create($backupPath);
            $this->log('Создана папка бэкапа: ' . $backupPath);
        }

        $backupFile = $backupPath . '/' . str_replace(['/', '\\'], '_', $targetRelative);

        if (File::copy($target, $backupFile)) {
            $this->log('Создан бэкап: ' . $backupFile);
        } else {
            $msg = Text::sprintf('PKG_TREEK_ERROR_BACKUP', $targetRelative);
            Factory::getApplication()->enqueueMessage($msg, 'warning');
            $this->log($msg, Log::WARNING);
        }
    }

    protected function restoreOriginalFiles()
    {
        $backupPath = JPATH_ROOT . '/tmp/' . $this->paths['backup_folder'];
        $this->log('Восстановление оригиналов из: ' . $backupPath);
        
        if (!Folder::exists($backupPath)) {
            $this->log('Папка бэкапа не найдена');
            return true;
        }
        
        foreach ($this->paths['overrides'] as $override) {
            $target = JPATH_ROOT . '/' . $override['target'];
            $backupFile = $backupPath . '/' . str_replace(['/', '\\'], '_', $override['target']);
            
            if (File::exists($backupFile)) {
                $this->log('Восстановление: ' . $target);
                File::copy($backupFile, $target);
                File::delete($backupFile);
            } else {
                $this->log('Бэкап не найден для: ' . $override['target']);
            }
        }

        $this->restoreLanguageFragmentBackups($backupPath);
        
        return true;
    }

    protected function restoreLanguageFragmentBackups(string $backupPath): void
    {
        $backupPattern = $backupPath . '/language_*_com_kunena.ini';
        $backups = glob($backupPattern) ?: [];

        foreach ($backups as $backupFile) {
            $backupName = basename($backupFile);

            if (!preg_match('/^language_([^_]+)_com_kunena\.ini$/', $backupName, $matches)) {
                continue;
            }

            $target = JPATH_ROOT . '/language/' . $matches[1] . '/com_kunena.ini';
            
            $this->log('Восстановление языкового файла Kunena: ' . $target);
            File::copy($backupFile, $target);
            File::delete($backupFile);
        }
    }

    protected function removeKunenaTemplate()
{
    $target = JPATH_ROOT . '/' . $this->paths['kunena_template_target'];
    $this->log('Проверка шаблона перед удалением: ' . $target);

    if ($this->isTreekDefaultKunenaTemplate()) {
        $msg = Text::_('PKG_TREEK_WARNING_TEMPLATE_DEFAULT');
        Factory::getApplication()->enqueueMessage($msg, 'warning');
        $this->log($msg, Log::WARNING);

        $hint = Text::_('PKG_TREEK_HINT_TEMPLATE_SWITCH');
        Factory::getApplication()->enqueueMessage($hint, 'notice');

        return false;
    }

    if (Folder::exists($target)) {
        $this->log('Удаление папки шаблона');

        if (!Folder::delete($target)) {
            $msg = Text::sprintf('PKG_TREEK_ERROR_DELETE_FOLDER', $target);
            Factory::getApplication()->enqueueMessage($msg, 'error');
            $this->log($msg, Log::ERROR);

            return false;
        }

        $this->log('Шаблон успешно удален');
        Factory::getApplication()->enqueueMessage(Text::_('PKG_TREEK_TEMPLATE_REMOVED'), 'success');
    }

    return true;
}

    protected function cleanupBackups()
    {
        $backupPath = JPATH_ROOT . '/tmp/' . $this->paths['backup_folder'];
        if (Folder::exists($backupPath)) {
            $this->log('Очистка папки бэкапов: ' . $backupPath);
            Folder::delete($backupPath);
            $this->log('Папка бэкапов удалена');
        }
    }

    protected function getKunenaVersion()
    {
        $possiblePaths = [
            JPATH_ROOT . '/components/com_kunena/kunena.xml',
            JPATH_ROOT . '/administrator/components/com_kunena/kunena.xml',
        ];
        
        foreach ($possiblePaths as $xmlPath) {
            if (File::exists($xmlPath)) {
                $xml = simplexml_load_file($xmlPath);
                if ($xml && isset($xml->version)) {
                    return (string)$xml->version;
                }
            }
        }
        
        return '0.0.0';
    }
    
    protected function createUserParametersTable(): bool
{
    $db = Factory::getDbo();

    $query = "
        CREATE TABLE IF NOT EXISTS " . $db->quoteName('#__treek_user_parameters') . " (
            " . $db->quoteName('id') . " int unsigned NOT NULL AUTO_INCREMENT,
            " . $db->quoteName('user_id') . " int unsigned NOT NULL,
            " . $db->quoteName('context') . " varchar(64) NOT NULL DEFAULT 'default',
            " . $db->quoteName('settings') . " mediumtext NOT NULL,
            " . $db->quoteName('created_at') . " datetime NOT NULL,
            " . $db->quoteName('updated_at') . " datetime NOT NULL,
            PRIMARY KEY (" . $db->quoteName('id') . "),
            UNIQUE KEY " . $db->quoteName('idx_user_context') . " (" . $db->quoteName('user_id') . ", " . $db->quoteName('context') . "),
            KEY " . $db->quoteName('idx_user_id') . " (" . $db->quoteName('user_id') . ")
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 DEFAULT COLLATE=utf8mb4_unicode_ci;
    ";

    try {
        $db->setQuery($query);
        $db->execute();

$tableName = $db->replacePrefix('#__treek_user_parameters');
$db->setQuery('SHOW TABLES LIKE ' . $db->quote($tableName));

if ((string) $db->loadResult() !== $tableName) {
    throw new \RuntimeException('TreeK user parameters table was not found after CREATE TABLE: ' . $tableName);
}

Factory::getApplication()->enqueueMessage(Text::_('PKG_TREEK_USER_PARAMS_TABLE_CREATED'), 'notice');

$this->log('Таблица пользовательских параметров TreeK создана или уже существует: ' . $tableName);

return true;
    } catch (\Throwable $e) {
        $msg = 'Error creating TreeK user parameters table: ' . $e->getMessage();
        Factory::getApplication()->enqueueMessage($msg, 'error');
        $this->log($msg, Log::ERROR);

        return false;
    }
}

protected function keepUserParametersTable(): void
{
    Factory::getApplication()->enqueueMessage(Text::_('PKG_TREEK_USER_PARAMS_TABLE_KEPT'), 'notice');
    $this->log('Таблица пользовательских параметров TreeK сохранена');
}

protected function createGlobalParametersTable(): bool
{
    $db = Factory::getDbo();

    $query = "
        CREATE TABLE IF NOT EXISTS " . $db->quoteName('#__treek_global_parameters') . " (
            " . $db->quoteName('name') . " varchar(128) NOT NULL,
            " . $db->quoteName('value') . " mediumtext NOT NULL,
            " . $db->quoteName('created_at') . " datetime NOT NULL,
            " . $db->quoteName('updated_at') . " datetime NOT NULL,
            PRIMARY KEY (" . $db->quoteName('name') . ")
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 DEFAULT COLLATE=utf8mb4_unicode_ci;
    ";

    try {
        $db->setQuery($query);
        $db->execute();

        $tableName = $db->replacePrefix('#__treek_global_parameters');
        $db->setQuery('SHOW TABLES LIKE ' . $db->quote($tableName));

        if ((string) $db->loadResult() !== $tableName) {
            throw new \RuntimeException('TreeK global parameters table was not found after CREATE TABLE: ' . $tableName);
        }

        $this->seedGlobalParameters();

        Factory::getApplication()->enqueueMessage(Text::_('PKG_TREEK_GLOBAL_PARAMS_TABLE_CREATED'), 'notice');
        $this->log('Таблица глобальных параметров TreeK создана или уже существует: ' . $tableName);

        return true;
    } catch (\Throwable $e) {
        $msg = 'Error creating TreeK global parameters table: ' . $e->getMessage();
        Factory::getApplication()->enqueueMessage($msg, 'error');
        $this->log($msg, Log::ERROR);

        return false;
    }
}

protected function seedGlobalParameters(): void
{
    $db = Factory::getDbo();
    $now = Factory::getDate()->toSql();

    $defaults = [
        'debug_ajax' => '0',
        'parent_post_navigation' => '1',
        'reply_form_treek_look' => '0',
        'subject_suffix' => '0',
        'attachments_toggle' => '0',
        'inline_action_buttons' => '0',
    ];

    foreach ($defaults as $name => $value) {
        $query = $db->getQuery(true)
            ->insert($db->quoteName('#__treek_global_parameters'))
            ->columns($db->quoteName(['name', 'value', 'created_at', 'updated_at']))
            ->values(implode(',', [
                $db->quote($name),
                $db->quote($value),
                $db->quote($now),
                $db->quote($now),
            ]));

        $query .= ' ON DUPLICATE KEY UPDATE ' . $db->quoteName('name') . ' = ' . $db->quoteName('name');

        $db->setQuery($query);
        $db->execute();
    }
}

}
