<?php
/**
 * Kunena Component
 *
 * @package         Kunena.Template.Treek
 * @subpackage      Template
 *
 * @copyright       Copyright (C) 2026 Your Name / Leonid Ratner. All rights reserved.
 * @license         https://www.gnu.org/copyleft/gpl.html GNU/GPL
 * @link            https://www.kunena.org
 **/

defined('_JEXEC') or die();

use Joomla\CMS\Factory;
use Joomla\CMS\HTML\HTMLHelper;
use Joomla\CMS\Language\Text;
use Kunena\Forum\Libraries\Factory\KunenaFactory;
use Kunena\Forum\Libraries\Template\KunenaTemplate;
use Joomla\CMS\Session\Session;

/**
 * Treek template (based on Aurelia)
 *
 * @since   Kunena 6.0
 */
class KunenaTemplatetreek extends KunenaTemplate
{
    private ?array $treekViewFeatures = null;
    private ?bool $treekAvailable = null;

    protected $default = ['treek'];

    protected $pathTypes = [
        'emoticons'     => 'media/kunena/emoticons',
        'ranks'         => 'media/kunena/ranks',
        'icons'         => 'media/kunena/icons',
        'categoryIcons' => 'media/kunena/category_icons',
        'images'        => 'media/kunena/core/images',
        'js'            => 'media/kunena/core/js',
        'css'           => 'media/kunena/core/css',
    ];

    protected $userClasses = [
        'kwho-',
        'admin'     => 'kwho-admin',
        'globalmod' => 'kwho-globalmoderator',
        'moderator' => 'kwho-moderator',
        'user'      => 'kwho-user',
        'guest'     => 'kwho-guest',
        'banned'    => 'kwho-banned',
        'blocked'   => 'kwho-blocked',
    ];

    public function loadLanguage(): void
    {
        $lang = Factory::getApplication()->getLanguage();
        KunenaFactory::loadLanguage('kunena_tmpl_treek');
    
        foreach (array_reverse($this->default) as $template) {
            $file = "kunena_tmpl_treek";
            $lang->load($file, JPATH_SITE) || $lang->load($file, KPATH_SITE) || $lang->load($file, KPATH_SITE . "/template/{$template}");
        }
    }

