(function() {
    'use strict';
    if (window.treekInitialized) return;
    window.treekInitialized = true;

function buildTreekAjaxUrl() {
    const paths = (window.Joomla && typeof window.Joomla.getOptions === 'function')
        ? (window.Joomla.getOptions('system.paths') || {})
        : {};

    const ajaxPath = String(paths.ajax || '/index.php/component/ajax?format=raw')
        .replace(/&amp;/g, '&');

    const url = new URL(ajaxPath, window.location.origin);

    url.searchParams.set('plugin', 'treek');
    url.searchParams.set('group', 'ajax');
    url.searchParams.set('format', 'raw');

    return url.toString();
}

const AJAX_URL = buildTreekAjaxUrl();

const TREE_POLL_INTERVAL = 60000;
const TREEK_REOPEN_AFTER_RELOAD_KEY = 'treek_reopen_after_forum_view_reload';

let TREEK_EDITION = 'free';
// TREEK-PRO-START: edition_flag
TREEK_EDITION = 'pro';
// TREEK-PRO-END: edition_flag

    let currentPopover = null;
    let currentTrigger = null;
    let cachedData = null;
    let topicUrl = '';
    let treePollTimer = null;
    let treeLastPostId = 0;
    let treeRefreshInProgress = false;
    let activePostId = null;

const fallbackLangs = {
    TREEK_ERROR_SESSION_EXPIRED: 'Session has expired. Please refresh the page and open the tree again',
    TREEK_ERROR_REFRESH_TREE: 'Unable to refresh the tree. Please refresh the page and open the tree again',
    TREEK_LIVE_POSTS_ADDED: 'Post(s) added:',
    TREEK_CLOSE: 'Close',
    TREEK_SET_SHOW_DATE_TIME: 'Show the post creation date and time',
    TREEK_SET_DATE: 'Date',
    TREEK_POST_TOOLTIP_SYMBOL: '...',
    TREEK_AUTHOR_HIGHLIGHT_SYMBOL: 'A',
    TREEK_AUTHOR_HIGHLIGHT_SYMBOL_TITLE: 'Highlight all rows by the author of this post',
    TREEK_FAMILY_SYMBOL: 'Λ',
    TREEK_FAMILY_SYMBOL_TITLE: 'Highlight this row and all child posts',
    TREEK_NAV_TO_PARENT_IN_TREE_SYMBOL: '^',
    TREEK_NAV_TO_PARENT_IN_TREE_SYMBOL_TITLE: 'Highlight the parent row of this post',
    TREEK_NAV_TO_CHILD_IN_TREE_SYMBOL: 'v',
    TREEK_NAV_TO_CHILD_IN_TREE_SYMBOL_TITLE: 'Highlight the child row with the specified number',
    TREEK_SET_GRID: 'Grid',
    TREEK_TAB_CHARACTER_LIGHT_SYMBOL: '.',
    TREEK_TAB_CHARACTER_HARD_SYMBOL: '|',
    TREEK_SET_GRID_LIGHT: 'Light grid',
    TREEK_SET_GRID_HARD: 'Heavy grid',
    TREEK_SAVE_PARAMS_SYMBOL: 'Save',
    TREEK_RESTORE_PARAMS_SYMBOL: 'Restore',
    TREEK_SAVE_PARAMS_TITLE: 'Save settings',
    TREEK_RESTORE_PARAMS_TITLE: 'Restore settings',
    TREEK_PARAMS_SAVE_ERROR: 'Unable to save settings',
    TREEK_PARAMS_RESTORE_ERROR: 'Unable to restore settings',
    TREEK_PARAMS_SAVED: 'Settings saved',
    TREEK_PARAMS_RESTORED: 'Settings restored',
    TREEK_EXPORT_SYMBOL: 'Export',
    TREEK_EXPORT_SYMBOL_TITLE: 'Export tree',
    TREEK_EXPORT_ACTION: 'Export',
    // TREEK-PRO-START: export_bbcode_html
    TREEK_EXPORT_BBCODE: 'BBCode',
    TREEK_EXPORT_HTML: 'HTML',
    // TREEK-PRO-END: export_bbcode_html
    TREEK_EXPORT_TEXT: 'Text',
    TREEK_EXPORT_COPIED: 'Tree copied to clipboard',
    TREEK_EXPORT_COPY_ERROR: 'Failed to copy tree to clipboard',
    TREEK_SET_COMFORT_TOOLS: 'Show comfort symbols',
    TREEK_SET_NAV_TOOLS: 'Navigation arrows',
    TREEK_SET_HIGHLIGHT_TOOLS: 'Highlighting',
    TREEK_PRO: 'Pro',
    TREEK_PRO_LOCK_SYMBOL: 'Lock',
    TREEK_PRO_OPTIONS: 'Pro options',
    TREEK_PRO_LOCKED: 'Available in Pro',
    TREEK_REGISTERED_ONLY: 'Available for registered users',
    TREEK_TEST_PRO: 'Test TreeK Pro',
    TREEK_SET_FORUM_VIEW: 'Forum view',
    TREEK_SET_PARENT_POST_NAVIGATION: 'Parent post arrow',
    TREEK_SET_REPLY_FORM_TREEK_LOOK: 'Comfort form header',
    TREEK_SET_SUBJECT_SUFFIX: 'Suffixes',
    TREEK_SET_ATTACHMENTS_TOGGLE: 'Collapsed attachments',
    TREEK_SET_INLINE_ACTION_BUTTONS: '3 action buttons',
    TREEK_SET_BUTTON_SYMBOL_TOOLTIPS: 'Tooltips for buttons and symbols',
    TREEK_SET_SETTINGS_DRAG: 'Draggable settings window',
    TREEK_SET_TOPIC_LIVE_NOTICE: 'Topic watch. Notice when a post is added to the topic',
    TREEK_SET_TEASER_TEXT_FRAME: 'Frame around text'
};

    const defaultState = {
        view: 'tree',
        primary: 'subject',
        showTime: true,
        timeFormat: {
            year: '2',
            showClock: false
        },
        showIndex: false,
        showGrid: false,
        gridMode: 'light',
        showComfortTools: false,
        showNavTools: false,
        showHighlightTools: false,
        showTeaser: false,
        teaserMode: 'text',
        teaserLen: 150,
        teaserTextFrame: false
    };

let state = Object.assign({}, defaultState);
let showProPreview = false;
let showForumViewSettings = false;
let treekViewFeatures = getDefaultTreekViewFeatures();
let treekViewAutoSaveTimer = null;

function rememberTreeReopenAfterReload() {
    if (!currentPopover || !currentTrigger) {
        return;
    }

    const topicId = currentPopover.dataset.topicId || currentTrigger.getAttribute('data-topic-id') || '';

    if (!topicId) {
        return;
    }

    sessionStorage.setItem(TREEK_REOPEN_AFTER_RELOAD_KEY, JSON.stringify({
        topicId,
        currentPostId: currentTrigger.getAttribute('data-current-post-id') || '',
        openSettings: true,
        createdAt: Date.now()
    }));
}

function consumeTreeReopenAfterReload() {
    let payload = null;

    try {
        payload = JSON.parse(sessionStorage.getItem(TREEK_REOPEN_AFTER_RELOAD_KEY) || 'null');
    } catch (e) {
        payload = null;
    }

    sessionStorage.removeItem(TREEK_REOPEN_AFTER_RELOAD_KEY);

    if (!payload || typeof payload !== 'object' || !payload.topicId) {
        return null;
    }

    if (Date.now() - (parseInt(payload.createdAt, 10) || 0) > 30000) {
        return null;
    }

    return payload;
}

try {
    const sessionState = JSON.parse(sessionStorage.getItem('treek_settings') || '{}');

    if (sessionState && typeof sessionState === 'object') {
        state = Object.assign({}, defaultState, sessionState);
    }
} catch (e) {
    sessionStorage.removeItem('treek_settings');
}

localStorage.removeItem('treek_settings');

state.timeFormat = normalizeTimeFormat(state.timeFormat);
normalizeEditionState();

const saveState = () => sessionStorage.setItem('treek_settings', JSON.stringify(state));

function normalizeEditionState() {
    if (TREEK_EDITION !== 'free') {
        return;
    }

    if (state.view === 'flat') {
        state.view = 'tree';
    }

    if (state.primary === 'author') {
        state.primary = 'subject';
    }

    if (state.teaserMode === 'screen') {
        state.teaserMode = 'text';
        state.teaserLen = 150;
    }

    state.showComfortTools = false;
    state.showNavTools = false;
    state.showHighlightTools = false;
}

function getDefaultTreekViewFeatures() {
    return {
        parent_post_navigation: true,
        reply_form_treek_look: false,
        subject_suffix: false,
        attachments_toggle: false,
        inline_action_buttons: false
    };
}

function normalizeTreekViewFeatures(settings) {
    const features = getDefaultTreekViewFeatures();

    if (!settings || typeof settings !== 'object') {
        return features;
    }

    Object.keys(features).forEach(key => {
        if (Object.prototype.hasOwnProperty.call(settings, key)) {
            features[key] = !!settings[key];
        }
    });

    return features;
}

function hasCustomTreekViewFeatures(features) {
    const normalizedFeatures = normalizeTreekViewFeatures(features);
    const defaultFeatures = getDefaultTreekViewFeatures();

    return Object.keys(defaultFeatures).some(key => normalizedFeatures[key] !== defaultFeatures[key]);
}

function loadForumViewOpenState() {
    try {
        const value = sessionStorage.getItem('treek_forum_view_open');

        if (value === null) {
            return null;
        }

        return value === '1';
    } catch (e) {
        return null;
    }
}

function saveForumViewOpenState() {
    try {
        sessionStorage.setItem('treek_forum_view_open', showForumViewSettings ? '1' : '0');
    } catch (e) {
        // Session storage can be unavailable in strict browser modes.
    }
}

showForumViewSettings = loadForumViewOpenState() === true;

    const _ = (key) => {
        if (window.treekLangs && window.treekLangs[key]) return window.treekLangs[key];
        if (fallbackLangs[key]) return fallbackLangs[key];
        return key.replace('TREEK_SET_', '').replace(/_/g, ' ');
    };

    function renderContent() {
        if (!cachedData || !currentPopover) return;

        const body = currentPopover.querySelector('.treek-popover__body');
        let rows = [...cachedData.rows];

        // TREEK-PRO-START: flat_view
        if (state.view === 'flat') rows.sort((a, b) => a.id - b.id);
        // TREEK-PRO-END: flat_view

        const childrenByParent = {};

        rows.forEach(item => {
            const parentId = parseInt(item.parent, 10);
            const postId = parseInt(item.id, 10);

            if (!parentId || !postId) return;
            if (!childrenByParent[parentId]) childrenByParent[parentId] = [];

            childrenByParent[parentId].push(postId);
        });

        let html = '';

        rows.forEach(row => {
            const level = (state.view === 'tree') ? (row.level || 0) : 0;
            const indentSize = (cachedData.params.indent_px || 16);
            const pad = level * indentSize + 10;
const gridPrefix = buildGridPrefix(level, indentSize);
const isHardGrid = state.view === 'tree' && state.showGrid && state.gridMode === 'hard' && level > 0;
const headerPad = gridPrefix ? 10 : pad;
const teaserPad = headerPad + (state.showGrid && state.view === 'tree' ? level * (indentSize + 8) : 0);
            const isTreeView = state.view === 'tree';
            const isLast = (row.id == cachedData.lastPostId);
            const isActive = activePostId !== null && String(row.id) === String(activePostId);
const rowClass = 'treek-row treek-row-link'
    + (isLast ? ' treek-row--last' : '')
    + (isActive ? ' treek-row--active' : '')
    + (isHardGrid ? ' treek-row--hard-grid' : '');

            let tooltipText = (row.tooltip || row.text || '').substring(0, 400);
            if (tooltipText.length === 400) tooltipText += '...';

            const authorName = escapeHtml(row.username || row.author || 'Guest');
            const author = `<span class="treek-row__author">${authorName}</span>`;
            const subject = `<span class="treek-row__subject">${escapeHtml(row.subject || '...')}</span>`;
            const tooltip = `<span class="treek-row__tooltip-symbol" data-treek-tooltip="${escapeAttr(tooltipText)}">${_('TREEK_POST_TOOLTIP_SYMBOL')}</span>`;
            let comfort = '';

            // TREEK-PRO-START: comfort_tools
            const parentTool = (state.showComfortTools && state.showNavTools && isTreeView && parseInt(row.parent, 10) > 0)
                ? `<span class="treek-row__tool treek-row__tool--parent" data-post-id="${row.id}" title="${_('TREEK_NAV_TO_PARENT_IN_TREE_SYMBOL_TITLE')}" aria-label="${_('TREEK_NAV_TO_PARENT_IN_TREE_SYMBOL_TITLE')}">${_('TREEK_NAV_TO_PARENT_IN_TREE_SYMBOL')}</span>`
                : '';

            const childTools = (state.showComfortTools && state.showNavTools && isTreeView ? (childrenByParent[row.id] || []) : []).map((childId, index) => {
                return `<span class="treek-row__tool treek-row__tool--child" data-post-id="${row.id}" data-child-id="${childId}" title="${_('TREEK_NAV_TO_CHILD_IN_TREE_SYMBOL_TITLE')}" aria-label="${_('TREEK_NAV_TO_CHILD_IN_TREE_SYMBOL_TITLE')}">${_('TREEK_NAV_TO_CHILD_IN_TREE_SYMBOL')}${index + 1}</span>`;
            }).join('');

            const authorKey = String(row.username || row.author || 'Guest');
            const authorTool = (state.showComfortTools && state.showHighlightTools)
                ? `<span class="treek-row__tool treek-row__tool--author" data-author="${escapeAttr(authorKey)}" title="${_('TREEK_AUTHOR_HIGHLIGHT_SYMBOL_TITLE')}" aria-label="${_('TREEK_AUTHOR_HIGHLIGHT_SYMBOL_TITLE')}">${_('TREEK_AUTHOR_HIGHLIGHT_SYMBOL')}</span>`
                : '';
            const hasChildren = isTreeView && (childrenByParent[row.id] || []).length > 0;

const familyTool = (state.showComfortTools && state.showHighlightTools && hasChildren)
    ? `<span class="treek-row__tool treek-row__tool--family" data-post-id="${row.id}" title="${_('TREEK_FAMILY_SYMBOL_TITLE')}" aria-label="${_('TREEK_FAMILY_SYMBOL_TITLE')}">${_('TREEK_FAMILY_SYMBOL')}</span>`
    : '';
comfort = (parentTool || childTools || authorTool || familyTool)
                ? `<span class="treek-row__comfort">${parentTool}${childTools}${authorTool}${familyTool}</span>`
                : '';
            // TREEK-PRO-END: comfort_tools

            const timeStr = state.showTime ? formatTreeTime(row) : '';
            const time = timeStr ? `<span class="treek-row__meta">${escapeHtml(timeStr)}</span>` : '';
            const idx = state.showIndex ? `<span class="treek-row__postid">#${row.id}</span>` : '';

            let content = `${subject} ${tooltip} ${author}`;

if (state.primary === 'author') {
    content = `${author} ${tooltip} ${subject}`;
}

if (state.primary === 'subject_only') {
    content = `${subject} ${tooltip}`;
}

            let teaserHtml = '';

            if (state.showTeaser) {
                // TREEK-PRO-START: screen_teaser
                if (state.teaserMode === 'screen' && row.teaserHtml) {
                    const teaserHeight = parseInt(state.teaserLen, 10) || 150;

                    teaserHtml = `
            <div class="treek-row__teaser treek-row__teaser--screen" style="padding-left:${teaserPad}px">
        <div class="treek-screen-teaser-placeholder"
                                 data-post-id="${row.id}"
                                 data-teaser-height="${teaserHeight}">
                                ${_('TREEK_LOADING')}
                            </div>
                        </div>`;
                } else
                // TREEK-PRO-END: screen_teaser
                if (row.text) {
                    let textSnippet = row.text;

                    if (textSnippet.length > state.teaserLen) {
                        textSnippet = textSnippet.substring(0, state.teaserLen) + '...';
                    }

                    if (textSnippet) {
                        const frameClass = state.teaserTextFrame ? ' treek-row__teaser-text-bubble--framed' : '';
                        teaserHtml = `<div class="treek-row__teaser treek-row__teaser--text" style="padding-left:${teaserPad}px"><div class="treek-row__teaser-text-bubble${frameClass}">${escapeHtml(textSnippet)}</div></div>`;
                    }
                }
            }

            html += `
                <div class="${rowClass}" data-post-id="${row.id}" data-parent-id="${row.parent || 0}" data-level="${level}" data-author="${escapeAttr(row.username || row.author || 'Guest')}" data-post-index="${row.postIndex ?? ''}">
                    <div class="treek-row__header-line" style="padding-left:${headerPad}px">
                        ${gridPrefix}${content} ${comfort} ${time} ${idx}
                    </div>
                    ${teaserHtml}
                </div>`;
        });

        body.innerHTML = html
            ? `<div class="treek-tree-canvas">${html}</div>`
            : '<div class="treek-empty">' + _('TREEK_NO_DATA') + '</div>';

        initAuthorTooltips(body);
        scheduleHardGridOverlay(body);
        // TREEK-PRO-START: screen_teaser
        initLazyScreenTeasers(body);
        // TREEK-PRO-END: screen_teaser
    }

    function escapeHtml(text) {
        if (!text) return '';

        const div = document.createElement('div');
        div.textContent = text;

        return div.innerHTML;
    }

    function escapeAttr(text) {
        return String(text || '')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '&#10;');
    }

function buildGridPrefix(level, indentSize) {
    if (state.view !== 'tree' || !state.showGrid || level <= 0) return '';

    const width = Math.max(1, parseInt(indentSize, 10) || 16);

    if (state.gridMode === 'hard') {
        return `<span class="treek-row__grid-spacer" style="width:${level * width}px" aria-hidden="true"></span>`;
    }

    const symbol = _('TREEK_TAB_CHARACTER_LIGHT_SYMBOL');
    let html = '';

    for (let i = 0; i < level; i++) {
        html += `<span class="treek-row__tab" style="width:${width}px">${escapeHtml(symbol)}</span>`;
    }

    return html;
}

function scheduleHardGridOverlay(container) {
    window.requestAnimationFrame(() => renderHardGridOverlay(container));
}

function renderHardGridOverlay(container) {
    const canvas = container ? container.querySelector('.treek-tree-canvas') : null;

    if (!canvas) return;

    canvas.querySelectorAll('.treek-hard-grid-overlay').forEach(item => item.remove());

    if (state.view !== 'tree' || !state.showGrid || state.gridMode !== 'hard') {
        return;
    }

    const rows = Array.from(canvas.querySelectorAll('.treek-row'));

    if (!rows.length) return;

    const indentSize = (cachedData && cachedData.params && cachedData.params.indent_px) || 16;
    const width = Math.max(1, parseInt(indentSize, 10) || 16);
    const gridLeft = 10;
    const overlay = document.createElement('span');
    const childrenByParent = {};
    const visiblePostIds = new Set(rows.map(row => row.dataset.postId).filter(Boolean));
    const latestRowByLevel = {};
    const branchKeyByRow = new Map();

    overlay.className = 'treek-hard-grid-overlay';

    rows.forEach(row => {
        const parentId = row.dataset.parentId || '0';
        const level = parseInt(row.dataset.level, 10) || 0;

        Object.keys(latestRowByLevel).forEach(key => {
            if (parseInt(key, 10) > level) {
                delete latestRowByLevel[key];
            }
        });

        if (level <= 0) {
            latestRowByLevel[level] = row;
            return;
        }

        const visualParent = latestRowByLevel[level - 1];
        const branchKey = parentId !== '0' && visiblePostIds.has(parentId)
            ? parentId
            : (visualParent ? visualParent.dataset.postId : '');

        if (branchKey) {
            if (!childrenByParent[branchKey]) childrenByParent[branchKey] = [];

            childrenByParent[branchKey].push(row);
            branchKeyByRow.set(row, branchKey);
        }

        latestRowByLevel[level] = row;
    });

    const getSubtreeEndRow = (startRow) => {
        const startIndex = rows.indexOf(startRow);
        const startLevel = parseInt(startRow.dataset.level, 10) || 0;
        let endRow = startRow;

        for (let i = startIndex + 1; i < rows.length; i++) {
            const nextLevel = parseInt(rows[i].dataset.level, 10) || 0;

            if (nextLevel <= startLevel) break;

            endRow = rows[i];
        }

        return endRow;
    };

    const makeLine = (className, style, branchKey = '') => {
        const line = document.createElement('span');
        line.className = className;

        if (branchKey) {
            line.dataset.branchKey = branchKey;
        }

        Object.keys(style).forEach(key => {
            line.style[key] = style[key];
        });

        return line;
    };

    Object.keys(childrenByParent).forEach(parentId => {
        const childRows = childrenByParent[parentId].slice().sort((a, b) => a.offsetTop - b.offsetTop);

        if (!childRows.length) return;

        const childLevel = parseInt(childRows[0].dataset.level, 10) || 0;

        if (childLevel <= 0) return;

        const firstChild = childRows[0];
        const lastDescendant = getSubtreeEndRow(childRows[childRows.length - 1]);
        const x = gridLeft + (childLevel - 0.5) * width;
        const top = firstChild.offsetTop;
        const bottom = lastDescendant.offsetTop + lastDescendant.offsetHeight;

        overlay.appendChild(makeLine('treek-hard-grid-line treek-hard-grid-line--vertical', {
            left: x + 'px',
            top: top + 'px',
            height: Math.max(0, bottom - top) + 'px'
        }, parentId));
    });

    rows.forEach(row => {
        const level = parseInt(row.dataset.level, 10) || 0;
        const branchKey = branchKeyByRow.get(row);

        if (level <= 0 || !branchKey) return;

        const header = row.querySelector('.treek-row__header-line');

        if (!header) return;

        const x = gridLeft + (level - 0.5) * width;
        const y = row.offsetTop + header.offsetTop + header.offsetHeight - 3;
        const endX = gridLeft + level * width + 2;

        overlay.appendChild(makeLine('treek-hard-grid-line treek-hard-grid-line--horizontal', {
            left: x + 'px',
            top: y + 'px',
            width: Math.max(6, endX - x) + 'px'
        }, branchKey));
    });

    if (overlay.childNodes.length) {
        canvas.prepend(overlay);
        initHardGridBranchHover(overlay);
    }
}

function initHardGridBranchHover(overlay) {
    const setBranchHover = (branchKey, hovered) => {
        if (!branchKey) return;

        overlay.querySelectorAll('.treek-hard-grid-line[data-branch-key]').forEach(line => {
            if (line.dataset.branchKey !== branchKey) return;

            line.classList.toggle('treek-hard-grid-line--branch-hover', hovered);
        });
    };

    overlay.querySelectorAll('.treek-hard-grid-line[data-branch-key]').forEach(line => {
        line.addEventListener('mouseenter', () => setBranchHover(line.dataset.branchKey, true));
        line.addEventListener('mouseleave', () => setBranchHover(line.dataset.branchKey, false));
    });
}

    function normalizeTimeFormat(format) {
        return {
            year: format && format.year === '4' ? '4' : '2',
            showClock: !!(format && (format.showClock || format.hour || format.minute))
        };
    }

    function formatDateParts(date, yearMode) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const fullYear = String(date.getFullYear());
        const year = yearMode === '4' ? fullYear : fullYear.slice(-2);

        return `${day}.${month}.${year}`;
    }

    function formatClockParts(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${hours}:${minutes}`;
    }

    function formatTreeTime(row) {
        const rawTime = parseInt(row.raw_time, 10);

        if (!rawTime) return row.time || '';

        const date = new Date(rawTime * 1000);
        const format = normalizeTimeFormat(state.timeFormat);
        let result = formatDateParts(date, format.year);

        if (format.showClock) {
            result += ' ' + formatClockParts(date);
        }

        return result;
    }

    function getDateTimePreviewHtml() {
    const now = new Date();
    const format = normalizeTimeFormat(state.timeFormat);
    const datePreview = formatDateParts(now, format.year);
    const timePreview = format.showClock ? formatClockParts(now) : '';

    return `
        <span class="treek-datetime-preview" style="font-size:13px; color:#333;">
            ${datePreview}${timePreview ? ' ' + timePreview : ''}
        </span>`;
}

function renderLockedProOption(label, detail = '') {
    const hiddenClass = showProPreview ? '' : ' treek-pro-preview-hidden';

    return `
        <div class="treek-pro-locked-option${hiddenClass}" title="${escapeAttr(_('TREEK_PRO_LOCKED'))}">
            <span class="treek-pro-lock" aria-hidden="true">${_('TREEK_PRO_LOCK_SYMBOL')}</span>
            <span class="treek-pro-locked-label">${escapeHtml(label)}</span>
            ${detail ? `<span class="treek-pro-locked-detail">${escapeHtml(detail)}</span>` : ''}
        </div>`;
}

function renderInlineLockedProOption(label, detail = '') {
    if (TREEK_EDITION !== 'free') {
        return '';
    }

    return renderLockedProOption(label, detail);
}

function renderFreeProPreviewHtml() {
    if (TREEK_EDITION !== 'free') {
        return '';
    }

    const items = [
        renderLockedProOption(
            _('TREEK_SET_FORUM_VIEW'),
            [
                _('TREEK_SET_PARENT_POST_NAVIGATION'),
                _('TREEK_SET_REPLY_FORM_TREEK_LOOK'),
                _('TREEK_SET_SUBJECT_SUFFIX'),
                _('TREEK_SET_ATTACHMENTS_TOGGLE'),
                _('TREEK_SET_INLINE_ACTION_BUTTONS')
            ].join(' / ')
        ),
        renderLockedProOption(_('TREEK_SET_BUTTON_SYMBOL_TOOLTIPS')),
        renderLockedProOption(_('TREEK_SET_SETTINGS_DRAG')),
        renderLockedProOption(_('TREEK_SET_TOPIC_LIVE_NOTICE')),
        renderLockedProOption(`${_('TREEK_EXPORT_ACTION')} ${_('TREEK_EXPORT_BBCODE')}`),
        renderLockedProOption(`${_('TREEK_EXPORT_ACTION')} ${_('TREEK_EXPORT_HTML')}`)
    ].join('');

    return `
        <div class="treek-settings-group treek-pro-preview" style="display:${showProPreview ? 'block' : 'none'};">
            ${items}
            <a class="treek-pro-preview__test-link" href="https://treek.support" target="_blank" rel="noopener noreferrer">${_('TREEK_TEST_PRO')}</a>
        </div>`;
}

    function updateDateTimePreview() {
        if (!currentPopover) return;

        const preview = currentPopover.querySelector('.treek-datetime-preview');
        if (preview) preview.outerHTML = getDateTimePreviewHtml();
    }

    function getKunenaMessageWidth() {
        const messageBody = document.querySelector('.kmsg');

        if (!messageBody) return 760;

        const rect = messageBody.getBoundingClientRect();
        const width = Math.round(rect.width);

        return width > 0 ? width : 760;
    }

    function getCurrentLastPostId() {
        return parseInt(cachedData?.lastPostId, 10) || 0;
    }

    function buildPostUrl(postId, postIndex) {
        const perPage = parseInt(cachedData?.messagesPerPage, 10) || 0;
        const index = parseInt(postIndex, 10);
        const url = new URL(topicUrl, window.location.origin);

        if (perPage > 0 && !Number.isNaN(index)) {
            const start = Math.floor(index / perPage) * perPage;

            if (start > 0) {
                url.searchParams.set('start', String(start));
            } else {
                url.searchParams.delete('start');
            }
        }

        url.hash = String(postId);

        if (url.origin === window.location.origin) {
            return url.pathname + url.search + url.hash;
        }

        return url.toString();
    }

    function parseAjaxJsonResponse(r) {
        return r.text().then(text => {
            try {
                return JSON.parse(text);
            } catch (e) {
                console.warn('TREEK ajax returned non-JSON response', {
                    status: r.status,
                    contentType: r.headers.get('content-type'),
                    responseStart: text.substring(0, 300)
                });

                throw new Error(_('TREEK_ERROR_REFRESH_TREE'));
            }
        });
    }

function isTokenError(error) {
    const message = String(error || '').toLowerCase();

    return message.includes('token')
        || message.includes('session');
}

    function fetchFreshToken() {
        return fetch(`${AJAX_URL}&task=token`, {
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-store'
        })
            .then(parseAjaxJsonResponse)
            .then(data => {
                if (!data.token) throw new Error(_('TREEK_ERROR_SESSION_EXPIRED'));
                return data.token;
            });
    }

function resolveParentLink(link, allowTokenRefresh = true) {
    const postId = link.getAttribute('data-post-id');
    const topicId = link.getAttribute('data-topic-id');
    const token = link.getAttribute('data-token');

    if (!postId || !topicId || !token) return;

    fetch(`${AJAX_URL}&task=parent_url&topic_id=${topicId}&post_id=${postId}&${token}=1`, {
        headers: {
            'Accept': 'application/json'
        },
        cache: 'no-store'
    })
        .then(parseAjaxJsonResponse)
        .then(data => {
            if (isTokenError(data.error) && allowTokenRefresh) {
                return fetchFreshToken().then(freshToken => {
                    link.setAttribute('data-token', freshToken);
                    return resolveParentLink(link, false);
                });
            }

            if (data.error || !data.url) {
                throw new Error(data.error || 'parent url not found');
            }

            window.location.href = data.url;
        })
        .catch(err => {
            console.warn('TREEK parent link failed', err);
            window.location.href = '#';
        });
}

    function fetchTreeData(topicId, token, trigger, allowTokenRefresh = true) {
        return fetch(`${AJAX_URL}&topic_id=${topicId}&${token}=1`, {
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-store'
        })
            .then(parseAjaxJsonResponse)
            .then(data => {
                if (isTokenError(data.error) && allowTokenRefresh) {
                    return fetchFreshToken().then(freshToken => {
                        trigger.setAttribute('data-token', freshToken);
                        return fetchTreeData(topicId, freshToken, trigger, false);
                    });
                }

                if (data.error) {
                    console.warn('TREEK ajax returned error', data.error, data);
                    throw new Error(_('TREEK_ERROR_REFRESH_TREE'));
                }

                return data;
            });
    }

    // TREEK-PRO-START: topic_live_notice
    function fetchTreeLastPostId(topicId, token, trigger, allowTokenRefresh = true) {
        return fetch(`${AJAX_URL}&task=signature&topic_id=${topicId}&${token}=1`, {
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-store'
        })
            .then(parseAjaxJsonResponse)
            .then(data => {
                if (isTokenError(data.error) && allowTokenRefresh) {
                    return fetchFreshToken().then(freshToken => {
                        trigger.setAttribute('data-token', freshToken);
                        return fetchTreeLastPostId(topicId, freshToken, trigger, false);
                    });
                }

                if (data.error) {
                    console.warn('TREEK signature returned error', data.error, data);
                    throw new Error(_('TREEK_ERROR_REFRESH_TREE'));
                }

                const lastPostId = parseInt(data.lastPostId ?? data.signature?.lastPostId, 10);

                if (Number.isNaN(lastPostId)) {
                    throw new Error(_('TREEK_ERROR_REFRESH_TREE'));
                }

                return lastPostId;
            });
    }

    function startTreePolling(topicId, trigger) {
        stopTreePolling();

        treeLastPostId = getCurrentLastPostId();

        treePollTimer = window.setInterval(() => {
            if (!currentPopover || !cachedData || treeRefreshInProgress) return;

            const token = trigger.getAttribute('data-token');

            fetchTreeLastPostId(topicId, token, trigger)
                .then(lastPostId => {
                    if (lastPostId <= treeLastPostId) return;

                    refreshTreeAfterNewPost(topicId, trigger, treeLastPostId);
                })
                .catch(err => {
                    console.warn('TREEK signature polling failed', err);
                });
        }, TREE_POLL_INTERVAL);
    }
    // TREEK-PRO-END: topic_live_notice

    function stopTreePolling() {
        if (treePollTimer) {
            window.clearInterval(treePollTimer);
            treePollTimer = null;
        }

        treeLastPostId = 0;
        treeRefreshInProgress = false;
    }

    // TREEK-PRO-START: topic_live_notice
    function refreshTreeAfterNewPost(topicId, trigger, oldLastPostId) {
        if (!currentPopover || !cachedData) return;

        treeRefreshInProgress = true;

        const body = currentPopover.querySelector('.treek-popover__body');
        const scrollTop = body ? body.scrollTop : 0;
        const scrollLeft = body ? body.scrollLeft : 0;
        const token = trigger.getAttribute('data-token');

        fetchTreeData(topicId, token, trigger)
            .then(data => {
                const addedRows = (data.rows || []).filter(row => {
                    return (parseInt(row.id, 10) || 0) > oldLastPostId;
                });

                cachedData = data;
                treeLastPostId = getCurrentLastPostId();

                renderContent();

                const newBody = currentPopover ? currentPopover.querySelector('.treek-popover__body') : null;
                if (newBody) {
                    newBody.scrollTop = scrollTop;
                    newBody.scrollLeft = scrollLeft;
                }

                if (addedRows.length) {
                    showTreeLiveNotice(addedRows);
                }
            })
            .catch(err => {
                console.warn('TREEK tree refresh failed', err);
            })
            .finally(() => {
                treeRefreshInProgress = false;
            });
    }

    function showTreeLiveNotice(rows) {
        if (!currentPopover) return;

        const oldNotice = currentPopover.querySelector('.treek-live-notice');
        if (oldNotice) oldNotice.remove();

        const notice = document.createElement('div');
        notice.className = 'treek-live-notice';

        const list = rows.map(row => {
            return `<div class="treek-live-notice__row">${escapeHtml(row.author || 'Guest')} - ${escapeHtml(row.subject || '...')} - ${escapeHtml(row.time || '')} - #${row.id}</div>`;
        }).join('');

        notice.innerHTML = `
            <button type="button" class="treek-live-notice__close" title="${_('TREEK_CLOSE')}">${_('TREEK_CLOSE')}</button>
            <div class="treek-live-notice__title">${_('TREEK_LIVE_POSTS_ADDED')}</div>
            ${list}
        `;

        currentPopover.appendChild(notice);

        const close = notice.querySelector('.treek-live-notice__close');
        if (close) close.addEventListener('click', () => notice.remove());

        window.setTimeout(() => {
            if (notice.parentNode) notice.remove();
        }, 15000);
    }
    // TREEK-PRO-END: topic_live_notice

    function initAuthorTooltips(container) {
        let tooltip = document.querySelector('.treek-custom-tooltip');

        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'treek-custom-tooltip';
            tooltip.style.display = 'none';
            document.body.appendChild(tooltip);
        }

        container.querySelectorAll('[data-treek-tooltip]').forEach(author => {
            author.addEventListener('mouseenter', function(e) {
                const text = this.getAttribute('data-treek-tooltip');
                if (!text) return;

                tooltip.textContent = text;
                tooltip.style.display = 'block';
                moveTooltip(e);
            });

            author.addEventListener('mousemove', moveTooltip);

            author.addEventListener('mouseleave', function() {
                tooltip.style.display = 'none';
            });
        });

        function moveTooltip(e) {
            tooltip.style.left = (e.clientX + 14) + 'px';
            tooltip.style.top = (e.clientY + 14) + 'px';
        }
    }

    // TREEK-PRO-START: screen_teaser
    function initLazyScreenTeasers(container) {
        const placeholders = container.querySelectorAll('.treek-screen-teaser-placeholder');

        if (!placeholders.length || !cachedData || state.teaserMode !== 'screen') return;

        const renderPlaceholder = (placeholder) => {
            if (placeholder.dataset.loaded === '1') return;

            const postId = parseInt(placeholder.dataset.postId, 10);
            const row = cachedData.rows.find(item => parseInt(item.id, 10) === postId);
            const teaserHeight = parseInt(placeholder.dataset.teaserHeight, 10) || 150;

            if (!row || !row.teaserHtml) {
                placeholder.remove();
                return;
            }

            placeholder.dataset.loaded = '1';
            placeholder.className = 'treek-screen-teaser';
            placeholder.style.maxHeight = teaserHeight + 'px';
            placeholder.innerHTML = row.teaserHtml;
            scheduleHardGridOverlay(container);
        };

        if (!('IntersectionObserver' in window)) {
            placeholders.forEach(renderPlaceholder);
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;

                renderPlaceholder(entry.target);
                observer.unobserve(entry.target);
            });
        }, {
            root: container,
            rootMargin: '250px 0px',
            threshold: 0.01
        });

        placeholders.forEach(placeholder => observer.observe(placeholder));
    }
    // TREEK-PRO-END: screen_teaser

    function openSettingsPanel() {
        if (!currentPopover) {
            return;
        }

        const panel = currentPopover.querySelector('.treek-settings-panel');
        const exportPanel = currentPopover.querySelector('.treek-export-panel');

        if (!panel) {
            return;
        }

        panel.style.display = 'block';
        panel.style.position = 'absolute';
        panel.style.right = '20px';
        panel.style.top = '50px';
        panel.style.left = 'auto';

        if (exportPanel) {
            exportPanel.style.display = 'none';
        }
    }

    function showTree(trigger, options = {}) {
        const topicId = trigger.getAttribute('data-topic-id');
        const token = trigger.getAttribute('data-token');

        topicUrl = trigger.getAttribute('data-topic-url') || '';
        currentTrigger = trigger;

        if (!topicId) return;

        if (currentPopover && currentPopover.dataset.topicId === topicId) {
            closePopover();
            return;
        }

        closePopover();

        const popover = document.createElement('div');
        popover.className = 'treek-popover';
        popover.dataset.topicId = topicId;
        popover.style.cssText = `position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:85%; max-width:1200px; height:85vh; z-index:10000; background:#fff; border:1px solid #ccc; border-radius:8px; display:flex; flex-direction:column;`;
        popover.style.setProperty('--treek-screen-teaser-width', getKunenaMessageWidth() + 'px');

        popover.innerHTML = `
            <div class="treek-popover__header" style="display:flex; justify-content:space-between; align-items:center; padding:10px 16px; background:#ffffff; border-bottom:2px solid #eeeeee; flex-shrink:0;">
                <span class="treek-popover__title">${_('TREEK_ICON')} <span class="treek-topic-title">TreeK</span></span>
                <div style="display: flex; gap: 10px; align-items: center;">
    <button type="button" class="treek-popover__export-btn" title="${_('TREEK_EXPORT_SYMBOL_TITLE')}">${_('TREEK_EXPORT_SYMBOL')}</button>
    <button type="button" class="treek-popover__settings-btn" title="${_('TREEK_SETTINGS')}">${_('TREEK_SETTINGS')}</button>
    <button type="button" class="treek-popover__close">${_('TREEK_CLOSE')}</button>
                </div>
            </div>
            
<div class="treek-export-panel" style="display:none; position:absolute; top:50px; right:58px; width:180px; background:#fff; border:1px solid #ccc; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.2); z-index:10001; padding:8px;">
    <!-- TREEK-PRO-START: export_bbcode_html -->
    <button type="button" class="treek-export-format" data-format="bbcode" style="display:block; width:100%; text-align:left; background:none; border:none; cursor:pointer; padding:7px 8px;">${_('TREEK_EXPORT_BBCODE')}</button>
    <button type="button" class="treek-export-format" data-format="html" style="display:block; width:100%; text-align:left; background:none; border:none; cursor:pointer; padding:7px 8px;">${_('TREEK_EXPORT_HTML')}</button>
    <!-- TREEK-PRO-END: export_bbcode_html -->
    ${renderInlineLockedProOption(_('TREEK_EXPORT_BBCODE') + ' / ' + _('TREEK_EXPORT_HTML'))}
    <button type="button" class="treek-export-format" data-format="text" style="display:block; width:100%; text-align:left; background:none; border:none; cursor:pointer; padding:7px 8px;">${_('TREEK_EXPORT_TEXT')}</button>
</div>            
            
            <div class="treek-settings-panel" style="display: none; position: absolute; top: 50px; right: 20px; width: 260px; max-height: calc(85vh - 70px); overflow: hidden; background: #fff; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 10001; padding: 0;">
    <div class="treek-settings-drag-handle" style="cursor: move; padding: 8px 12px; background: #f5f5f5; border-bottom: 1px solid #ddd; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; user-select: none;">
                    <strong>${_('TREEK_SETTINGS')} ${_('TREEK_USER_SETTINGS')}</strong>
                    <div style="display:flex; align-items:center; gap:4px;">
                        ${TREEK_EDITION === 'free' ? `<button type="button" class="treek-settings-pro-preview-btn" title="${_('TREEK_PRO_LOCKED')}" style="background:none; border:1px solid #bbb; border-radius:4px; cursor:pointer; font-size:12px; padding:1px 5px;">${_('TREEK_PRO_LOCK_SYMBOL')} ${_('TREEK_PRO')}</button>` : ''}
                        ${TREEK_EDITION === 'free' ? `<button type="button" class="treek-settings-save-params-locked treek-pro-preview-hidden" title="${_('TREEK_PRO_LOCKED')}" style="background:none; border:1px solid #d7a43b; border-radius:4px; color:#8a6500; cursor:default; font-size:12px; padding:1px 5px;">${_('TREEK_PRO_LOCK_SYMBOL')} ${_('TREEK_SAVE_PARAMS_SYMBOL')}</button>` : ''}
                        <!-- TREEK-PRO-START: settings_persistence -->
                        <button type="button" class="treek-settings-save-params" title="${_('TREEK_SAVE_PARAMS_TITLE')}" style="display:none; background:none; border:none; cursor:pointer; font-size:15px; padding:0 4px;">${_('TREEK_SAVE_PARAMS_SYMBOL')}</button>
                        <button type="button" class="treek-settings-restore-params" title="${_('TREEK_RESTORE_PARAMS_TITLE')}" style="display:none; background:none; border:none; cursor:pointer; font-size:15px; padding:0 4px;">${_('TREEK_RESTORE_PARAMS_SYMBOL')}</button>
                        <button type="button" class="treek-settings-save-params-guest" title="${_('TREEK_REGISTERED_ONLY')}" aria-disabled="true" style="display:none; background:none; border:1px solid #bbb; border-radius:4px; color:#777; cursor:default; font-size:12px; padding:1px 5px;">${_('TREEK_SAVE_PARAMS_SYMBOL')}</button>
                        <!-- TREEK-PRO-END: settings_persistence -->
                        <button type="button" class="treek-settings-close" style="background:none; border:none; cursor:pointer; font-size:16px; padding:0 6px;">${_('TREEK_CLOSE')}</button>
                    </div>
                </div>
                                <div class="treek-settings-scroll" style="max-height: calc(85vh - 118px); overflow-y: auto;">
                <div class="treek-settings-group" style="padding: 10px 12px; border-bottom: 1px solid #eee;"><label style="display:block; font-size:11px; font-weight:bold; color:#777; margin-bottom:6px;">${_('TREEK_SET_VIEW_MODE')}</label>
                    <div class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:4px 0;"><input type="radio" name="tr_view" value="tree" ${state.view==='tree'?'checked':''}> ${_('TREEK_SET_VIEW_TREE')}</div>
                    <!-- TREEK-PRO-START: flat_view -->
                    <div class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:4px 0;"><input type="radio" name="tr_view" value="flat" ${state.view==='flat'?'checked':''}> ${_('TREEK_SET_VIEW_FLAT')}</div>
                    <!-- TREEK-PRO-END: flat_view -->
                    ${renderInlineLockedProOption(_('TREEK_SET_VIEW_FLAT'))}
                </div>
                <div class="treek-settings-group" style="padding: 10px 12px; border-bottom: 1px solid #eee;"><label style="display:block; font-size:11px; font-weight:bold; color:#777; margin-bottom:6px;">${_('TREEK_SET_START_OF_LINE')}</label>
    <div class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:4px 0;"><input type="radio" name="tr_prim" value="subject" ${state.primary==='subject'?'checked':''}> ${_('TREEK_SET_PRIMARY_SUBJECT_AUTHOR')}</div>
    <!-- TREEK-PRO-START: primary_author_subject -->
    <div class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:4px 0;"><input type="radio" name="tr_prim" value="author" ${state.primary==='author'?'checked':''}> ${_('TREEK_SET_PRIMARY_AUTHOR_SUBJECT')}</div>
    <!-- TREEK-PRO-END: primary_author_subject -->
    ${renderInlineLockedProOption(_('TREEK_SET_PRIMARY_AUTHOR_SUBJECT'))}
    <div class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:4px 0;"><input type="radio" name="tr_prim" value="subject_only" ${state.primary==='subject_only'?'checked':''}> ${_('TREEK_SET_PRIMARY_SUBJECT_ONLY')}</div>
                </div>
<div class="treek-settings-group" style="padding: 10px 12px; border-bottom: 1px solid #eee;">
                    <div class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:4px 0;">
                        <input type="checkbox" name="tr_show_teaser" ${state.showTeaser?'checked':''}> <strong>${_('TREEK_SET_SHOW_TEASER')}</strong>
                    </div>
                    <div id="treek_len_wrap" style="margin-left: 22px; margin-top: 6px; display: ${state.showTeaser?'block':'none'};">
                        <label class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:3px 0;">
                            <input type="radio" name="tr_teaser_mode" value="text" ${state.teaserMode === 'text' ? 'checked' : ''}>
                            ${_('TREEK_SET_TEASER_MODE_TEXT')}
                        </label>

                        <label class="treek-opt treek-teaser-text-frame-wrap" style="display:${state.teaserMode === 'text' ? 'flex' : 'none'}; align-items:center; gap:6px; padding:1px 0 3px 24px; font-size:11px; color:#444;">
                            <input type="checkbox" name="tr_teaser_text_frame" ${state.teaserTextFrame ? 'checked' : ''}>
                            ${_('TREEK_SET_TEASER_TEXT_FRAME')}
                        </label>

                        <!-- TREEK-PRO-START: screen_teaser -->
                        <label class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:3px 0;">
                            <input type="radio" name="tr_teaser_mode" value="screen" ${state.teaserMode === 'screen' ? 'checked' : ''}>
                            ${_('TREEK_SET_TEASER_MODE_SCREEN')}
                        </label>
                        <!-- TREEK-PRO-END: screen_teaser -->
                        ${renderInlineLockedProOption(_('TREEK_SET_TEASER_MODE_SCREEN'))}

                        <div style="margin-top: 6px;">
                            <small class="treek-teaser-len-label">${state.teaserMode === 'screen' ? _('TREEK_SET_TEASER_LEN_SCREEN') : _('TREEK_SET_TEASER_LEN_TEXT')}:</small>
                            <input type="number" name="tr_teaser_len" value="${state.teaserLen}" min="10" max="1000" style="width: 70px; font-size: 11px; padding: 1px 4px; height: 20px;">
                        </div>
                    </div>
                </div>                <div class="treek-settings-group" style="padding: 10px 12px; border-bottom: 1px solid #eee;">
                    <div class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:4px 0;">
                        <input type="checkbox" name="tr_time" ${state.showTime?'checked':''}> <strong>${_('TREEK_SET_SHOW_DATE_TIME')}</strong>
                    </div>
                    <div id="treek_time_setup" style="margin-left: 22px; margin-top: 6px; display: ${state.showTime?'block':'none'}; font-size: 12px; color: #444;">
    <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px;">
        <span style="width:52px; font-size:11px; font-weight:bold; color:#777;">${_('TREEK_SET_DATE')}:</span>
        ${getDateTimePreviewHtml()}
    </div>
    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
        <span style="width:52px; font-size:11px; font-weight:bold; color:#777;">- ${_('TREEK_SET_YEAR')}:</span>
        <label class="treek-opt" style="display:flex; align-items:center; gap:4px;"><input type="radio" name="tr_time_year" value="2" ${state.timeFormat.year === '2' ? 'checked' : ''}> 26</label>
        <label class="treek-opt" style="display:flex; align-items:center; gap:4px;"><input type="radio" name="tr_time_year" value="4" ${state.timeFormat.year === '4' ? 'checked' : ''}> 2026</label>
    </div>
    <div style="display:flex; align-items:center; gap:8px;">
        <span style="width:52px; font-size:11px; font-weight:bold; color:#777;">${_('TREEK_SET_TIME_SHORT')}</span>
        <input type="checkbox" name="tr_time_clock" ${state.timeFormat.showClock?'checked':''}>
    </div>
</div>
                </div>
                <div class="treek-settings-group" style="padding: 10px 12px;">
                    <label style="display:block; font-size:11px; font-weight:bold; color:#777; margin-bottom:6px;">${_('TREEK_SET_INDEX')}</label>
                    <div class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:4px 0;"><input type="checkbox" name="tr_index" ${state.showIndex?'checked':''}> ${_('TREEK_SET_INDEX_ON')}</div>
                </div>
                <div class="treek-settings-group" style="padding: 10px 12px;">
    <div class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:4px 0;">
        <input type="checkbox" name="tr_grid" ${state.showGrid?'checked':''}> <strong>${_('TREEK_SET_GRID')}</strong>
    </div>
    <div id="treek_grid_setup" style="margin-left:22px; margin-top:4px; display:${state.showGrid?'block':'none'}; font-size:12px; color:#444;">
        <label class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:3px 0;"><input type="radio" name="tr_grid_mode" value="light" ${state.gridMode === 'light' ? 'checked' : ''}> ${_('TREEK_TAB_CHARACTER_LIGHT_SYMBOL')} ${_('TREEK_SET_GRID_LIGHT')}</label>
        <label class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:3px 0;"><input type="radio" name="tr_grid_mode" value="hard" ${state.gridMode === 'hard' ? 'checked' : ''}> ${_('TREEK_TAB_CHARACTER_HARD_SYMBOL')} ${_('TREEK_SET_GRID_HARD')}</label>
    </div>
</div>

<!-- TREEK-PRO-START: comfort_tools -->
<div class="treek-settings-group" style="padding: 10px 12px;">
    <div class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:4px 0;">
        <input type="checkbox" name="tr_show_comfort_tools" ${state.showComfortTools?'checked':''}> <strong>${_('TREEK_SET_COMFORT_TOOLS')}</strong>
    </div>

    <div id="treek_comfort_tools_setup" style="margin-left:22px; margin-top:4px; display:${state.showComfortTools?'block':'none'}; font-size:12px; color:#444;">
                        <label class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:3px 0;"><input type="checkbox" name="tr_nav_tools" ${state.showNavTools?'checked':''}> ${_('TREEK_SET_NAV_TOOLS')}</label>
                        <label class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:3px 0;"><input type="checkbox" name="tr_highlight_tools" ${state.showHighlightTools?'checked':''}> ${_('TREEK_SET_HIGHLIGHT_TOOLS')}</label>
                    </div>
                </div>
<!-- TREEK-PRO-END: comfort_tools -->
${renderInlineLockedProOption(_('TREEK_SET_COMFORT_TOOLS'), _('TREEK_SET_NAV_TOOLS') + ' / ' + _('TREEK_SET_HIGHLIGHT_TOOLS'))}
<!-- TREEK-PRO-START: treek_view_settings -->
<div class="treek-settings-group" style="padding: 10px 12px;">
    <div class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:4px 0;">
        <input type="checkbox" name="tr_forum_view" ${showForumViewSettings ? 'checked' : ''} title="${_('TREEK_REGISTERED_ONLY')}"> <strong>${_('TREEK_SET_FORUM_VIEW')}</strong>
    </div>
    <div id="treek_forum_view_setup" style="margin-left:22px; margin-top:4px; display:${showForumViewSettings ? 'block' : 'none'}; font-size:12px; color:#444;">
        <label class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:3px 0;"><input type="checkbox" name="tv_parent_post_navigation" ${treekViewFeatures.parent_post_navigation ? 'checked' : ''}> ${_('TREEK_SET_PARENT_POST_NAVIGATION')} ${_('TREEK_NAV_TO_PARENT_IN_TREE_SYMBOL')}</label>
        <label class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:3px 0;"><input type="checkbox" name="tv_reply_form_treek_look" ${treekViewFeatures.reply_form_treek_look ? 'checked' : ''}> ${_('TREEK_SET_REPLY_FORM_TREEK_LOOK')}</label>
        <label class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:3px 0;"><input type="checkbox" name="tv_subject_suffix" ${treekViewFeatures.subject_suffix ? 'checked' : ''}> ${_('TREEK_SET_SUBJECT_SUFFIX')}</label>
        <label class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:3px 0;"><input type="checkbox" name="tv_attachments_toggle" ${treekViewFeatures.attachments_toggle ? 'checked' : ''}> ${_('TREEK_SET_ATTACHMENTS_TOGGLE')}</label>
        <label class="treek-opt" style="display:flex; align-items:center; gap:8px; padding:3px 0;"><input type="checkbox" name="tv_inline_action_buttons" ${treekViewFeatures.inline_action_buttons ? 'checked' : ''}> ${_('TREEK_SET_INLINE_ACTION_BUTTONS')}</label>
    </div>
</div>
<!-- TREEK-PRO-END: treek_view_settings -->
${renderFreeProPreviewHtml()}
                            </div>
            </div>
            <div class="treek-popover__body" style="flex:1; overflow:auto; padding:15px;"><div class="treek-loading">${_('TREEK_LOADING')}</div></div>
        `;

        document.body.appendChild(popover);
        currentPopover = popover;

        // TREEK-PRO-START: settings_drag
        initSettingsDrag(popover);
        // TREEK-PRO-END: settings_drag

        fetchTreeData(topicId, token, trigger)
            .then(data => {
                cachedData = data;
                treekViewFeatures = normalizeTreekViewFeatures(data.treekViewFeatures);
                window.treekViewFeatures = treekViewFeatures;
                {
                    const savedForumViewOpen = loadForumViewOpenState();
                    showForumViewSettings = savedForumViewOpen === null
                        ? hasCustomTreekViewFeatures(treekViewFeatures)
                        : savedForumViewOpen;
                }
                syncSettingsControls();
                treeLastPostId = getCurrentLastPostId();
                updateUserParamsButtons();

                if (data.topicTitle) {
                    const titleEl = popover.querySelector('.treek-topic-title');
                    if (titleEl) titleEl.textContent = data.topicTitle;
                }

                activePostId = trigger.getAttribute('data-current-post-id') || null;

renderContent();

if (activePostId) {
    activateTreeRow(activePostId);
}

if (options.openSettings !== false) {
    openSettingsPanel();
}

// TREEK-PRO-START: topic_live_notice
startTreePolling(topicId, trigger);
// TREEK-PRO-END: topic_live_notice

            })
            .catch(err => {
                if (currentPopover) {
                    currentPopover.querySelector('.treek-popover__body').innerHTML =
                        `<div class="treek-error">${escapeHtml(err.message)}</div>`;
                }
            });
    }

    function clearTreeHighlights() {
        if (!currentPopover) return;

        currentPopover.querySelectorAll('.treek-row--highlight-author, .treek-row--highlight-family').forEach(row => {
            row.classList.remove('treek-row--highlight-author', 'treek-row--highlight-family');
        });
    }

