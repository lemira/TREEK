<?php
/**
 * @package     Joomla.Site
 * @subpackage  Kunena.Template.Treek
 *
 * @copyright   Copyright (C) 2026 Your Name / Treek Project
 * @license     GNU General Public License v3.0
 */

namespace Treek\Component\Treek\Site\Model;

defined('_JEXEC') or die;

use Joomla\CMS\Factory;
use Joomla\CMS\MVC\Model\BaseDatabaseModel;
use Kunena\Forum\Libraries\Topic\KunenaForumTopicHelper;
use Kunena\Forum\Libraries\Message\KunenaForumMessage;

/**
 * TreekModel - построение дерева темы на основе объектов Kunena 7
 */
class TreekModel extends BaseDatabaseModel
{
    private $allPosts = [];    // Массив всех объектов KunenaForumMessage темы
    private $threadId = 0;
    private $finalPostIds = []; // ID только опубликованных постов (hold=0)

    /**
     * Основной метод инициализации данных темы
     */
    public function loadTopicData(int $threadId)
    {
        $this->threadId = $threadId;
        $topic = KunenaForumTopicHelper::get($threadId);
        
        if (!$topic->exists()) {
            return false;
        }

        // К- возвращает массив объектов, где ключи — это ID сообщений
        $this->allPosts = $topic->getMessages();
        
        // Формируем список только разрешенных к показу ID (аналог вашего getAllThreadPosts)
        $this->finalPostIds = [];
        foreach ($this->allPosts as $post) {
            if ($post->hold == 0) {
                $this->finalPostIds[] = $post->id;
            }
        }
        
        // Для корректной работы дерева важна сортировка по ID (хронология)
        sort($this->finalPostIds);
        
        return $topic->first_message_id;
    }

    /**
     * Транслятор для доступа к данным поста (без запросов к БД)
     */
    public function openPost(int $postId)
    {
        if (isset($this->allPosts[$postId])) {
            $post = $this->allPosts[$postId];
            return [
                'id'      => $post->id,
                'parent'  => $post->parent,
                'subject' => $post->subject,
                'userid'  => $post->userid,
                'time'    => $post->time,
                'hold'    => $post->hold
            ];
        }
        return null;
    }

    /**
     * Построение древовидного списка ID
     */
    public function buildTree(int $firstPostId)
    {
        // 1. Строим полную карту связей из ВСЕХ постов темы
        $fullChildrenMap = [];
        foreach ($this->allPosts as $post) {
            if ($post->parent > 0) {
                $fullChildrenMap[$post->parent][] = $post->id;
            }
        }

        // 2. Восстанавливаем связи для потомков удаленных/скрытых постов
        $recoveredChildren = [];
        foreach ($this->allPosts as $post) {
            // Если пост виден, но его родитель скрыт/удален
            if (in_array($post->id, $this->finalPostIds) && 
                $post->parent > 0 && 
                !in_array($post->parent, $this->finalPostIds)) {
              // Находим нового родителя: поднимаемся по цепочке пока не найдем существующего 
                $newParent = $this->findClosestExistingParent($post->parent);
                
                if ($newParent > 0) {
                    $recoveredChildren[$newParent][] = $post->id;
                } else {
                 // Если не нашли существующего родителя в цепочке - прикрепляем к корню
                    $recoveredChildren[$firstPostId][] = $post->id;
                }
            }
        }

        // 3. Собираем финальную структуру детей - Объединяем восстановленные связи с обычными
        $children = [];
        foreach ($this->finalPostIds as $postId) {
            $children[$postId] = [];

            // Добавляем прямых детей, если они видны
            if (isset($fullChildrenMap[$postId])) {
                foreach ($fullChildrenMap[$postId] as $childId) {
                    if (in_array($childId, $this->finalPostIds)) {
                        $children[$postId][] = $childId;
                    }
                }
            }

            // Добавляем восстановленных детей
            if (isset($recoveredChildren[$postId])) {
                $children[$postId] = array_merge($children[$postId], $recoveredChildren[$postId]);
            }
        // Сортируем и убираем дубликаты
            if (!empty($children[$postId])) {
                $children[$postId] = array_unique($children[$postId]);
                sort($children[$postId]);
            }
        }

        // 4. Рекурсивный обход дерева
        $postIdList = [];
        $postLevelList = [];
        $this->traverseTree($firstPostId, 0, $children, $postIdList, $postLevelList);

        return [
            'postIds' => $postIdList,
            'levels'  => $postLevelList
        ];
    }

     /**
     * Находим ближайшего существующего родителя в цепочке
     */
     private function findClosestExistingParent(int $deletedParentId)
    {
        $currentId = $deletedParentId;
       // Поднимаемся по цепочке родителей
        while (isset($this->allPosts[$currentId])) {
            $currentPost = $this->allPosts[$currentId];
            // Если нашли существующего родителя - возвращаем его
            if (in_array($currentPost->id, $this->finalPostIds)) {
                return $currentPost->id;
            }
           // Переходим к следующему родителю ?? не надо ли как в модели? if ($currentPost->parent > 0) {$currentId = $currentPost->parent; } else {break; // Достигли корня}
            $currentId = $currentPost->parent;
        }
        return 0;
    }

    private function traverseTree($postId, $level, $children, &$postIdList, &$postLevelList)
    {
        $postIdList[] = $postId;
        $postLevelList[] = $level;
        
        // Если у поста есть дети
        if (!empty($children[$postId])) {
            foreach ($children[$postId] as $childId) {
             // Рекурсивно обходим каждого ребенка
                $this->traverseTree($childId, $level + 1, $children, $postIdList, $postLevelList);
            }
        }
    }
}