    /**
     * Template initialization.
     */
    public function initialize(): void
    {
        // ====================== TREEK LANGUAGE LOAD (один раз на страницу) ======================
        static $treekLangLoaded = false;
        if (!$treekLangLoaded) {
            Factory::getLanguage()->load('plg_ajax_treek', JPATH_PLUGINS . '/ajax/treek', null, true);
            $treekLangLoaded = true;
        }
        // ====================== END TREEK LANGUAGE ======================

        // ====================== TREEK GLOBAL INITIALIZATION ======================
        static $treekInitDone = false;
        if (!$treekInitDone) {
            $doc = Factory::getApplication()->getDocument();

            // Загружаем язык плагина
            Factory::getLanguage()->load('plg_ajax_treek', JPATH_PLUGINS . '/ajax/treek', null, true);

            // Подключаем стили и скрипт TreeK
            $doc->addStyleSheet('media/plg_ajax_treek/css/treek.css?v=' . time());
            $doc->addScript('media/plg_ajax_treek/js/treek.js?v=' . time());

            $treekViewFeatures = json_encode($this->loadTreekViewFeatures(), JSON_UNESCAPED_UNICODE);
            $doc->addScriptDeclaration("window.treekViewFeatures = {$treekViewFeatures};");

// Языковые строки для JS: автоматически берём все TREEK_* ключи из текущего ini-файла.
$lang = Factory::getLanguage();
$langTag = $lang->getTag();

$langFiles = [
    JPATH_PLUGINS . '/ajax/treek/language/' . $langTag . '/' . $langTag . '.plg_ajax_treek.ini',
    JPATH_PLUGINS . '/ajax/treek/language/en-GB/en-GB.plg_ajax_treek.ini',
];

$treekLangs = [];

foreach ($langFiles as $langFile) {
    if (!is_file($langFile)) {
        continue;
    }

    $strings = parse_ini_file($langFile, false, INI_SCANNER_RAW);

    if (!is_array($strings)) {
        continue;
    }

    foreach ($strings as $key => $value) {
        if (str_starts_with($key, 'TREEK_')) {
            $treekLangs[$key] = Text::_($key);
        }
    }
}

$langs = json_encode($treekLangs, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_THROW_ON_ERROR);


            $doc->addScriptDeclaration("window.treekLangs = {$langs};");

            $treekInitDone = true;
        }
        // ====================== END TREEK INIT ======================

        // === Оригинальный код treek (ничего не трогаем ниже) ===
        $bootstrap = $this->params->get('bootstrap');

        if ($bootstrap) {
            HTMLHelper::_('bootstrap.loadCss');
            HTMLHelper::_('bootstrap.dropdown');
            HTMLHelper::_('bootstrap.tooltip');
            HTMLHelper::_('bootstrap.renderModal');
            HTMLHelper::_('bootstrap.collapse');
            HTMLHelper::_('bootstrap.offcanvas');
            HTMLHelper::_('bootstrap.alert');
        }

        $doc = Factory::getApplication()->getDocument();

        /** @var Joomla\CMS\WebAsset\WebAssetManager $wa */
        $wa = $doc->getWebAssetManager();
        $wa->useScript('jquery');

        $this->addScript('assets/js/main.js');
        $this->addScript('assets/js/tooltips.js');
        $this->addScript('assets/js/treek_view.js');

        if (!file_exists(JPATH_SITE . 'media/kunena/cache/')) {
            $this->createCacheDir();
        }

        if ($bootstrap) {
            $this->addScript('assets/js/offcanvas.js');
        }

        $this->addStyleSheet('kunena.css');

        $storage = $this->params->get('localstorage');
        if ($storage) {
            $this->addScript('localstorage.js');
        }

        $filenamescss = JPATH_SITE . '/components/com_kunena/template/treek/assets/scss/custom.scss';
        if (file_exists($filenamescss) && 0 != fileSize($filenamescss)) {
            $this->addStyleSheet('kunena-custom.css');
        }

        $filename = KPATH_MEDIA . '/core/css/custom.css';
        if (file_exists($filename)) {
            $this->addStyleSheet('custom.css');
        }

        $this->loadFontawesome();

        // Load template colors settings
        $styles = <<<EOF
        /* Kunena Custom CSS */
EOF;

        $iconcolor = $this->params->get('IconColor');
        if ($iconcolor) {
            $styles .= <<<EOF
        .layout#kunena [class*="category"] i,
        .layout#kunena .glyphicon-topic,
        .layout#kunena #kwho i.icon-users,
        .layout#kunena#kstats i.icon-bars { color: {$iconcolor}; }
EOF;
        }

        $iconcolornew = $this->params->get('IconColorNew');
        if ($iconcolornew) {
            $styles .= <<<EOF
        .layout#kunena [class*="category"] .knewchar { color: {$iconcolornew} !important; }
        .layout#kunena sup.knewchar { color: {$iconcolornew} !important; }
        .layout#kunena .topic-item-unread { border-left-color: {$iconcolornew} !important;}
        .layout#kunena .topic-item-unread .glyphicon { color: {$iconcolornew} !important;}
        .layout#kunena .topic-item-unread i.fa { color: {$iconcolornew} !important;}
        .layout#kunena .topic-item-unread svg { color: {$iconcolornew} !important;}
EOF;
        }

        $doc->addStyleDeclaration($styles);

        $this->addScriptOptions('com_kunena.tooltips', $this->params->get('tooltips'));

        parent::initialize();
    }

    public function treekFeature(string $feature): bool
    {
        $features = $this->loadTreekViewFeatures();

        return !empty($features[$feature]);
    }

    public function canUseTreek(): bool
    {
        if ($this->treekAvailable !== null) {
            return $this->treekAvailable;
        }

        try {
            $db = Factory::getDbo();
            $query = $db->getQuery(true)
                ->select([
                    $db->quoteName('enabled'),
                    $db->quoteName('access'),
                ])
                ->from($db->quoteName('#__extensions'))
                ->where($db->quoteName('type') . ' = ' . $db->quote('plugin'))
                ->where($db->quoteName('folder') . ' = ' . $db->quote('ajax'))
                ->where($db->quoteName('element') . ' = ' . $db->quote('treek'))
                ->setLimit(1);

            $db->setQuery($query);
            $plugin = $db->loadObject();

            if (!$plugin || !(int) $plugin->enabled) {
                return $this->treekAvailable = false;
            }

            $levels = array_map('intval', Factory::getApplication()->getIdentity()->getAuthorisedViewLevels());

            return $this->treekAvailable = in_array((int) $plugin->access, $levels, true);
        } catch (\Throwable $e) {
            return $this->treekAvailable = false;
        }
    }