function activateTreeRow(postId) {
    if (!currentPopover || !postId) return;

    const targetId = String(postId);
    activePostId = targetId;
    let targetRow = null;

    currentPopover.querySelectorAll('.treek-row').forEach(row => {
        row.classList.remove('treek-row--active');

        if (row.dataset.postId === targetId) {
            targetRow = row;
        }
    });

    if (!targetRow) return;

    clearTreeHighlights();

    targetRow.classList.add('treek-row--active');
    targetRow.scrollIntoView({
        block: 'nearest',
        inline: 'nearest'
    });
}

    function highlightAuthorRows(authorKey) {
        if (!currentPopover || !authorKey) return;

        clearTreeHighlights();

        currentPopover.querySelectorAll('.treek-row').forEach(row => {
            if (row.dataset.author === authorKey) {
                row.classList.add('treek-row--highlight-author');
            }
        });
    }

    function highlightFamilyRows(postId) {
    if (!currentPopover || !postId) return;

    clearTreeHighlights();

    currentPopover.querySelectorAll('.treek-row').forEach(row => {
        if (row.dataset.postId === postId || row.dataset.parentId === postId) {
            row.classList.add('treek-row--highlight-family');
        }
    });
}

    function getPersistableState() {
        const persistable = {
            view: state.view,
            primary: state.primary,
            showTime: state.showTime,
            timeFormat: state.timeFormat,
            showIndex: state.showIndex,
            showGrid: state.showGrid,
            gridMode: state.gridMode,
            showComfortTools: state.showComfortTools,
            showNavTools: state.showNavTools,
            showHighlightTools: state.showHighlightTools,
            showTeaser: state.showTeaser,
            teaserMode: state.teaserMode,
            teaserLen: state.teaserLen,
            teaserTextFrame: state.teaserTextFrame
        };

        // TREEK-PRO-START: treek_view_settings
        persistable.treekViewFeatures = treekViewFeatures;
        // TREEK-PRO-END: treek_view_settings

        return persistable;
    }
    
    function getExportRows() {
    const rows = [...(cachedData?.rows || [])];

    // TREEK-PRO-START: flat_view
    if (state.view === 'flat') {
        rows.sort((a, b) => a.id - b.id);
    }
    // TREEK-PRO-END: flat_view

    return rows;
}

