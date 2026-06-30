<?php
/**
 * @package      Treek
 * @subpackage   Plugin.Ajax
 * @copyright    Copyright (C) 2026 TreeK Project
 * @license      GNU General Public License v3.0
 */

defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\Log\Log;
use Joomla\CMS\Plugin\CMSPlugin;
use Joomla\CMS\Session\Session;

require_once __DIR__ . '/src/Model/TreekModel.php';

use Treek\Plugin\Ajax\Treek\Model\TreekModel;

class PlgAjaxTreek extends CMSPlugin
{
    public function __construct(&$subject, $config = [])
    {
        parent::__construct($subject, $config);
        $this->loadLanguage();
    }

    public function onAjaxTreek(): void
    {
        $app = Factory::getApplication();
        $task = $app->input->getCmd('task', '');
        $topicId = $app->input->getInt('topic_id', 0);
        $requestToken = $this->getRequestTokenName();

        if ($task !== 'signature') {
            $this->debugAjaxLog('request', [
                'task' => $task ?: 'tree',
                'topic_id' => $topicId,
                'method' => $_SERVER['REQUEST_METHOD'] ?? '',
                'token' => $this->tokenFingerprint($requestToken),
                'uri' => $_SERVER['REQUEST_URI'] ?? '',
            ]);
        }

        if ($task === 'token') {
            $token = Session::getFormToken();

            $this->debugAjaxLog('token_issued', [
                'token' => $this->tokenFingerprint($token),
            ]);

            $this->sendJson(['token' => $token]);
            return;
        }

        if (in_array($task, ['params_save', 'params_restore'], true) && !Session::checkToken('get')) {
            $this->debugAjaxLog('invalid_token', [
                'task' => $task,
                'topic_id' => $topicId,
                'token' => $this->tokenFingerprint($requestToken),
            ]);

            $this->sendJson(['error' => 'Invalid token']);
            return;
        }

        if ($topicId <= 0) {
            $this->debugAjaxLog('bad_request', [
                'task' => $task ?: 'tree',
                'topic_id' => $topicId,
                'error' => 'topic_id required',
            ]);

            $this->sendJson(['error' => 'topic_id required']);
            return;
        }

        if ($task === 'params_save') {
            $userId = (int) $app->getIdentity()->id;

            if ($userId <= 0) {
                $this->debugAjaxLog('params_save_denied', [
                    'topic_id' => $topicId,
                    'error' => 'Login required',
                ]);

                $this->sendJson(['error' => 'Login required']);
                return;
            }

            $payload = json_decode((string) file_get_contents('php://input'), true);
            $settings = is_array($payload['settings'] ?? null) ? $payload['settings'] : [];

            $this->saveUserParameters($userId, $this->filterUserSettings($settings));

            $this->debugAjaxLog('params_saved', [
                'topic_id' => $topicId,
                'user_id' => $userId,
            ]);

            $this->sendJson([
                'success' => true,
                'userParams' => [
                    'canSave' => true,
                    'hasSaved' => true,
                ],
            ]);

            return;
        }

        if ($task === 'params_restore') {
            $userId = (int) $app->getIdentity()->id;

            if ($userId <= 0) {
                $this->debugAjaxLog('params_restore_denied', [
                    'topic_id' => $topicId,
                    'error' => 'Login required',
                ]);

                $this->sendJson(['error' => 'Login required']);
                return;
            }

            $settings = $this->loadUserParameters($userId);

            if ($settings === null) {
                $this->debugAjaxLog('params_restore_empty', [
                    'topic_id' => $topicId,
                    'user_id' => $userId,
                ]);

                $this->sendJson(['error' => 'No saved parameters']);
                return;
            }

            $this->debugAjaxLog('params_restored', [
                'topic_id' => $topicId,
                'user_id' => $userId,
            ]);

            $this->sendJson([
                'settings' => $settings,
                'userParams' => [
                    'canSave' => true,
                    'hasSaved' => true,
                ],
            ]);

            return;
        }

        if ($task === 'signature') {
            $db = Factory::getContainer()->get('DatabaseDriver');

            $query = $db->getQuery(true)
                ->select('MAX(id) AS last_post_id')
                ->from($db->quoteName('#__kunena_messages'))
                ->where($db->quoteName('thread') . ' = ' . (int) $topicId)
                ->where($db->quoteName('hold') . ' = 0');

            $db->setQuery($query);
            $lastPostId = (int) $db->loadResult();

            $this->sendJson([
                'lastPostId' => $lastPostId,
            ]);

            return;
        }

        $bootstrap = JPATH_ADMINISTRATOR . '/components/com_kunena/api/api.php';

        if (!defined('KPATH_FRAMEWORK') && file_exists($bootstrap)) {
            require_once $bootstrap;
        }

        if (class_exists('\Kunena\Forum\Libraries\Forum\KunenaForum')) {
            \Kunena\Forum\Libraries\Forum\KunenaForum::setup();
        }

        if ($task === 'parent_url') {
            $postId = $app->input->getInt('post_id', 0);

            if ($postId <= 0) {
                $this->debugAjaxLog('parent_url_error', [
                    'topic_id' => $topicId,
                    'error' => 'post_id required',
                ]);

                $this->sendJson(['error' => 'post_id required']);
                return;
            }

            $db = Factory::getContainer()->get('DatabaseDriver');

            $query = $db->getQuery(true)
                ->select($db->quoteName(['id', 'parent', 'thread', 'hold']))
                ->from($db->quoteName('#__kunena_messages'))
                ->where($db->quoteName('thread') . ' = ' . (int) $topicId);

            $db->setQuery($query);
            $rows = (array) $db->loadObjectList('id');

            if (empty($rows[$postId])) {
                $this->debugAjaxLog('parent_url_error', [
                    'topic_id' => $topicId,
                    'post_id' => $postId,
                    'error' => 'post not found',
                ]);

                $this->sendJson(['error' => 'post not found']);
                return;
            }

            $topic = \Kunena\Forum\Libraries\Forum\Topic\KunenaTopicHelper::get($topicId);
            $rootId = (int) ($topic->first_post_id ?? 0);

            $parentId = (int) $rows[$postId]->parent;
            $visited = [];
            $targetId = $rootId;

            while ($parentId > 0 && !isset($visited[$parentId])) {
                $visited[$parentId] = true;

                if (empty($rows[$parentId])) {
                    break;
                }

                $parentRow = $rows[$parentId];

                if ((int) $parentRow->hold === 0) {
                    $targetId = (int) $parentRow->id;
                    break;
                }

                $parentId = (int) $parentRow->parent;
            }

            $targetPost = \Kunena\Forum\Libraries\Forum\Message\KunenaMessageHelper::get($targetId);

            $this->sendJson([
                'url' => $targetPost->getUrl(null, true),
                'targetId' => $targetId,
            ]);

            return;
        }

        try {
            if (class_exists('\Kunena\Forum\Libraries\Forum\KunenaForum')) {
                \Kunena\Forum\Libraries\Forum\KunenaForum::setup();
            }

            if (!interface_exists('\Kunena\Forum\Libraries\Config\KunenaConfigInterface')) {
                $boot = JPATH_LIBRARIES . '/kunena/bootstrap.php';

                if (file_exists($boot)) {
                    require_once $boot;
                }
            }

            $model = new TreekModel();
            $firstMsgId = $model->loadTopicData($topicId);

            if (!$firstMsgId) {
                $this->debugAjaxLog('tree_error', [
                    'topic_id' => $topicId,
                    'error' => 'Topic not found or empty',
                ]);

                $this->sendJson(['error' => 'Topic not found or empty']);
                return;
            }

            $params = [
    'show_author' => true,
    'show_time' => true,
    'show_postid' => true,
    'date_format' => 'd.m.Y H:i',
    'indent_px' => 16,
];

            $tree = $model->buildTree($firstMsgId, $params);

            if (!empty($tree['rows'])) {
                $parserClass = '\Kunena\Forum\Libraries\Html\KunenaParser';

                foreach ($tree['rows'] as &$row) {
                    $rawText = $row['message'] ?? '';

                    if (!empty($rawText) && class_exists($parserClass)) {
                        $messageObject = null;
                        $messageHelperClass = '\Kunena\Forum\Libraries\Forum\Message\KunenaMessageHelper';

                        if (class_exists($messageHelperClass) && !empty($row['id'])) {
                            $messageObject = $messageHelperClass::get((int) $row['id']);
                        }

                        $html = (string) $parserClass::parseBBCode($rawText, $messageObject, 0);

                        $plain = $html;
                        $plain = preg_replace('~<\s*br\s*/?\s*>~iu', "\n", $plain);
                        $plain = preg_replace('~</\s*(p|div|li|tr|h[1-6]|blockquote)\s*>~iu', "\n", $plain);
                        $plain = strip_tags($plain);
                        $plain = html_entity_decode($plain, ENT_QUOTES, 'UTF-8');
                        $plain = str_replace(["\r\n", "\r"], "\n", $plain);
                        $plain = preg_replace('/[ \t]+/u', ' ', $plain);
                        $plain = preg_replace('/[ \t]*\n[ \t]*/u', "\n", $plain);
                        $plain = preg_replace("/\n{3,}/u", "\n\n", $plain);
                        $plain = trim($plain);

                        $row['text'] = preg_replace('/\s+/u', ' ', $plain);
                        $row['tooltip'] = mb_substr($plain, 0, 400);
                        $row['teaserHtml'] = $html;
                    } else {
                        $row['text'] = '';
                        $row['tooltip'] = '';
                        $row['teaserHtml'] = '';
                    }

                    unset($row['message']);
                }

                unset($row);
            }

            $tree['params'] = $params;

            $kunenaConfig = \Kunena\Forum\Libraries\Factory\KunenaFactory::getConfig();
            $tree['messagesPerPage'] = (int) ($kunenaConfig->messagesPerPage ?? 20);

            $userId = (int) $app->getIdentity()->id;

            $tree['userParams'] = [
                'canSave' => $userId > 0,
                'hasSaved' => $userId > 0 ? $this->hasUserParameters($userId) : false,
            ];

            $this->debugAjaxLog('tree_success', [
                'topic_id' => $topicId,
                'rows' => count($tree['rows'] ?? []),
                'last_post_id' => $tree['lastPostId'] ?? 0,
            ]);

            $this->sendJson($tree);
        } catch (\Throwable $e) {
            $this->debugAjaxLog('server_error', [
                'topic_id' => $topicId,
                'message' => $e->getMessage(),
            ]);

            $this->sendJson(['error' => 'Server error: ' . $e->getMessage()]);
        }
    }

