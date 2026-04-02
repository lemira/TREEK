<?php
/**
 * @package     Joomla.Administrator
 * @subpackage  TREEK
 *
 * @copyright   Copyright (C) 2023 Open Source Matters, Inc. All rights reserved.
 * @license     GNU General Public License v3.0; see LICENSE.txt
 */

namespace ???;

defined('_JEXEC') or die;

// Убрать ненужные use !!
use Joomla\CMS\Factory;
use Joomla\CMS\MVC\Model\BaseDatabaseModel;
use Joomla\CMS\Language\Text;
use Joomla\CMS\Component\ComponentHelper;
use Joomla\CMS\Table\Table;
use Joomla\Registry\Registry;
use Joomla\CMS\Date\Date;
use Joomla\CMS\Router\Route;
use Joomla\CMS\Uri\Uri;
use Joomla\Database\DatabaseInterface;
use Joomla\CMS\MVC\Factory\MVCFactoryInterface;
// use Kunena\Bbcode\KunenaBbcode; 
use Joomla\CMS\HTML\HTMLHelper;
use Joomla\CMS\Filter\InputFilter;
use Joomla\Component\Content\Site\Helper\RouteHelper;
use Joomla\CMS\Access\Access;
use Joomla\CMS\Filter\OutputFilter as FilterOutput;
use Joomla\Component\KunenaTopic2Article\Administrator\Parser\BBCode;
use Joomla\Component\KunenaTopic2Article\Administrator\Parser\Tag; // подгрузка класса при компиляции файла, BBCode сможет делать new Tag()
use Joomla\Component\KunenaTopic2Article\Administrator\Helper\VideoProcessor;

/**
 * TREEK - файл шаблона дерева
 * @since  0.0.1
 */
class ?? extends ??
{
    protected $db; // @var \Joomla\Database\DatabaseInterface 
    protected $app; /** @var \Joomla\CMS\Application\CMSApplication */
    private int $postId = 0;   // Текущий ID поста @var    int
    // !! subject, userid, time
    private int $threadId = 0;  // Id темы
    private $currentPost = null;  // Текущий пост @var    object
    private string $subject = ''; // Переменная модели для хранения subject
    private $params = null; // Хранение параметров для доступа в других методах
    private int $firstPostId; //  ID первого поста темы
    private $postIdList = []; // Список ID постов для обработки @var    array
    private $postLevelList = []; // СоответствующиеID постов уровни вложенности
    private int $currentIndex = 0; // первый переход с первого элемента $threadId = $firstPostId (0) на 2-й (1)
    private $allPosts = []; // Добавляем свойство для хранения всех постов
    
    public function __construct($config = [])
     {
        parent::__construct($config);
        
        $this->app = Factory::getApplication();
        $this->db = $this->getDatabase();
     }   
     
   
    // --------------------------- РАБОТА С ПОСТАМИ -------------------
    /**
     * Открытие поста для доступа к его параметрам
     * @param   int  $postId  ID поста
     * @return  ??
       */
     private function openPost($postId) {
// К-openPost($postId);
// Получаем данные поста 
// return id, subject, userid, time (или в глобальные переменные)
}


    
    /**
     * Переход к следующему посту
     * @return  int  ID следующего поста или 0, если больше нет постов
     */
   private function nextPost()
{
    $this->currentIndex += 1;
    $this->postId = $this->postIdList[$this->currentIndex];
  // ОТЛАДКА    Factory::getApplication()->enqueueMessage('nextPost Id: ' . $this->postId, 'info'); // ОТЛАДКА       
    return $this->postId; // Автоматически получим 0 в конце
}

 // -------------------------- РАБОТА СО СТРУКТУРОЙ СТАТЕЙ ---------------------
 private function getAllThreadPosts($threadId)  {
$topic_id = $threadId;
 return KunenaForumTopicHelper::getMessages($topic_id);
  }

