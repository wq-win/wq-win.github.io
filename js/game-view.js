(function () {
    'use strict';
    // Fullscreen is presentation only: never reload the level or replace selected cards.
    document.querySelectorAll('[data-game-view]').forEach(function (table) {
        var button = table.querySelector('[data-game-fullscreen]');
        var announcement = table.querySelector('[data-game-view-status]');
        if (!button || !announcement) return;
        var expanded = false;
        var nativeEntered = false;
        var pending = false;
        var restoreFocusPending = false;
        var lastExpanded = null;
        var lastNative = null;

        function update(message) {
            table.classList.toggle('is-expanded', expanded);
            document.body.classList.toggle('game-view-open', expanded);
            button.setAttribute('aria-pressed', expanded ? 'true' : 'false');
            var native = document.fullscreenElement === table;
            button.textContent = expanded ? (native ? '退出全屏 ⛶' : '退出铺满 ⛶') : '全屏游戏 ⛶';
            button.title = expanded ? '退出放大游戏，也可以按 Esc' : '放大游戏；不支持系统全屏时铺满网页';
            button.disabled = pending;
            // A canceled request may settle after Escape; disabled controls
            // cannot receive focus, so restore it only once exit is complete.
            if (restoreFocusPending && !pending && !expanded && !native) {
                restoreFocusPending = false;
                button.focus();
            }
            if (message) announcement.textContent = message;
            if (expanded !== lastExpanded || native !== lastNative) {
                lastExpanded = expanded;
                lastNative = native;
                table.dispatchEvent(new CustomEvent('gameviewchange', { bubbles: true, detail: { expanded: expanded, native: native } }));
            }
        }

        function collapse() {
            expanded = false;
            restoreFocusPending = true;
            update('已恢复普通视图。');
        }

        function finishRequest() {
            pending = false;
            update(expanded ? (document.fullscreenElement === table ? '已进入全屏游戏。' : '游戏已铺满网页；可点退出或按 Esc 返回。') : '已恢复普通视图。');
        }

        function leaveNative() {
            pending = true;
            update();
            try {
                var result = document.exitFullscreen();
                if (result && typeof result.then === 'function') result.then(function () {
                    pending = false;
                    if (document.fullscreenElement !== table) collapse();
                    else update();
                }, function () {
                    pending = false;
                    update('暂时未能退出全屏，请按 Esc 或使用浏览器的退出全屏按钮。');
                });
                else { pending = false; update(); }
            } catch (error) {
                pending = false;
                update('暂时未能退出全屏，请按 Esc 或使用浏览器的退出全屏按钮。');
            }
        }

        button.addEventListener('click', function () {
            if (pending) return;
            if (expanded) {
                if (document.fullscreenElement === table) leaveNative();
                else collapse();
                return;
            }
            expanded = true;
            update('游戏已铺满网页。');
            if (typeof table.requestFullscreen !== 'function' || document.fullscreenEnabled === false) return;
            pending = true;
            update();
            try {
                var result = table.requestFullscreen();
                if (result && typeof result.then === 'function') result.then(finishRequest, finishRequest);
                else finishRequest();
            } catch (error) { finishRequest(); }
        });
        document.addEventListener('fullscreenchange', function () {
            if (document.fullscreenElement === table) {
                nativeEntered = true;
                // Escape can cancel the in-page view while a native request is pending.
                if (!expanded) { leaveNative(); return; }
                update();
            } else if (nativeEntered) {
                nativeEntered = false;
                collapse();
            }
        });
        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape' || !expanded || document.fullscreenElement === table || table.querySelector('dialog[open]')) return;
            event.preventDefault();
            collapse();
        });
        update();
    });
}());