    private function hasUserParameters(int $userId): bool
    {
        $db = Factory::getContainer()->get('DatabaseDriver');

        $query = $db->getQuery(true)
            ->select('COUNT(*)')
            ->from($db->quoteName('#__treek_user_parameters'))
            ->where($db->quoteName('user_id') . ' = ' . (int) $userId)
            ->where($db->quoteName('context') . ' = ' . $db->quote('default'));

        $db->setQuery($query);

        return (int) $db->loadResult() > 0;
    }

    private function loadUserParameters(int $userId): ?array
    {
        $db = Factory::getContainer()->get('DatabaseDriver');

        $query = $db->getQuery(true)
            ->select($db->quoteName('settings'))
            ->from($db->quoteName('#__treek_user_parameters'))
            ->where($db->quoteName('user_id') . ' = ' . (int) $userId)
            ->where($db->quoteName('context') . ' = ' . $db->quote('default'));

        $db->setQuery($query);
        $json = (string) $db->loadResult();

        if ($json === '') {
            return null;
        }

        $settings = json_decode($json, true);

        return is_array($settings) ? $this->filterUserSettings($settings) : null;
    }

    private function saveUserParameters(int $userId, array $settings): void
    {
        $db = Factory::getContainer()->get('DatabaseDriver');
        $now = Factory::getDate()->toSql();
        $json = json_encode($settings, JSON_UNESCAPED_UNICODE);

        $query = $db->getQuery(true)
            ->select($db->quoteName('id'))
            ->from($db->quoteName('#__treek_user_parameters'))
            ->where($db->quoteName('user_id') . ' = ' . (int) $userId)
            ->where($db->quoteName('context') . ' = ' . $db->quote('default'));

        $db->setQuery($query);
        $id = (int) $db->loadResult();

        if ($id > 0) {
            $query = $db->getQuery(true)
                ->update($db->quoteName('#__treek_user_parameters'))
                ->set($db->quoteName('settings') . ' = ' . $db->quote($json))
                ->set($db->quoteName('updated_at') . ' = ' . $db->quote($now))
                ->where($db->quoteName('id') . ' = ' . (int) $id);
        } else {
            $columns = ['user_id', 'context', 'settings', 'created_at', 'updated_at'];
            $values = [
                (int) $userId,
                $db->quote('default'),
                $db->quote($json),
                $db->quote($now),
                $db->quote($now),
            ];

            $query = $db->getQuery(true)
                ->insert($db->quoteName('#__treek_user_parameters'))
                ->columns($db->quoteName($columns))
                ->values(implode(',', $values));
        }

        $db->setQuery($query);
        $db->execute();
    }