    /** ДЛЯ СРАВНЕНИЯ КОД ИЗ МОДЕЛИ
    
   private function getAllThreadPosts($threadId)           
     {
     // Получаем все посты темы
    $query = $this->db->getQuery(true)
    ->select($this->db->quoteName('id'))
    ->from($this->db->quoteName('#__kunena_messages'))
    ->where($this->db->quoteName('thread') . ' = ' . $this->threadId) 
    ->where($this->db->quoteName('hold') . ' = 0');

         $query->order($this->db->quoteName('id') . ' ASC');
         $postIds = $this->db->setQuery($query)->loadColumn();
             return $postIds;
  }
  */

    
/**
 * Построение списков ID постов и их уровней для древовидного обхода
 * @param   int  $firstPostId  ID первого поста темы
 * @return  array  Массив с двумя списками: ['postIds' => [...], 'levels' => [...]]
 */
private function buildTreePostIdList($firstPostId)
{
    try {
        // 1. Получаем ВСЕ посты темы (включая hold>0) ТОЛЬКО ДЛЯ ПОСТРОЕНИЯ СВЯЗЕЙ
        $query = $this->db->getQuery(true)
            ->select($this->db->quoteName(['id', 'parent', 'hold']))
            ->from($this->db->quoteName('#__kunena_messages'))
            ->where($this->db->quoteName('thread') . ' = ' . $this->threadId);
        
        $allPosts = $this->db->setQuery($query)->loadObjectList();
        
        // 2. ОТДЕЛЬНО получаем посты для финального списка (только hold=0)
        $finalPostIds = $this->getAllThreadPosts($this->threadId); 
        
        // 3. Строим полную карту связей из ВСЕХ постов
        $fullChildrenMap = [];
        foreach ($allPosts as $post) {
            if ($post->parent > 0) {
                $fullChildrenMap[$post->parent][] = $post->id;
            }
        }
        
        // 4. Восстанавливаем связи для потомков удаленных постов
        $recoveredChildren = [];
        
        foreach ($allPosts as $post) {
            // Если пост в финальном списке И его родитель удален
            if (in_array($post->id, $finalPostIds) && 
                $post->parent > 0 && 
                !in_array($post->parent, $finalPostIds)) {
                
                // Находим нового родителя: поднимаемся по цепочке пока не найдем существующего
                $newParent = $this->findClosestExistingParent($post->parent, $finalPostIds, $allPosts);
                
                if ($newParent > 0) {
                    $recoveredChildren[$newParent][] = $post->id;
                } else {
                    // Если не нашли существующего родителя в цепочке - прикрепляем к корню
                    $recoveredChildren[$firstPostId][] = $post->id;
                }
            }
        }
        
        // 5. Объединяем восстановленные связи с обычными
        $children = [];
        foreach ($finalPostIds as $postId) {
            if ($postId == 0) continue;
            
            $children[$postId] = [];
            
            // Обычные дети
            if (isset($fullChildrenMap[$postId])) {
                foreach ($fullChildrenMap[$postId] as $childId) {
                    if (in_array($childId, $finalPostIds)) {
                        $children[$postId][] = $childId;
                    }
                }
            }
            
            // Восстановленные дети
            if (isset($recoveredChildren[$postId])) {
                $children[$postId] = array_merge($children[$postId], $recoveredChildren[$postId]);
            }
            
            // Сортируем и убираем дубликаты
            if (!empty($children[$postId])) {
                $children[$postId] = array_unique($children[$postId]);
                sort($children[$postId]);
            } else {
                $children[$postId] = [0];
            }
        }
        
        // 6. Выполняем обход дерева
        $postIdList = [];
        $postLevelList = [];
        
        $this->traverseTree($firstPostId, 0, $children, $postIdList, $postLevelList);
        
        return [
           'postIds' => array_merge($postIdList, [0]),
            'levels' => $postLevelList
        ];
        
    } catch (\Exception $e) {
        $this->app->enqueueMessage('Ошибка построения древовидного обхода: ' . $e->getMessage(), 'error');
        return [
            'postIds' => [$firstPostId, 0],
            'levels' => [0, 0]
        ];
    }
}

/**
 * Находим ближайшего существующего родителя в цепочке
 */
private function findClosestExistingParent($deletedParentId, $finalPostIds, $allPosts)
{
    $postMap = [];
    foreach ($allPosts as $post) {
        $postMap[$post->id] = $post;
    }
    
    $currentId = $deletedParentId;
    
    // Поднимаемся по цепочке родителей
    while (isset($postMap[$currentId])) {
        $currentPost = $postMap[$currentId];
        
        // Если нашли существующего родителя - возвращаем его
        if (in_array($currentPost->id, $finalPostIds)) {
            return $currentPost->id;
        }
        
        // Переходим к следующему родителю
        if ($currentPost->parent > 0) {
            $currentId = $currentPost->parent;
        } else {
            break; // Достигли корня
        }
    }
    
    return 0; // Не нашли существующего родителя
}
    
/**
 * Рекурсивный обход дерева в глубину
 * @param   int    $postId         Текущий пост
 * @param   int    $level          Текущий уровень
 * @param   array  $children       Массив связей родитель-дети
 * @param   array  &$postIdList    Результирующий список ID (по ссылке)
 * @param   array  &$postLevelList Результирующий список уровней (по ссылке)
 */
private function traverseTree($postId, $level, $children, &$postIdList, &$postLevelList)
{
    // Добавляем текущий пост
    $postIdList[] = $postId;
    $postLevelList[] = $level;
    
    // Если у поста есть дети
    if (isset($children[$postId]) && $children[$postId][0] !== 0) {
        foreach ($children[$postId] as $childId) {
            // Рекурсивно обходим каждого ребенка
            $this->traverseTree($childId, $level + 1, $children, $postIdList, $postLevelList);
        }
    }
}
} // КОНЕЦ КЛАССА
