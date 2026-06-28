/**
 * TreeK patch v1.0
 * Subject field with protected suffix.
 *
 * Three suffix states per cancel button:
 *   State 0: suffix shown           → button shows ⇏ (COM_KUNENA_TREEK_ARROW_CANCEL)
 *   State 1: current reply only off → button shows ⇍ (COM_KUNENA_TREEK_ARROW_CANCEL_ONE)
 *   State 2: all replies off        → button shows ⇒ (COM_KUNENA_TREEK_ARROW_SUFFIX_OFF)
 *
 * Session-level state stored in sessionStorage.
 * Button icons and tooltips come from data-treek-* attributes set by PHP.
 */

const TREEK_SESSION_KEY = 'treek_suffix_disabled';

function treekIsSuffixDisabled() {
    try { return sessionStorage.getItem(TREEK_SESSION_KEY) === '1'; } catch(e) { return false; }
}

function treekSetSuffixDisabled(val) {
    try { sessionStorage.setItem(TREEK_SESSION_KEY, val ? '1' : '0'); } catch(e) {}
}

function treekUpdateAllButtons() {
    document.querySelectorAll('[data-treek-cancel-for]').forEach(function(btn) {
        const inputId = btn.dataset.treekCancelFor;
        const input   = document.getElementById(inputId);
        if (!input) return;

        let newText, newTitle;

        if (treekIsSuffixDisabled()) {
            // State 2: suffixes globally off — ⇒
            newText  = btn.dataset.treekIconOff    || '⇒';
            newTitle = btn.dataset.treekTipOff     || '';
        } else if (input.dataset.treekSuffixCancelled === '1') {
            // State 1: current reply suffix off — ⇍
            newText  = btn.dataset.treekIconOne    || '⇍';
            newTitle = btn.dataset.treekTipOne     || '';
        } else {
            // State 0: suffix shown — ⇏
            newText  = btn.dataset.treekIconCancel || '⇏';
            newTitle = btn.dataset.treekTipCancel  || '';
        }

        btn.textContent = newText;
        btn.title       = newTitle;
        btn.setAttribute('title', newTitle);
        btn.setAttribute('data-bs-original-title', newTitle);

        // Update Bootstrap tooltip if already initialised
        try {
            const bsTooltip = bootstrap.Tooltip.getInstance(btn);
            if (bsTooltip) {
                bsTooltip._config.title = newTitle;
                bsTooltip.setContent({ '.tooltip-inner': newTitle });
            }
        } catch(e) {}
    });
}

