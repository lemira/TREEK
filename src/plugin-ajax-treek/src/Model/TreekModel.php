<?php
/**
 * @package     Treek
 * @subpackage  Plugin.Ajax
 * @copyright   Copyright (C) 2026 Your Name
 * @license     GNU General Public License v3.0
 */

namespace Treek\Plugin\Ajax\Treek\Model;

defined('_JEXEC') or die;

use Kunena\Forum\Libraries\Forum\Topic\KunenaTopicHelper;

class TreekModel
{
    private array $allPosts     = [];
    private int   $threadId     = 0;
    private array $finalPostIds = [];
    private array $authorNames  = [];

    /** @var array  Карта id=>parent для ВСЕХ постов темы включая скрытые — для восстановления сирот */
    private array $allPostsParentMap = [];

    public function loadTopicData(int $threadId): int|false
    {
        $this->threadId = $threadId;
        $topic = KunenaTopicHelper::get($threadId);
        if (!$topic->exists()) {
            return false;
        }

        $db = \Joomla\CMS\Factory::getContainer()->get('DatabaseDriver');

        // Запрос 1: только опубликованные посты (hold=0) — для отображения
        $query = $db->createQuery();
        $query->select('m.id, m.parent, m.userid, m.subject, m.time, m.hold, t.message')
              ->from($db->quoteName('#__kunena_messages', 'm'))
              ->leftJoin(
                  $db->quoteName('#__kunena_messages_text', 't') .
                  ' ON ' . $db->quoteName('t.mesid') . ' = ' . $db->quoteName('m.id')
              )
              ->where($db->quoteName('m.thread') . ' = ' . (int) $threadId)
              ->where($db->quoteName('m.hold') . ' = 0')
              ->order($db->quoteName('m.time') . ' ASC');
        $db->setQuery($query);
        $rows = (array) $db->loadObjectList('id');

        $this->allPosts = $rows;

        // Запрос 2: id и parent ВСЕХ постов включая скрытые/удалённые —
        // нужен только для восстановления цепочки родителей у «сирот».
        // Лёгкий запрос: без JOIN, без авторов, два поля.
        $query3 = $db->createQuery();
        $query3->select('id, parent')
               ->from($db->quoteName('#__kunena_messages'))
               ->where($db->quoteName('thread') . ' = ' . (int) $threadId);
        $db->setQuery($query3);
        $allRows = (array) $db->loadObjectList('id');
        $this->allPostsParentMap = [];
        foreach ($allRows as $row) {
            $this->allPostsParentMap[(int) $row->id] = (int) $row->parent;
        }

        // Имена авторов
        $userIds = array_unique(array_filter(array_column($rows, 'userid')));
        $this->authorNames = [];
        if (!empty($userIds)) {
            $query2 = $db->createQuery();
            $query2->select('id, name, username')
                   ->from($db->quoteName('#__users'))
                   ->whereIn($db->quoteName('id'), array_map('intval', $userIds));
            $db->setQuery($query2);
            $this->authorNames = (array) $db->loadAssocList('id');
        }

        $this->finalPostIds = [];
        foreach ($this->allPosts as $post) {
            if ((int) $post->hold === 0) {
                $this->finalPostIds[] = (int) $post->id;
            }
        }
        sort($this->finalPostIds);

        return (int) $topic->first_post_id;
    }

    public function openPost(int $postId, array $params = []): ?array
    {
        if (!isset($this->allPosts[$postId])) {
            return null;
        }
        $post = $this->allPosts[$postId];

        $data = [
            'id'     => (int) $post->id,
            'parent' => (int) $post->parent,
            'hold'   => (int) $post->hold,
			'message' => $post->message, // <--- передача текста из объекта $post
        ];

$data['subject'] = html_entity_decode((string) $post->subject, ENT_QUOTES, 'UTF-8');

        if (!empty($params['show_author'])) {
            $uid = (int) $post->userid;
            if ($uid > 0 && isset($this->authorNames[$uid])) {
               $data['username'] = html_entity_decode(
    (string) ($this->authorNames[$uid]['username'] ?? ''),
    ENT_QUOTES,
    'UTF-8'
);

$data['author'] = $data['username'] !== ''
    ? $data['username']
    : html_entity_decode((string) $this->authorNames[$uid]['name'], ENT_QUOTES, 'UTF-8');

            } else {
                $data['author'] = $uid > 0 ? 'User#' . $uid : 'Guest';
            }
        }

        if (!empty($params['show_time'])) {
		$timestamp = is_numeric($post->time) ? (int) $post->time : strtotime((string) $post->time);

$data['raw_time'] = $timestamp ?: 0;

$fmt = $params['date_format'] ?? 'd.m.Y H:i';
$data['time'] = $timestamp ? date($fmt, $timestamp) : '';
        }

        if (!empty($params['show_postid'])) {
            $data['postid'] = (int) $post->id;
        }

        // Превью для tooltip: убираем теги через strip_tags
        if (!empty($post->message)) {
            $plain = strip_tags((string) $post->message);
            $plain = trim($plain);
            if ($plain !== '') {
                $data['preview'] = mb_substr($plain, 0, 400);
            }
        }

        return $data;
    }