function getExportLevel(row) {
    // TREEK-PRO-START: flat_view
    if (state.view !== 'tree') {
        return 0;
    }
    // TREEK-PRO-END: flat_view

    return Math.max(0, parseInt(row.level, 10) || 0);
}

function normalizeExportText(value, fallback = '') {
    const text = String(value || fallback);

    return text.replace(/\s+/g, ' ').trim();
}

function buildAbsolutePostUrl(postId, postIndex) {
    return new URL(buildPostUrl(postId, postIndex), window.location.origin).toString();
}

function buildExportSubject(row, format) {
    const subject = normalizeExportText(row.subject, '...');
    const absoluteUrl = buildAbsolutePostUrl(row.id, row.postIndex);

    // TREEK-PRO-START: export_bbcode_html
    if (format === 'bbcode') {
        return `[url="${absoluteUrl}"]${subject}[/url]`;
    }

    if (format === 'html') {
        return `<a href="${escapeAttr(absoluteUrl)}">${escapeHtml(subject)}</a>`;
    }
    // TREEK-PRO-END: export_bbcode_html

    return subject;
}

function buildExportAuthor(row, format) {
    const author = normalizeExportText(row.username || row.author, 'Guest');

    // TREEK-PRO-START: export_bbcode_html
    if (format === 'html') {
        return escapeHtml(author);
    }
    // TREEK-PRO-END: export_bbcode_html

    return author;
}