    private function loadTreekViewFeatures(): array
    {
        if ($this->treekViewFeatures !== null) {
            return $this->treekViewFeatures;
        }

        $features = $this->loadGlobalTreekViewFeatures();
        $userId = (int) Factory::getApplication()->getIdentity()->id;

        if ($userId <= 0) {
            $this->treekViewFeatures = $features;

            return $this->treekViewFeatures;
        }

        try {
            $db = Factory::getContainer()->get('DatabaseDriver');
            $query = $db->getQuery(true)
                ->select($db->quoteName('settings'))
                ->from($db->quoteName('#__treek_user_parameters'))
                ->where($db->quoteName('user_id') . ' = ' . (int) $userId);

            $db->setQuery($query);
            $json = (string) $db->loadResult();
        } catch (\Throwable $e) {
            $this->treekViewFeatures = $features;

            return $this->treekViewFeatures;
        }

        if ($json === '') {
            $this->treekViewFeatures = $features;

            return $this->treekViewFeatures;
        }

        $saved = json_decode($json, true);

        if (!is_array($saved)) {
            $this->treekViewFeatures = $features;

            return $this->treekViewFeatures;
        }

        $savedFeatures = is_array($saved['treekViewFeatures'] ?? null) ? $saved['treekViewFeatures'] : [];

        foreach (array_keys($features) as $key) {
            if (array_key_exists($key, $savedFeatures)) {
                $features[$key] = (bool) $savedFeatures[$key];
            }
        }

        $this->treekViewFeatures = $features;

        return $this->treekViewFeatures;
    }

    private function getDefaultTreekViewFeatures(): array
    {
        return [
            'parent_post_navigation' => true,
            'reply_form_treek_look' => false,
            'subject_suffix' => false,
            'attachments_toggle' => false,
            'inline_action_buttons' => false,
        ];
    }

    private function loadGlobalTreekViewFeatures(): array
    {
        $features = $this->getDefaultTreekViewFeatures();

        try {
            $db = Factory::getContainer()->get('DatabaseDriver');
            $keys = array_keys($features);
            $query = $db->getQuery(true)
                ->select($db->quoteName(['name', 'value']))
                ->from($db->quoteName('#__treek_global_parameters'))
                ->where($db->quoteName('name') . ' IN (' . implode(',', array_map([$db, 'quote'], $keys)) . ')');

            $db->setQuery($query);
            $rows = (array) $db->loadAssocList('name');
        } catch (\Throwable $e) {
            return $features;
        }

        foreach ($features as $key => $default) {
            if (isset($rows[$key])) {
                $features[$key] = $this->toBoolean($rows[$key]['value'] ?? $default);
            }
        }

        return $features;
    }

    private function toBoolean($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return in_array(strtolower(trim((string) $value)), ['1', 'true', 'yes', 'on'], true);
    }

    // === Остальные методы getButton, getIcon, getImage — оставляем без изменений ===
    public function getButton($link, $name, $scope, $type, $id = null): string
    {
        $buttonsDropdown = ['reply', 'quote', 'edit', 'delete', 'subscribe', 'unsubscribe', 'unfavorite', 'favorite', 'unsticky', 'sticky', 'unlock', 'lock', 'moderate', 'undelete', 'permdelete', 'flat', 'threaded', 'indented'];

        $text  = Text::_("COM_KUNENA_BUTTON_{$scope}_{$name}");
        $title = Text::_("COM_KUNENA_BUTTON_{$scope}_{$name}_LONG");

        if ($title == "COM_KUNENA_BUTTON_{$scope}_{$name}_LONG") {
            $title = '';
        }

        if ($id) {
            $id = 'id="' . $id . '"';
        }

        if (in_array($name, $buttonsDropdown)) {
            return <<<HTML
                <a {$id} style="" href="{$link}" rel="nofollow" data-bs-toggle="tooltip" title="{$title}">
                {$text}
                </a>
HTML;
        } else {
            return <<<HTML
                <a {$id} style="" href="{$link}" rel="nofollow" data-bs-toggle="tooltip" title="{$title}">
                <span class="{$name}"></span>
                {$text}
                </a>
HTML;
        }
    }

    public function getIcon($name, $title = ''): string
    {
        return '<span class="kicon ' . $name . '" data-bs-toggle="tooltip" title="' . $title . '"></span>';
    }

    public function getImage($image, $alt = ''): string
    {
        return '<img loading="lazy" src="' . $this->getImagePath($image) . '" alt="' . $alt . '" />';
    }
}
