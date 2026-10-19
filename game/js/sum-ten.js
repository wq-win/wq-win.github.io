(function () {
    'use strict';
    var E = window.SumTen, d = document, app = d.querySelector('.ten-app'), board = d.getElementById('ten-board'), shell = d.getElementById('board-shell');
    var scoreEl = d.getElementById('score'), timeEl = d.getElementById('time'), sumEl = d.getElementById('sum'), sumMetric = d.getElementById('sum-metric'), boxEl = d.getElementById('selection-box');
    var feedback = d.getElementById('feedback'), result = d.getElementById('result'), startButton = d.getElementById('start'), fx = d.getElementById('fx-layer');
    var orientation = window.matchMedia('(orientation: landscape)'), reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var state = E.create(), landscape = orientation.matches, cells = [], cursor = 0, selection = null, drag = null, keyAnchor = null, frame = 0, epoch = 0, timers = new Set(), lastPhase = '', lastSecond = -1;
    function now() { return performance.now(); }
    function pointFor(id) { return { row: Math.floor(id / E.COLS), col: id % E.COLS }; }
    function idFor(p) { return p.row * E.COLS + p.col; }
    function say(message) { feedback.textContent = message; }
    function delay(fn, milliseconds) { var version = epoch, id = setTimeout(function () { timers.delete(id); if (version === epoch) fn(); }, milliseconds); timers.add(id); }
    function clearEffects() { epoch++; timers.forEach(clearTimeout); timers.clear(); fx.replaceChildren(); }
    function releaseCapture(pointerId) { try { if (board.hasPointerCapture(pointerId)) board.releasePointerCapture(pointerId); } catch (ignore) {} }
    function cancelSelection() {
        if (drag) { var id = drag.id; drag = null; releaseCapture(id); }
        keyAnchor = null; selection = null; paintSelection();
    }
    function createCells() {
        for (var id = 0; id < E.ROWS * E.COLS; id++) {
            var cell = d.createElement('button'); cell.type = 'button'; cell.className = 'cell'; cell.dataset.cell = String(id); cell.dataset.logicalRow = String(Math.floor(id / E.COLS)); cell.dataset.logicalCol = String(id % E.COLS); cell.dataset.tone = String(id % 3); cell.style.setProperty('--tilt', ((id * 7 % 9) - 4) + 'deg'); cell.setAttribute('role', 'gridcell');
            var fruit = d.createElement('span'); fruit.className = 'fruit'; fruit.setAttribute('aria-hidden', 'true'); var number = d.createElement('b'); fruit.append(number); cell.append(fruit); cells.push(cell);
        }
    }
    function orderCells() {
        var focused = board.contains(d.activeElement), rows = landscape ? E.COLS : E.ROWS, cols = landscape ? E.ROWS : E.COLS, fragment = d.createDocumentFragment();
        app.dataset.orientation = landscape ? 'landscape' : 'portrait'; app.style.setProperty('--cols', cols); app.style.setProperty('--rows', rows); board.setAttribute('aria-rowcount', rows); board.setAttribute('aria-colcount', cols);
        for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) { var p = E.logical({ row: r, col: c }, landscape), cell = cells[idFor(p)]; cell.dataset.visualRow = String(r); cell.dataset.visualCol = String(c); cell.setAttribute('aria-rowindex', r + 1); cell.setAttribute('aria-colindex', c + 1); fragment.append(cell); }
        board.append(fragment); paintCells(); if (focused) cells[cursor].focus({ preventScroll: true });
    }
    function paintCells() {
        cells.forEach(function (cell, id) { var value = state.board[id]; cell.dataset.value = String(value); cell.classList.toggle('empty', value === 0); cell.querySelector('b').textContent = value || ''; cell.tabIndex = id === cursor ? 0 : -1; cell.classList.toggle('cursor', id === cursor); cell.setAttribute('aria-label', '第 ' + (Number(cell.dataset.visualRow) + 1) + ' 行，第 ' + (Number(cell.dataset.visualCol) + 1) + ' 列，' + (value ? '数字 ' + value : '空格')); cell.setAttribute('aria-disabled', state.status === 'playing' ? 'false' : 'true'); });
    }
    function paintSelection() {
        cells.forEach(function (cell, id) { var chosen = !!selection && selection.cells.includes(id); cell.classList.toggle('selected', chosen); cell.setAttribute('aria-selected', chosen ? 'true' : 'false'); });
        sumEl.textContent = selection ? String(selection.sum) : '—'; sumMetric.classList.toggle('valid', !!selection && selection.valid); boxEl.hidden = !selection; board.dataset.selectionSum = selection ? selection.sum : '';
        if (!selection) return;
        var a = E.visual({ row: selection.top, col: selection.left }, landscape), b = E.visual({ row: selection.bottom, col: selection.right }, landscape), origin = shell.getBoundingClientRect();
        var first = cells[idFor(E.logical(a, landscape))].getBoundingClientRect(), last = cells[idFor(E.logical(b, landscape))].getBoundingClientRect();
        boxEl.style.left = (first.left - origin.left) + 'px'; boxEl.style.top = (first.top - origin.top) + 'px'; boxEl.style.width = (last.right - first.left) + 'px'; boxEl.style.height = (last.bottom - first.top) + 'px'; boxEl.dataset.sum = selection.sum + (selection.valid ? ' ✓' : ''); boxEl.classList.toggle('valid', selection.valid);
    }
    function paintStatus() {
        var seconds = Math.ceil(E.remaining(state, now()) / 1000);
        scoreEl.textContent = String(state.score); app.dataset.phase = state.status; app.dataset.score = state.score; app.dataset.reason = state.reason || ''; app.dataset.deadline = state.deadline === null ? '' : state.deadline;
        if (seconds !== lastSecond) { timeEl.textContent = String(seconds); lastSecond = seconds; }
        d.getElementById('time-fill').style.transform = 'scaleX(' + Math.min(1, E.remaining(state, now()) / E.DURATION) + ')'; d.querySelector('.clock-metric').classList.toggle('urgent', state.status === 'playing' && seconds <= 10);
        d.getElementById('ready-note').hidden = state.status !== 'ready'; startButton.textContent = state.status === 'ready' ? '开始 · 90 秒' : '重新开始';
        if (state.status !== lastPhase) {
            lastPhase = state.status; paintCells(); result.hidden = state.status !== 'finished';
            if (state.status === 'finished') {
                cancelSelection(); if (frame) cancelAnimationFrame(frame); frame = 0;
                var title = state.reason === 'time' ? '时间到，收好这一篮' : state.reason === 'cleared' ? '整座果园，收空了！' : '这一盘，已经没有十了';
                d.getElementById('result-title').textContent = title; d.getElementById('result-kicker').textContent = state.reason === 'cleared' ? '48 颗，满满一篮' : '这一篮，收好了'; d.getElementById('result-copy').textContent = '收获 ' + state.score + ' 颗果实，得到 ' + state.score + ' 分。'; say(title + '。本局 ' + state.score + ' 分。');
                if (!d.getElementById('rules-dialog').open) d.getElementById('result-restart').focus({ preventScroll: true });
            }
        }
    }
    function tick() {
        if (frame) cancelAnimationFrame(frame); frame = 0; state = E.settle(state, now()); paintStatus();
        if (state.status === 'playing') frame = requestAnimationFrame(tick);
    }
    function live() { state = E.settle(state, now()); paintStatus(); return state.status === 'playing'; }
    function start() {
        if (frame) cancelAnimationFrame(frame); frame = 0; cancelSelection(); clearEffects();
        if (state.status !== 'ready') state = E.create();
        state = E.start(state, now()); cursor = 0; lastPhase = ''; lastSecond = -1; paintCells(); paintSelection(); say('拖出矩形，合计 10 就收下。'); tick(); cells[cursor].focus({ preventScroll: true });
    }
    function harvest(ids, values) {
        if (reduced.matches) return;
        var bounds = shell.getBoundingClientRect();
        ids.forEach(function (id) { var rect = cells[id].getBoundingClientRect(), particle = d.createElement('span'); particle.className = 'harvest'; particle.style.cssText = 'left:' + (rect.left - bounds.left) + 'px;top:' + (rect.top - bounds.top) + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;--tilt:0deg'; var fruit = d.createElement('span'); fruit.className = 'fruit'; fruit.textContent = values[id]; particle.append(fruit); fx.append(particle); delay(function () { particle.remove(); }, 390); });
        var gain = d.createElement('span'); gain.className = 'gain'; gain.textContent = '+' + ids.length; fx.append(gain); delay(function () { gain.remove(); }, 610);
    }
    function commit(from, to) {
        var before = state.board, outcome = E.select(state, from, to, now()); state = outcome.state;
        if (outcome.accepted) { harvest(outcome.removed, before); say('刚好 10！收获 ' + outcome.removed.length + ' 颗，+' + outcome.removed.length + ' 分。'); paintCells(); }
        else if (state.status === 'playing') say('合计 ' + (outcome.rectangle ? outcome.rectangle.sum : 0) + '，再圈一个刚好 10 的框。');
        paintStatus();
    }
    function hit(event) {
        var rect = board.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX >= rect.right || event.clientY < rect.top || event.clientY >= rect.bottom || !rect.width || !rect.height) return null;
        var rows = landscape ? E.COLS : E.ROWS, cols = landscape ? E.ROWS : E.COLS;
        return E.logical({ row: Math.min(rows - 1, Math.floor((event.clientY - rect.top) / rect.height * rows)), col: Math.min(cols - 1, Math.floor((event.clientX - rect.left) / rect.width * cols)) }, landscape);
    }
    board.addEventListener('pointerdown', function (event) {
        if (drag || event.isPrimary === false || (event.pointerType === 'mouse' && event.button !== 0) || !live()) return;
        var p = hit(event); if (!p) return; event.preventDefault(); cancelSelection(); cursor = idFor(p); drag = { id: event.pointerId, from: p }; keyAnchor = null;
        try { board.setPointerCapture(event.pointerId); } catch (ignore) {}
        cells[cursor].focus({ preventScroll: true }); paintCells(); selection = E.rectangle(state.board, p, p); paintSelection();
    });
    board.addEventListener('pointermove', function (event) {
        if (!drag || drag.id !== event.pointerId) return; event.preventDefault(); if (!live()) return; var p = hit(event); selection = p ? E.rectangle(state.board, drag.from, p) : null; paintSelection();
    });
    board.addEventListener('pointerup', function (event) {
        if (!drag || drag.id !== event.pointerId) return; event.preventDefault(); var from = drag.from, to = hit(event); cancelSelection(); if (to) commit(from, to); else { live(); if (state.status === 'playing') say('已取消。把框留在果园里，再松手。'); }
    });
    board.addEventListener('pointercancel', function (event) { if (drag && drag.id === event.pointerId) { cancelSelection(); if (live()) say('已取消选框，重新拖动即可。'); } });
    board.addEventListener('lostpointercapture', function (event) { if (drag && drag.id === event.pointerId) cancelSelection(); });
    board.addEventListener('contextmenu', function (event) { event.preventDefault(); });
    board.addEventListener('focusin', function (event) { var cell = event.target.closest('[data-cell]'); if (cell) { cursor = Number(cell.dataset.cell); paintCells(); } });
    board.addEventListener('keydown', function (event) {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter', 'Escape'].includes(event.key)) return;
        event.preventDefault(); if (event.key === 'Escape') { cancelSelection(); say('已取消选框。'); return; } if (!live() || event.repeat && (event.key === ' ' || event.key === 'Enter')) return;
        if (drag) cancelSelection();
        if (event.key === ' ' || event.key === 'Enter') {
            if (keyAnchor) { var from = keyAnchor, to = pointFor(cursor); cancelSelection(); commit(from, to); }
            else { keyAnchor = pointFor(cursor); selection = E.rectangle(state.board, keyAnchor, keyAnchor); paintSelection(); say('起点已选。用方向键扩框，再按空格或回车收下。'); }
            return;
        }
        var v = E.visual(pointFor(cursor), landscape), rows = landscape ? E.COLS : E.ROWS, cols = landscape ? E.ROWS : E.COLS;
        v.row = Math.max(0, Math.min(rows - 1, v.row + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0))); v.col = Math.max(0, Math.min(cols - 1, v.col + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0)));
        cursor = idFor(E.logical(v, landscape)); paintCells(); cells[cursor].focus({ preventScroll: true }); if (keyAnchor) { selection = E.rectangle(state.board, keyAnchor, pointFor(cursor)); paintSelection(); }
    });
    startButton.addEventListener('click', start); d.getElementById('result-restart').addEventListener('click', start);
    function resize() { var next = orientation.matches; cancelSelection(); if (next !== landscape) { landscape = next; orderCells(); } tick(); }
    orientation.addEventListener('change', resize); window.addEventListener('resize', resize); app.addEventListener('gameviewchange', resize);
    window.addEventListener('blur', cancelSelection); d.addEventListener('visibilitychange', function () { cancelSelection(); tick(); });
    var rules = d.getElementById('rules-dialog'); d.getElementById('rules-open').addEventListener('click', function () { cancelSelection(); rules.showModal(); tick(); });
    function closeRules() { rules.close(); tick(); (state.status === 'finished' ? d.getElementById('result-restart') : d.getElementById('rules-open')).focus({ preventScroll: true }); }
    d.getElementById('rules-close').addEventListener('click', closeRules); d.getElementById('rules-done').addEventListener('click', closeRules); rules.addEventListener('cancel', function (event) { event.preventDefault(); closeRules(); });
    // Read-only helpers for reproducible QA. No player state setters or cheat controls.
    window.SumTenDebug = Object.freeze({ snapshot: function () { return JSON.parse(JSON.stringify(state)); }, legalRectangles: function () { return E.legalRectangles(state.board); }, layout: function () { return { landscape: landscape, rows: landscape ? E.COLS : E.ROWS, cols: landscape ? E.ROWS : E.COLS }; }, visual: function (p) { return E.visual(p, landscape); }, logical: function (p) { return E.logical(p, landscape); } });
    createCells(); orderCells(); paintSelection(); paintStatus();
}());