function buildExportLine(row, format) {
    const subject = buildExportSubject(row, format);
    const author = buildExportAuthor(row, format);
    const parts = [];

    if (state.primary === 'author') {
        parts.push(author, subject);
    } else if (state.primary === 'subject_only') {
        parts.push(subject);
    } else {
        parts.push(subject, author);
    }

    if (state.showTime) {
        const time = normalizeExportText(formatTreeTime(row));

        if (time) {
            parts.push(format === 'html' ? escapeHtml(time) : time);
        }
    }

    if (state.showIndex) {
        parts.push('#' + row.id);
    }

    return parts.join(' ');
}

function buildTreeExport(format) {
    const rows = getExportRows();

    // TREEK-PRO-START: export_bbcode_html
    if (format === 'html') {
        return rows.map(row => {
            const level = getExportLevel(row);
            const margin = level * 1.5;

            return `<div style="padding-left:${margin}em">${buildExportLine(row, format)}</div>`;
        }).join('\n');
    }
    // TREEK-PRO-END: export_bbcode_html

    return rows.map(row => {
    const level = getExportLevel(row);
    let indent = '\u00A0\u00A0\u00A0'.repeat(level);

    // TREEK-PRO-START: export_bbcode_html
    if (format !== 'text') {
        indent = '.  '.repeat(level);
    }
    // TREEK-PRO-END: export_bbcode_html
    
    return indent + buildExportLine(row, format);
}).join('\n');

}