document.addEventListener('DOMContentLoaded', function () {

    // Apply session state to all buttons on page load
    treekUpdateAllButtons();

    document.querySelectorAll('.treek-subject-field').forEach(function (input) {
        let fullSuffix      = input.dataset.treekSuffix || '';
        const maxLen        = parseInt(input.getAttribute('maxlength')) || 255;
        let userText        = '';
        let suffixCancelled = false;

        input.dataset.maxLen = maxLen;
        input.removeAttribute('maxlength');

        // Force clear any cached browser value
        input.value = '';

        function getActiveSuffix() {
            const available = maxLen - userText.length;
            if (available <= 0) return '';
            return fullSuffix.slice(0, available);
        }

        function rebuild() {
            input.value = userText + getActiveSuffix();
        }

        function cursorToUserEnd() {
            const pos = userText.length;
            input.setSelectionRange(pos, pos);
        }

        function clampCursor() {
            if (input.selectionStart > userText.length || input.selectionEnd > userText.length) {
                cursorToUserEnd();
            }
        }

        // Initialize — respect session state
        if (treekIsSuffixDisabled()) {
            fullSuffix      = '';
            suffixCancelled = true;
            input.dataset.treekSuffixCancelled = '1';
        } else {
            input.dataset.treekSuffixCancelled = '0';
        }
        rebuild();

        // Wire up cancel button
        const cancelBtn = document.querySelector(
            '[data-treek-cancel-for="' + input.id + '"]'
        );
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();

                if (treekIsSuffixDisabled()) {
                    // State 2 → State 0: re-enable suffixes globally
                    treekSetSuffixDisabled(false);
                    suffixCancelled = false;
                    input.dataset.treekSuffixCancelled = '0';
                    fullSuffix = input.dataset.treekSuffix || '';
                    userText   = '';
                } else if (!suffixCancelled) {
                    // State 0 → State 1: cancel current reply suffix only
                    suffixCancelled = true;
                    input.dataset.treekSuffixCancelled = '1';
                    fullSuffix = '';
                } else {
                    // State 1 → State 2: disable suffixes globally for session
                    treekSetSuffixDisabled(true);
                    input.dataset.treekSuffixCancelled = '1';
                    fullSuffix = '';
                }

                rebuild();
                treekUpdateAllButtons();
                input.focus();
                cursorToUserEnd();
            });
        }

        // Reset on modal show — restore suffix from data attribute
        const modal = input.closest('.modal');
        if (modal) {
            modal.addEventListener('shown.bs.modal', function () {
                suffixCancelled = treekIsSuffixDisabled();
                input.dataset.treekSuffixCancelled = suffixCancelled ? '1' : '0';
                fullSuffix = suffixCancelled ? '' : (input.dataset.treekSuffix || '');
                userText   = '';
                rebuild();
                cursorToUserEnd();
                treekUpdateAllButtons();
            });
        }

        input.addEventListener('focus', function () {
            if (!suffixCancelled && !treekIsSuffixDisabled()) {
                const currentSuffix = input.dataset.treekSuffix || '';
                if (fullSuffix !== currentSuffix || !input.value.endsWith(getActiveSuffix())) {
                    fullSuffix = currentSuffix;
                    userText   = input.value.endsWith(fullSuffix)
                        ? input.value.slice(0, input.value.length - fullSuffix.length)
                        : '';
                    rebuild();
                }
            }
            setTimeout(function () { clampCursor(); }, 0);
        });

        input.addEventListener('click', function () {
            clampCursor();
        });

        input.addEventListener('keydown', function (e) {
            if (input.selectionStart > userText.length) {
                input.setSelectionRange(userText.length, userText.length);
            }

            if (e.key === 'Backspace') {
                e.preventDefault();
                if (userText.length > 0) {
                    const pos = Math.min(input.selectionStart, userText.length);
                    userText  = userText.slice(0, pos - 1) + userText.slice(pos);
                    rebuild();
                    input.setSelectionRange(pos - 1, pos - 1);
                }
                return;
            }

            if (e.key === 'Delete') {
                e.preventDefault();
                const pos = Math.min(input.selectionStart, userText.length);
                if (pos < userText.length) {
                    userText = userText.slice(0, pos) + userText.slice(pos + 1);
                    rebuild();
                    input.setSelectionRange(pos, pos);
                }
                return;
            }

            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (userText.length >= maxLen) {
                    e.preventDefault();
                }
            }
        });

        input.addEventListener('keyup', function () {
            clampCursor();
        });

        input.addEventListener('input', function () {
            const val          = input.value;
            const cursorPos    = input.selectionStart;
            const activeSuffix = getActiveSuffix();

            if (activeSuffix && val.endsWith(activeSuffix)) {
                userText = val.slice(0, val.length - activeSuffix.length);
            } else if (fullSuffix && val.endsWith(fullSuffix)) {
                userText = val.slice(0, val.length - fullSuffix.length);
            } else {
                userText = val;
                if (userText.length > maxLen) {
                    userText = userText.slice(0, maxLen);
                }
            }

            const newSuffix = getActiveSuffix();
            input.value     = userText + newSuffix;

            const newPos = Math.min(cursorPos, userText.length);
            input.setSelectionRange(newPos, newPos);
        });

        // Validate non-empty subject on form submit
        const form = input.closest('form');
        if (form) {
            form.addEventListener('submit', function (e) {
                // Only block if Submit button was clicked (not Cancel/Reset)
                const active = document.activeElement;
                const isReset = active && (active.type === 'reset' || active.classList.contains('kreply-cancel'));
                if (isReset) return;

                if (userText.trim() === '' && fullSuffix === '') {
                    e.preventDefault();
                    e.stopPropagation();
                    input.setCustomValidity('Subject is required');
                    input.reportValidity();
                } else {
                    input.setCustomValidity('');
                }
            });
        }
    });
});