    public function buildTree(int $firstPostId, array $params = []): array
    {
        // 1. Полная карта «родитель → дети» — из ВСЕХ постов включая скрытые
        $fullChildrenMap = [];
        foreach ($this->allPostsParentMap as $postId => $parentId) {
    $postId = (int) $postId;
    $parentId = (int) $parentId;

    if ($parentId > 0 && $parentId !== $postId) {
        $fullChildrenMap[$parentId][] = $postId;
    }
}
        // 2. Восстановление сирот — проходим по ВСЕМ постам темы
        $recoveredChildren = [];
        foreach ($this->allPostsParentMap as $postId => $parentId) {
            if (
                in_array($postId, $this->finalPostIds, true) &&
                $parentId > 0 &&
                !in_array($parentId, $this->finalPostIds, true)
            ) {
                $newParent = $this->findClosestExistingParent($parentId);
                $anchor    = $newParent > 0 ? $newParent : $firstPostId;
                $recoveredChildren[$anchor][] = $postId;
            }
        }

        $children = [];
        foreach ($this->finalPostIds as $postId) {
            $children[$postId] = [];
            if (isset($fullChildrenMap[$postId])) {
                foreach ($fullChildrenMap[$postId] as $childId) {
                    if (in_array($childId, $this->finalPostIds, true)) {
                        $children[$postId][] = $childId;
                    }
                }
            }
            if (isset($recoveredChildren[$postId])) {
                $children[$postId] = array_merge($children[$postId], $recoveredChildren[$postId]);
            }
            if (!empty($children[$postId])) {
                $children[$postId] = array_unique($children[$postId]);
                sort($children[$postId]);
            }
        }

        $postIdList    = [];
        $postLevelList = [];
        $visited = [];
$this->traverseTree($firstPostId, 0, $children, $postIdList, $postLevelList, $visited);

foreach ($this->finalPostIds as $postId) {
    if (!isset($visited[$postId])) {
        $this->traverseTree((int) $postId, 0, $children, $postIdList, $postLevelList, $visited);
    }
}
        $rows = [];
        foreach ($postIdList as $i => $pid) {
            $postData = $this->openPost($pid, $params);
            if ($postData !== null) {
                $postData['level'] = $postLevelList[$i];
                // Порядковый номер поста в теме (0-based, по времени).
                // Используется в JS для вычисления limitstart при пагинации.
                $postData['postIndex'] = array_search($pid, $this->finalPostIds);
                $rows[] = $postData;
            }
        }

$lastPostId = !empty($this->finalPostIds) ? max($this->finalPostIds) : $firstPostId;

// Достаем заголовок темы из первого поста или из KunenaTopic
$topicTitle = '';
if (!empty($this->allPosts[$firstPostId])) {
    $topicTitle = htmlspecialchars((string)$this->allPosts[$firstPostId]->subject, ENT_QUOTES, 'UTF-8');
}

$topic = \Kunena\Forum\Libraries\Forum\Topic\KunenaTopicHelper::get($this->threadId);
$topicTitle = $topic->subject;

return [
    'rows'       => $rows, 
    'lastPostId' => $lastPostId,
    'topicTitle' => $topicTitle 
];
    }

    private function findClosestExistingParent(int $deletedParentId): int
    {
        $currentId = $deletedParentId;
        $visited   = [];

        // Поднимаемся по цепочке родителей используя полную карту
        // (включая скрытые/удалённые посты)
        while (isset($this->allPostsParentMap[$currentId]) && !isset($visited[$currentId])) {
            $visited[$currentId] = true;

            // Если текущий пост живой — он и есть ближайший предок
            if (in_array($currentId, $this->finalPostIds, true)) {
                return $currentId;
            }

            $parentId = $this->allPostsParentMap[$currentId];
            if ($parentId <= 0) {
                break;
            }
            $currentId = $parentId;
        }

        return 0;
    }

    private function traverseTree(
    int $postId,
    int $level,
    array $children,
    array &$postIdList,
    array &$postLevelList,
    array &$visited = []
): void {
    if ($postId <= 0 || isset($visited[$postId])) {
        return;
    }

    $visited[$postId] = true;

    $postIdList[]    = $postId;
    $postLevelList[] = $level;

    if (!empty($children[$postId])) {
        foreach ($children[$postId] as $childId) {
            $childId = (int) $childId;

            if ($childId <= 0 || $childId === $postId || isset($visited[$childId])) {
                continue;
            }

            $this->traverseTree($childId, $level + 1, $children, $postIdList, $postLevelList, $visited);
        }
    }
}
}
