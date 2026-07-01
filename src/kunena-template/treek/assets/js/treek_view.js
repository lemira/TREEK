/**
 * treek_view.js — косметические улучшения шаблона Treek (Kunena 7 / Joomla 6)
 * v4 — финальная версия: надёжный счётчик, без отладки
 */

(function () {
    'use strict';

    var SESSION_KEY = 'kunena_attach_open';

    function isFeatureEnabled(name) {
        return !!(window.treekViewFeatures && window.treekViewFeatures[name]);
    }

    /* ================================================================
       УТИЛИТА: подсчёт файлов в блоке вложений
       ================================================================
       Структура Kunena в treek (установлено отладкой):
         #kattach_form
           └── div#files.files      ← контейнер; каждый файл = 1 дочерний элемент
               └── (строки файлов)
       Запасной вариант: кнопки "Remove File" (btn-danger без id).        */
    function countAttachFiles(wrap) {
    var form = wrap.closest('form') || document;
    var text = '';

    var textarea = form.querySelector('textarea[name="message"], textarea#message');
    if (textarea) {
        text = textarea.value || '';
    } else if (window.tinymce && typeof window.tinymce.get === 'function') {
        var editor = window.tinymce.get('message');

        if (editor && typeof editor.getContent === 'function') {
            text = editor.getContent({ format: 'text' }) || editor.getContent() || '';
        }
    }

    var matches = text.match(/\[attachment=\d+\][\s\S]*?\[\/attachment\]/gi);

    return matches ? matches.length : 0;
}

    /* ================================================================
       1. СВОРАЧИВАЕМЫЙ БЛОК ATTACHMENTS
       ================================================================ */

    function initAttachmentsToggle(h2) {
        if (h2.dataset.kattachInit) return;
        h2.dataset.kattachInit = '1';

        // Собираем только элементы блока вложений, останавливаемся на первом постороннем
        var attachSiblings = [];
        var el = h2.nextElementSibling;
        while (el) {
            var isAttachPart =
                el.id === 'kattachments-message-container' ||
                el.classList.contains('shadow-lg') ||
                (el.querySelector && (
                    el.querySelector('#kpost-attachments') ||
                    el.querySelector('#kattach_form')
                ));

            if (isAttachPart) {
                attachSiblings.push(el);
                el = el.nextElementSibling;
            } else {
                break;
            }
        }

        if (!attachSiblings.length) return;

        // Обёртка для collapse
        var collapseDiv = document.createElement('div');
        collapseDiv.className = 'kattach-collapse-wrap';
        h2.parentNode.insertBefore(collapseDiv, attachSiblings[0]);
        attachSiblings.forEach(function (s) { collapseDiv.appendChild(s); });

        var isOpen = false;
        sessionStorage.setItem(SESSION_KEY, 'false');
        
        // Счётчик
        var countBadge = document.createElement('span');
        countBadge.className = 'kattach-count-badge';
        h2.appendChild(countBadge);

        // Стрелка
        var arrow = document.createElement('span');
        arrow.className = 'kattach-arrow';
        h2.appendChild(arrow);
        h2.style.cursor = 'pointer';
        h2.style.userSelect = 'none';

        function refreshCount() {
            // Если блок скрыт — временно показываем для подсчёта
            var wasHidden = collapseDiv.style.display === 'none';
            if (wasHidden) {
                collapseDiv.style.visibility = 'hidden';
                collapseDiv.style.display = '';
            }

            var n = countAttachFiles(collapseDiv);

            if (wasHidden) {
                collapseDiv.style.display = 'none';
                collapseDiv.style.visibility = '';
            }

            // Показываем счётчик только если есть файлы
            countBadge.textContent = n > 0 ? '\u00A0(' + n + ')' : '';
            return n;
        }

        function applyState(open) {
            collapseDiv.style.display = open ? '' : 'none';
            arrow.textContent = open ? '\u00A0\u25B2' : '\u00A0\u25BC';
            arrow.title = open ? 'Закрыть блок вложений' : 'Открыть блок вложений';
        }

        h2.addEventListener('click', function () {
            isOpen = !isOpen;
            sessionStorage.setItem(SESSION_KEY, String(isOpen));
            applyState(isOpen);
        });

       // Обновление счётчика при изменениях в блоке вложений
new MutationObserver(function () {
    refreshCount();
}).observe(collapseDiv, { childList: true, subtree: true });

        applyState(isOpen);
        // Задержка: Kunena рендерит список файлов после DOMContentLoaded
        setTimeout(refreshCount, 400);
    }

    function initAllAttachments() {
        document.querySelectorAll('h2').forEach(function (h2) {
            // Проверяем только текстовые узлы h2 (игнорируем дочерние span)
            var rawText = Array.from(h2.childNodes)
                .filter(function (n) { return n.nodeType === 3; })
                .map(function (n) { return n.textContent; })
                .join('').trim();
            if (/^attachments$/i.test(rawText)) {
                initAttachmentsToggle(h2);
            }
        });
    }

    /* ================================================================
       2. КНОПКИ REPLY / QUOTE / EDIT ВМЕСТО DROPDOWN «ACTION»
       ================================================================ */

    function initActionButtons() {
        document.querySelectorAll('.btn-group').forEach(function (btnGroup) {
            if (btnGroup.dataset.kactionsInit) return;

            var aReply = btnGroup.querySelector('a.kbutton-reply');
            var aQuote = btnGroup.querySelector('a.kbutton-quote');
            var aEdit  = btnGroup.querySelector('a.kbutton-edit');

            if (!aReply && !aQuote && !aEdit) return;

            btnGroup.dataset.kactionsInit = '1';

            var container = document.createElement('div');
            container.className = 'kactions-inline';

            [aReply, aQuote, aEdit].forEach(function (orig) {
                if (!orig) return;
                var btn = orig.cloneNode(true);
                // Те же классы что у Quick Reply, без btn-sm
                btn.className = 'btn btn-outline-primary border';
                btn.classList.remove('dropdown-item', 'btn-small');
                container.appendChild(btn);
            });

            btnGroup.parentNode.insertBefore(container, btnGroup);
            btnGroup.style.display = 'none';
        });
    }

    /* ================================================================
       ИНИЦИАЛИЗАЦИЯ
       ================================================================ */

    function init() {
        if (isFeatureEnabled('attachments_toggle')) {
            initAllAttachments();
        }

        if (isFeatureEnabled('inline_action_buttons')) {
            initActionButtons();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // MutationObserver на body — ловим AJAX-рендер Kunena
    var bodyObserver = new MutationObserver(function (mutations) {
        var needAction = false;
        var needAttach = false;
        mutations.forEach(function (m) {
            m.addedNodes.forEach(function (node) {
                if (node.nodeType !== 1) return;
                if (node.querySelector && node.querySelector('.kbutton-reply, .kbutton-quote, .kbutton-edit')) needAction = true;
                if (node.tagName === 'H2' || (node.querySelector && node.querySelector('h2'))) needAttach = true;
            });
        });
        if (needAction && isFeatureEnabled('inline_action_buttons')) initActionButtons();
        if (needAttach && isFeatureEnabled('attachments_toggle')) initAllAttachments();
    });

    document.addEventListener('DOMContentLoaded', function () {
        bodyObserver.observe(document.body, { childList: true, subtree: true });
    });

    document.addEventListener('kunena:ajax:loaded', init);
    document.addEventListener('kunena:ready', init);

}());