function getExportFormatLabel(format) {
    // TREEK-PRO-START: export_bbcode_html
    if (format === 'bbcode') {
        return _('TREEK_EXPORT_BBCODE');
    }

    if (format === 'html') {
        return _('TREEK_EXPORT_HTML');
    }
    // TREEK-PRO-END: export_bbcode_html

    return _('TREEK_EXPORT_TEXT');
}

function showExportNotice(message, isError = false) {
    if (!currentPopover) {
        return;
    }

    const oldNotice = currentPopover.querySelector('.treek-export-notice');

    if (oldNotice) {
        oldNotice.remove();
    }

    const notice = document.createElement('div');
    notice.className = 'treek-export-notice' + (isError ? ' treek-export-notice--error' : '');
    notice.textContent = message;

    currentPopover.appendChild(notice);

    window.setTimeout(() => {
        if (notice.isConnected) {
            notice.remove();
        }
    }, 2600);
}

function writeTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }

    return new Promise((resolve, reject) => {
        const textarea = document.createElement('textarea');

        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';

        document.body.appendChild(textarea);
        textarea.select();

        try {
            const copied = document.execCommand('copy');

            textarea.remove();

            if (copied) {
                resolve();
            } else {
                reject(new Error('Clipboard copy failed'));
            }
        } catch (err) {
            textarea.remove();
            reject(err);
        }
    });
}