    private function filterUserSettings(array $settings): array
    {
        $filtered = [];

        foreach (['view', 'primary', 'gridMode', 'teaserMode'] as $key) {
            if (isset($settings[$key])) {
                $filtered[$key] = (string) $settings[$key];
            }
        }

        foreach ([
            'showTime',
            'showIndex',
            'showGrid',
            'showComfortTools',
            'showNavTools',
            'showHighlightTools',
            'showTeaser',
        ] as $key) {
            if (array_key_exists($key, $settings)) {
                $filtered[$key] = (bool) $settings[$key];
            }
        }

        if (isset($settings['teaserLen'])) {
            $filtered['teaserLen'] = max(10, min(1000, (int) $settings['teaserLen']));
        }

        if (isset($settings['timeFormat']) && is_array($settings['timeFormat'])) {
            $filtered['timeFormat'] = [
                'year' => (string) ($settings['timeFormat']['year'] ?? '4'),
                'showClock' => (bool) ($settings['timeFormat']['showClock'] ?? true),
            ];
        }

        return $filtered;
    }

    private function getRequestTokenName(): string
    {
        foreach ($_GET as $key => $value) {
            if ((string) $value === '1' && preg_match('/^[a-f0-9]{32}$/i', (string) $key)) {
                return (string) $key;
            }
        }

        return '';
    }

    private function tokenFingerprint(string $token): string
    {
        if ($token === '') {
            return '';
        }

        return substr($token, 0, 8) . '...' . substr($token, -6);
    }

    private function debugAjaxLog(string $event, array $context = []): void
    {
        if ((int) $this->params->get('debug_ajax', 0) !== 1) {
            return;
        }

        static $loggerAdded = false;

        if (!$loggerAdded) {
            Log::addLogger(
                ['text_file' => 'treek_ajax.php'],
                Log::INFO,
                ['treek.ajax']
            );

            $loggerAdded = true;
        }

        $safeContext = [];

        foreach ($context as $key => $value) {
            if (is_scalar($value) || $value === null) {
                $safeContext[$key] = mb_substr((string) $value, 0, 500);
            }
        }

        Log::add(
            $event . ' ' . json_encode($safeContext, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            Log::INFO,
            'treek.ajax'
        );
    }

    private function sendJson(array $data): void
    {
        while (ob_get_level() > 0) {
            ob_end_clean();
        }

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data);
        Factory::getApplication()->close();
    }
}