function exportTreeToClipboard(format) {
    const content = buildTreeExport(format);

    if (!content) {
        showExportNotice(_('TREEK_EXPORT_COPY_ERROR'), true);
        return;
    }

    writeTextToClipboard(content)
        .then(() => {
            showExportNotice(`${_('TREEK_EXPORT_COPIED')}: ${getExportFormatLabel(format)}`);

            const panel = currentPopover?.querySelector('.treek-export-panel');

            if (panel) {
                panel.style.display = 'none';
            }
        })
        .catch(err => {
            console.warn('TREEK export clipboard failed', err);
            showExportNotice(_('TREEK_EXPORT_COPY_ERROR'), true);
        });
}


    function updateUserParamsButtons() {
        if (!currentPopover) return;

        const userParams = cachedData?.userParams || {};
        const saveBtn = currentPopover.querySelector('.treek-settings-save-params');
        const restoreBtn = currentPopover.querySelector('.treek-settings-restore-params');
        const lockedSaveBtn = currentPopover.querySelector('.treek-settings-save-params-locked');
        const guestSaveBtn = currentPopover.querySelector('.treek-settings-save-params-guest');

        if (TREEK_EDITION === 'free') {
            if (saveBtn) saveBtn.style.display = 'none';
            if (restoreBtn) restoreBtn.style.display = 'none';
            if (lockedSaveBtn) lockedSaveBtn.classList.toggle('treek-pro-preview-hidden', !showProPreview);
            if (guestSaveBtn) guestSaveBtn.style.display = 'none';
            return;
        }

        if (saveBtn) saveBtn.style.display = userParams.canSave ? 'inline-block' : 'none';
        if (restoreBtn) restoreBtn.style.display = (userParams.canSave && userParams.hasSaved) ? 'inline-block' : 'none';
        if (guestSaveBtn) guestSaveBtn.style.display = userParams.canSave ? 'none' : 'inline-block';
        syncRegisteredOnlyControls();
    }

    function syncRegisteredOnlyControls() {
        if (!currentPopover || TREEK_EDITION !== 'pro') return;

        const canSave = !!cachedData?.userParams?.canSave;
        const disabledTitle = _('TREEK_REGISTERED_ONLY');
        const names = [
            'tr_forum_view',
            'tv_parent_post_navigation',
            'tv_reply_form_treek_look',
            'tv_subject_suffix',
            'tv_attachments_toggle',
            'tv_inline_action_buttons'
        ];

        names.forEach(name => {
            currentPopover.querySelectorAll(`[name="${name}"]`).forEach(input => {
                input.disabled = !canSave;
                input.title = canSave ? '' : disabledTitle;
                const label = input.closest('label, .treek-opt');
                if (label) {
                    label.title = canSave ? '' : disabledTitle;
                    label.classList.toggle('treek-registered-only-disabled', !canSave);
                }
            });
        });
    }

    function fetchUserParamsTask(task, payload = null, allowTokenRefresh = true) {
        if (!currentPopover || !currentTrigger) {
            return Promise.reject(new Error(_('TREEK_ERROR_REFRESH_TREE')));
        }

        const topicId = currentPopover.dataset.topicId;
        const token = currentTrigger.getAttribute('data-token');
        const options = {
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-store'
        };

        if (payload !== null) {
            options.method = 'POST';
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(payload);
        }

        return fetch(`${AJAX_URL}&task=${task}&topic_id=${topicId}&${token}=1`, options)
            .then(parseAjaxJsonResponse)
            .then(data => {
                if (isTokenError(data.error) && allowTokenRefresh) {
                    return fetchFreshToken().then(freshToken => {
                        currentTrigger.setAttribute('data-token', freshToken);
                        return fetchUserParamsTask(task, payload, false);
                    });
                }

                if (data.error) throw new Error(data.error);

                return data;
            });
    }

    function saveUserParams() {
        return fetchUserParamsTask('params_save', {
            settings: getPersistableState()
        }).then(data => {
            cachedData.userParams = Object.assign(
                {},
                cachedData.userParams || {},
                data?.userParams || {},
                {
                    canSave: true,
                    hasSaved: true,
                    hasSavedTree: true
                }
            );

            updateUserParamsButtons();

            return data;
        });
    }

    function restoreUserParams() {
        return fetchUserParamsTask('params_restore').then(data => {
            if (!data?.settings) {
                throw new Error(_('TREEK_PARAMS_RESTORE_ERROR'));
            }

            state = Object.assign({}, defaultState, data.settings);
            state.timeFormat = normalizeTimeFormat(state.timeFormat);
            normalizeEditionState();

            // TREEK-PRO-START: treek_view_settings
            if (data.settings.treekViewFeatures) {
                treekViewFeatures = normalizeTreekViewFeatures(data.settings.treekViewFeatures);
                window.treekViewFeatures = treekViewFeatures;
                {
                    const savedForumViewOpen = loadForumViewOpenState();
                    showForumViewSettings = savedForumViewOpen === null
                        ? hasCustomTreekViewFeatures(treekViewFeatures)
                        : savedForumViewOpen;
                }
            }
            // TREEK-PRO-END: treek_view_settings

            saveState();
            syncSettingsControls();
            renderContent();

            return data;
        });
    }

    function scheduleTreekViewAutoSave() {
        if (TREEK_EDITION !== 'pro' || !cachedData?.userParams?.canSave) {
            return;
        }

        if (treekViewAutoSaveTimer) {
            window.clearTimeout(treekViewAutoSaveTimer);
        }

        treekViewAutoSaveTimer = window.setTimeout(() => {
            treekViewAutoSaveTimer = null;

            fetchUserParamsTask('params_save', {
                settings: getPersistableState()
            })
                .then(data => {
                    cachedData.userParams = Object.assign(
                        {},
                        cachedData.userParams || {},
                        data?.userParams || {},
                        {
                            canSave: true,
                            hasSaved: true,
                            hasSavedTree: true
                        }
                    );

                    updateUserParamsButtons();
                    rememberTreeReopenAfterReload();
                    window.location.reload();
                })
                .catch(err => {
                    console.warn('TREEK forum view autosave failed', err);
                });
        }, 500);
    }

    function syncSettingsControls() {
        if (!currentPopover) return;

        const setChecked = (name, checked) => {
            currentPopover.querySelectorAll(`[name="${name}"]`).forEach(input => {
                input.checked = !!checked;
            });
        };

        const setRadio = (name, value) => {
            currentPopover.querySelectorAll(`[name="${name}"]`).forEach(input => {
                input.checked = input.value === String(value);
            });
        };

        setRadio('tr_view', state.view);
        setRadio('tr_prim', state.primary);
        setChecked('tr_show_teaser', state.showTeaser);
        setRadio('tr_teaser_mode', state.teaserMode);
        setChecked('tr_teaser_text_frame', state.teaserTextFrame);
        setChecked('tr_time', state.showTime);
        setRadio('tr_time_year', state.timeFormat.year);
        setChecked('tr_time_clock', state.timeFormat.showClock);
        setChecked('tr_index', state.showIndex);
        setChecked('tr_grid', state.showGrid);
        setRadio('tr_grid_mode', state.gridMode);
        // TREEK-PRO-START: comfort_tools
        setChecked('tr_show_comfort_tools', state.showComfortTools);
        setChecked('tr_nav_tools', state.showNavTools);
        setChecked('tr_highlight_tools', state.showHighlightTools);
        // TREEK-PRO-END: comfort_tools
        // TREEK-PRO-START: treek_view_settings
        setChecked('tr_forum_view', showForumViewSettings);
        setChecked('tv_parent_post_navigation', treekViewFeatures.parent_post_navigation);
        setChecked('tv_reply_form_treek_look', treekViewFeatures.reply_form_treek_look);
        setChecked('tv_subject_suffix', treekViewFeatures.subject_suffix);
        setChecked('tv_attachments_toggle', treekViewFeatures.attachments_toggle);
        setChecked('tv_inline_action_buttons', treekViewFeatures.inline_action_buttons);
        // TREEK-PRO-END: treek_view_settings

        const teaserLen = currentPopover.querySelector('[name="tr_teaser_len"]');
        if (teaserLen) teaserLen.value = state.teaserLen;

        const teaserWrap = currentPopover.querySelector('#treek_len_wrap');
        if (teaserWrap) teaserWrap.style.display = state.showTeaser ? 'block' : 'none';

        const teaserTextFrameWrap = currentPopover.querySelector('.treek-teaser-text-frame-wrap');
        if (teaserTextFrameWrap) teaserTextFrameWrap.style.display = state.teaserMode === 'text' ? 'flex' : 'none';

        const timeSetup = currentPopover.querySelector('#treek_time_setup');
        if (timeSetup) timeSetup.style.display = state.showTime ? 'block' : 'none';

        const gridSetup = currentPopover.querySelector('#treek_grid_setup');
        if (gridSetup) gridSetup.style.display = state.showGrid ? 'block' : 'none';

        // TREEK-PRO-START: comfort_tools
        const comfortSetup = currentPopover.querySelector('#treek_comfort_tools_setup');
        if (comfortSetup) comfortSetup.style.display = state.showComfortTools ? 'block' : 'none';
        // TREEK-PRO-END: comfort_tools
        // TREEK-PRO-START: treek_view_settings
        const forumViewSetup = currentPopover.querySelector('#treek_forum_view_setup');
        if (forumViewSetup) forumViewSetup.style.display = showForumViewSettings ? 'block' : 'none';
        // TREEK-PRO-END: treek_view_settings

        updateDateTimePreview();
        syncRegisteredOnlyControls();
    }

    // TREEK-PRO-START: settings_drag
    function initSettingsDrag(popover) {
        const panel = popover.querySelector('.treek-settings-panel');
        const handle = popover.querySelector('.treek-settings-drag-handle');

        if (!panel || !handle) return;

        let isDragging = false;
        let grabOffsetX = 0;
        let grabOffsetY = 0;

        const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

        handle.addEventListener('mousedown', function(e) {
            if (e.target.closest('.treek-settings-close')) return;

            e.preventDefault();

            const popoverRect = popover.getBoundingClientRect();
            const rect = panel.getBoundingClientRect();

            grabOffsetX = e.clientX - rect.left;
            grabOffsetY = e.clientY - rect.top;

            panel.style.position = 'absolute';
            panel.style.left = (rect.left - popoverRect.left) + 'px';
            panel.style.top = (rect.top - popoverRect.top) + 'px';
            panel.style.right = 'auto';

            isDragging = true;
            document.body.classList.add('treek-settings-dragging');
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;

            const popoverRect = popover.getBoundingClientRect();
            const maxLeft = Math.max(0, popoverRect.width - panel.offsetWidth);
            const maxTop = Math.max(0, popoverRect.height - panel.offsetHeight);
            const newLeft = clamp(e.clientX - popoverRect.left - grabOffsetX, 0, maxLeft);
            const newTop = clamp(e.clientY - popoverRect.top - grabOffsetY, 0, maxTop);

            panel.style.position = 'absolute';
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
            panel.style.right = 'auto';
        });

        document.addEventListener('mouseup', function() {
            if (isDragging) {
                isDragging = false;
                document.body.classList.remove('treek-settings-dragging');
                document.body.style.userSelect = '';
            }
        });
    }
    // TREEK-PRO-END: settings_drag

    const init = () => {
        document.addEventListener('click', function(e) {
            const trigger = e.target.closest('.treek-trigger, .treek-icon-trigger');

            if (trigger) {
                e.preventDefault();
                e.stopPropagation();
                showTree(trigger);
                return;
            }

            const parentLink = e.target.closest('.treek-parent-link');

if (parentLink) {
    e.preventDefault();
    e.stopPropagation();

    resolveParentLink(parentLink);
    return;
}

            if (!currentPopover) return;
            
            const parentNav = e.target.closest('.treek-row__tool--parent');

if (parentNav) {
    e.preventDefault();
    e.stopPropagation();

    const row = parentNav.closest('.treek-row');
    if (row) activateTreeRow(row.dataset.parentId);

    return;
}

const childNav = e.target.closest('.treek-row__tool--child');

if (childNav) {
    e.preventDefault();
    e.stopPropagation();

    activateTreeRow(childNav.dataset.childId);

    return;
}

            const authorHighlight = e.target.closest('.treek-row__tool--author');

            if (authorHighlight) {
                e.preventDefault();
                e.stopPropagation();
                highlightAuthorRows(authorHighlight.dataset.author);
                return;
            }

            const familyHighlight = e.target.closest('.treek-row__tool--family');

            if (familyHighlight) {
                e.preventDefault();
                e.stopPropagation();
                highlightFamilyRows(familyHighlight.dataset.postId);
                return;
            }

            const subjectLink = e.target.closest('.treek-row__subject');

            if (subjectLink) {
                const row = subjectLink.closest('.treek-row-link');

                if (row) {
                    window.location.href = buildPostUrl(row.dataset.postId, row.dataset.postIndex);
                    closePopover();
                    return;
                }
            }

            if (e.target.closest('.treek-popover__close')) {
                closePopover();
                return;
            }

if (e.target.closest('.treek-popover__export-btn')) {
    e.stopPropagation();

    const panel = currentPopover.querySelector('.treek-export-panel');
    const settingsPanel = currentPopover.querySelector('.treek-settings-panel');

    if (panel) {
        const isVisible = panel.style.display === 'block';
        panel.style.display = isVisible ? 'none' : 'block';

        if (settingsPanel) {
            settingsPanel.style.display = 'none';
        }
    }

    return;
}

            if (e.target.closest('.treek-popover__export-btn')) {
    e.stopPropagation();

    const exportPanel = currentPopover.querySelector('.treek-export-panel');
    const settingsPanel = currentPopover.querySelector('.treek-settings-panel');

    if (exportPanel) {
        const isVisible = exportPanel.style.display === 'block';
        exportPanel.style.display = isVisible ? 'none' : 'block';

        if (settingsPanel) {
            settingsPanel.style.display = 'none';
        }
    }

    return;
}

const exportFormatButton = e.target.closest('.treek-export-format');

if (exportFormatButton) {
    e.preventDefault();
    e.stopPropagation();

    exportTreeToClipboard(exportFormatButton.dataset.format);

    return;
}

if (e.target.closest('.treek-popover__settings-btn')) {
    e.stopPropagation();

    const panel = currentPopover.querySelector('.treek-settings-panel');
    const exportPanel = currentPopover.querySelector('.treek-export-panel');

    if (panel) {
        const isVisible = panel.style.display === 'block';
        panel.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            panel.style.position = 'absolute';
            panel.style.right = '20px';
            panel.style.top = '50px';
            panel.style.left = 'auto';
        }
    }

    if (exportPanel) {
        exportPanel.style.display = 'none';
    }

    return;
}

// TREEK-PRO-START: settings_persistence
if (e.target.closest('.treek-settings-save-params')) {
                e.preventDefault();
                e.stopPropagation();

                saveUserParams()
                    .then(data => {
                        console.info('TREEK params saved', data);
                        showExportNotice(_('TREEK_PARAMS_SAVED'));
                    })
                    .catch(err => {
                    console.warn('TREEK params save failed', err);
                    alert(err && err.message ? err.message : _('TREEK_PARAMS_SAVE_ERROR'));
                });

                return;
            }
// TREEK-PRO-END: settings_persistence

            if (e.target.closest('.treek-settings-pro-preview-btn')) {
                e.preventDefault();
                e.stopPropagation();

                showProPreview = !showProPreview;

                const preview = currentPopover.querySelector('.treek-pro-preview');
                if (preview) preview.style.display = showProPreview ? 'block' : 'none';

                currentPopover.querySelectorAll('.treek-pro-locked-option').forEach(option => {
                    option.classList.toggle('treek-pro-preview-hidden', !showProPreview);
                });

                updateUserParamsButtons();

                return;
            }

            // TREEK-PRO-START: settings_persistence
            if (e.target.closest('.treek-settings-restore-params')) {
                e.preventDefault();
                e.stopPropagation();

                restoreUserParams()
                    .then(data => {
                        console.info('TREEK params restored', data);
                        showExportNotice(_('TREEK_PARAMS_RESTORED'));
                    })
                    .catch(err => {
                    console.warn('TREEK params restore failed', err);
                    alert(err && err.message ? err.message : _('TREEK_PARAMS_RESTORE_ERROR'));
                });

                return;
            }
            // TREEK-PRO-END: settings_persistence

            if (e.target.closest('.treek-settings-close')) {
                e.stopPropagation();

                const panel = currentPopover.querySelector('.treek-settings-panel');
                if (panel) panel.style.display = 'none';

                return;
            }

            if (!e.target.closest('.treek-popover')) {
                closePopover();
            }
        }, true);

        document.addEventListener('change', function(e) {
            if (!currentPopover || !e.target.name) return;
            if (TREEK_EDITION === 'pro' && !cachedData?.userParams?.canSave && (e.target.name === 'tr_forum_view' || e.target.name.startsWith('tv_'))) {
                e.preventDefault();
                syncSettingsControls();
                return;
            }

            // TREEK-PRO-START: flat_view
            if (e.target.name === 'tr_view') state.view = e.target.value;
            // TREEK-PRO-END: flat_view

            if (e.target.name === 'tr_prim') {
                // TREEK-PRO-START: primary_author_subject
                if (e.target.value === 'author') {
                    state.primary = e.target.value;
                } else
                // TREEK-PRO-END: primary_author_subject
                {
                    state.primary = e.target.value;
                }
            }
            if (e.target.name === 'tr_time') {
                state.showTime = e.target.checked;

                const setup = currentPopover.querySelector('#treek_time_setup');
                if (setup) setup.style.display = state.showTime ? 'block' : 'none';

                updateDateTimePreview();
            }
            if (e.target.name === 'tr_index') state.showIndex = e.target.checked;

if (e.target.name === 'tr_grid') {
    state.showGrid = e.target.checked;

    const setup = currentPopover.querySelector('#treek_grid_setup');
    if (setup) setup.style.display = state.showGrid ? 'block' : 'none';
}

if (e.target.name === 'tr_grid_mode') state.gridMode = e.target.value;

// TREEK-PRO-START: comfort_tools
if (e.target.name === 'tr_show_comfort_tools') {
                state.showComfortTools = e.target.checked;

                const setup = currentPopover.querySelector('#treek_comfort_tools_setup');
                if (setup) setup.style.display = state.showComfortTools ? 'block' : 'none';
            }
            if (e.target.name === 'tr_nav_tools') state.showNavTools = e.target.checked;
            if (e.target.name === 'tr_highlight_tools') state.showHighlightTools = e.target.checked;
// TREEK-PRO-END: comfort_tools

// TREEK-PRO-START: treek_view_settings
if (e.target.name === 'tr_forum_view') {
    showForumViewSettings = e.target.checked;
    saveForumViewOpenState();

    const setup = currentPopover.querySelector('#treek_forum_view_setup');
    if (setup) setup.style.display = showForumViewSettings ? 'block' : 'none';
}

if (e.target.name === 'tv_parent_post_navigation') treekViewFeatures.parent_post_navigation = e.target.checked;
if (e.target.name === 'tv_reply_form_treek_look') treekViewFeatures.reply_form_treek_look = e.target.checked;
if (e.target.name === 'tv_subject_suffix') treekViewFeatures.subject_suffix = e.target.checked;
if (e.target.name === 'tv_attachments_toggle') treekViewFeatures.attachments_toggle = e.target.checked;
if (e.target.name === 'tv_inline_action_buttons') treekViewFeatures.inline_action_buttons = e.target.checked;

if (e.target.name && e.target.name.startsWith('tv_')) {
    window.treekViewFeatures = treekViewFeatures;
    scheduleTreekViewAutoSave();
}
// TREEK-PRO-END: treek_view_settings

            if (e.target.name === 'tr_show_teaser') {
                state.showTeaser = e.target.checked;

                const wrap = currentPopover.querySelector('#treek_len_wrap');
                if (wrap) wrap.style.display = state.showTeaser ? 'block' : 'none';
            }

// TREEK-PRO-START: screen_teaser
if (e.target.name === 'tr_teaser_mode') {
    state.teaserMode = e.target.value;
    state.teaserLen = (state.teaserMode === 'screen') ? 120 : 150;

    const label = currentPopover.querySelector('.treek-teaser-len-label');
    if (label) {
        label.textContent = (state.teaserMode === 'screen')
            ? _('TREEK_SET_TEASER_LEN_SCREEN') + ':'
            : _('TREEK_SET_TEASER_LEN_TEXT') + ':';
    }

    const teaserLen = currentPopover.querySelector('[name="tr_teaser_len"]');
    if (teaserLen) teaserLen.value = state.teaserLen;

    const teaserTextFrameWrap = currentPopover.querySelector('.treek-teaser-text-frame-wrap');
    if (teaserTextFrameWrap) teaserTextFrameWrap.style.display = state.teaserMode === 'text' ? 'flex' : 'none';
}
// TREEK-PRO-END: screen_teaser

            if (e.target.name === 'tr_teaser_text_frame') {
                state.teaserTextFrame = e.target.checked;
            }

            if (e.target.name === 'tr_time_year') {
                state.timeFormat.year = e.target.value;
                updateDateTimePreview();
            }

            if (e.target.name === 'tr_time_clock') {
                state.timeFormat.showClock = e.target.checked;
                updateDateTimePreview();
            }

            if (e.target.name === 'tr_teaser_len') state.teaserLen = parseInt(e.target.value, 10) || 150;

            saveState();
            renderContent();
        });

        const reopenPayload = consumeTreeReopenAfterReload();

        if (reopenPayload) {
            window.requestAnimationFrame(() => {
                const trigger = Array.from(document.querySelectorAll('.treek-trigger, .treek-icon-trigger'))
                    .find(item => item.getAttribute('data-topic-id') === String(reopenPayload.topicId));

                if (!trigger) {
                    return;
                }

                if (reopenPayload.currentPostId && !trigger.getAttribute('data-current-post-id')) {
                    trigger.setAttribute('data-current-post-id', reopenPayload.currentPostId);
                }

                showTree(trigger, {
                    openSettings: !!reopenPayload.openSettings
                });
            });
        }
    };

    function closePopover() {
        stopTreePolling();

        if (currentPopover) {
    currentPopover.remove();
    currentPopover = null;
    currentTrigger = null;
    cachedData = null;
    activePostId = null;
}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
