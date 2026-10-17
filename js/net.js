(function () {
    'use strict';
    const engine = window.NetEngine;
    const $ = id => document.getElementById(id);
    const boardElement = $('net-board'), status = $('net-status');
    let board, selected = 0, hinted = -1, hasWon = false;
    const directionNames = ['上', '右', '下', '左'];
    function seed() { if (window.crypto && window.crypto.getRandomValues) return window.crypto.getRandomValues(new Uint32Array(1))[0]; return Date.now() ^ Math.floor(Math.random() * 0xffffffff); }
    function tileSVG(mask, index, powered) {
        const endpoints = [[50, 0], [100, 50], [50, 100], [0, 50]];
        const points = endpoints.filter((p, d) => mask & engine.DIRS[d].bit);
        // Two-ended bends use a rounded continuous elbow; junctions branch from the center.
        let path = points.length === 2 ? `M${points[0][0]} ${points[0][1]} L50 50 L${points[1][0]} ${points[1][1]}` : points.map(p => `M50 50 L${p[0]} ${p[1]}`).join(' ');
        const isSource = index === board.source, terminal = engine.degree(mask) === 1 && !isSource;
        let orb = '';
        if (isSource || terminal) orb = `<circle class="orb-shadow" cx="50" cy="50" r="30"/><circle class="orb-rim" cx="50" cy="50" r="26"/><circle class="orb-core" cx="50" cy="50" r="19"/>${isSource ? '<path class="source-spark" d="M50 13 54 20 50 27 46 20Z M50 73 54 80 50 87 46 80Z M13 50 20 46 27 50 20 54Z M73 50 80 46 87 50 80 54Z"/><circle cx="50" cy="50" r="9" fill="#fff8d0"/>' : powered ? '<circle class="terminal-spark" cx="50" cy="50" r="7"/>' : '<circle cx="50" cy="50" r="10" fill="none" stroke="#9ab4ab" stroke-width="1.5" opacity=".5"/>'}`;
        const collars = points.map(([x, y]) => `<path d="${y === 0 ? 'M39 4h22' : y === 100 ? 'M39 96h22' : x === 0 ? 'M4 39v22' : 'M96 39v22'}" stroke="${powered ? '#d6c083' : '#a7b8aa'}" stroke-width="4" stroke-linecap="round"/>`).join('');
        return `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path class="pipe-shadow" d="${path}"/><path class="pipe-metal" d="${path}"/><path class="pipe-inner" d="${path}"/><path class="pipe-light" d="${path}"/>${collars}${orb || '<circle class="joint" cx="50" cy="50" r="3.5"/>'}</svg>`;
    }
    function render(message) {
        const state = engine.inspect(board.masks, board.size, board.source);
        boardElement.style.setProperty('--size', board.size);
        if (boardElement.children.length !== board.masks.length) {
            boardElement.replaceChildren();
            board.masks.forEach((_, index) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'net-tile'; button.dataset.index = index; boardElement.appendChild(button); });
        }
        board.masks.forEach((mask, i) => {
            const cell = boardElement.children[i], powered = state.powered.has(i), isSource = i === board.source, terminal = state.terminals.includes(i);
            cell.className = 'net-tile' + (powered ? ' powered' : '') + (isSource ? ' source' : '') + (terminal ? ' terminal' : '') + (i === hinted ? ' hinted' : '');
            cell.tabIndex = selected === i ? 0 : -1;
            cell.setAttribute('aria-label', `第 ${Math.floor(i / board.size) + 1} 行第 ${i % board.size + 1} 列，${isSource ? '光源' : terminal ? '终点' : '线路'}，管口朝${engine.DIRS.map((d, n) => mask & d.bit ? directionNames[n] : '').filter(Boolean).join('、')}，${powered ? '已通电' : '未通电'}${state.solved ? '，已完成' : '，点击旋转'}`);
            // Keep solved cells focusable, but guard mutations in both model and UI.
            cell.setAttribute('aria-disabled', state.solved ? 'true' : 'false');
            cell.innerHTML = tileSVG(mask, i, powered);
        });
        $('lit-count').textContent = state.litTerminals;
        $('terminal-total').textContent = state.terminals.length;
        $('powered-count').textContent = state.powered.size;
        $('cell-total').textContent = board.masks.length;
        $('move-count').textContent = board.moves;
        $('hint-count').textContent = board.hintsLeft;
        $('hint-board').disabled = board.hintsLeft === 0 || state.solved;
        $('hint-board').setAttribute('aria-label', `提示：校准一格，剩余 ${board.hintsLeft} 次`);
        $('victory').hidden = !state.solved;
        if (state.solved) {
            $('victory-detail').textContent = `${state.terminals.length} 个终点全部点亮，${board.masks.length} 格线路已连通。共操作 ${board.moves} 次，使用 ${3 - board.hintsLeft} 次提示。`;
            if (!hasWon) { message = '万灯俱明！所有线路已连通。可以选择再解一阵，或重置重玩。'; hasWon = true; }
        } else hasWon = false;
        if (message) status.textContent = message;
    }
    function newBoard() { board = engine.generate(Number($('board-size').value), seed()); selected = board.source; hinted = -1; hasWon = false; render('新谜题已就位。从金色光源开始，连通每一格与所有终点。'); }
    function rotateAt(index, direction = 1) { if (engine.turn(board, index, direction)) { hinted = -1; selected = index; const state = engine.inspect(board.masks, board.size, board.source); render(`已${direction === 1 ? '顺' : '逆'}时针旋转。已点亮 ${state.litTerminals} / ${state.terminals.length} 个终点，${state.powered.size} / ${board.masks.length} 格通电。`); } }
    boardElement.addEventListener('click', event => { const cell = event.target.closest('[data-index]'); if (cell && boardElement.contains(cell)) rotateAt(Number(cell.dataset.index)); });
    boardElement.addEventListener('focusin', event => { const cell = event.target.closest('[data-index]'); if (!cell) return; selected = Number(cell.dataset.index); Array.from(boardElement.children).forEach((el, n) => { el.tabIndex = n === selected ? 0 : -1; }); });
    boardElement.addEventListener('keydown', event => {
        const cell = event.target.closest('[data-index]'); if (!cell) return;
        const i = Number(cell.dataset.index), dirs = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
        if (Object.prototype.hasOwnProperty.call(dirs, event.key)) { event.preventDefault(); const next = engine.neighbor(i, engine.DIRS[dirs[event.key]], board.size); if (next >= 0) { selected = next; boardElement.children[next].focus(); } }
        else if (event.key.toLowerCase() === 'r') { event.preventDefault(); rotateAt(i, -1); }
        // Enter and Space use the native button's click, avoiding double rotations.
    });
    $('reset-board').addEventListener('click', () => { engine.reset(board); hinted = -1; hasWon = false; render(`已恢复本局开局。还剩 ${board.hintsLeft} 次提示。`); });
    $('hint-board').addEventListener('click', () => { const i = engine.hint(board); if (i < 0) return; hinted = i; selected = i; render(`已校准第 ${Math.floor(i / board.size) + 1} 行第 ${i % board.size + 1} 列，以金色虚线标记。还剩 ${board.hintsLeft} 次提示。`); boardElement.children[i].focus(); });
    $('new-board').addEventListener('click', newBoard);
    $('play-again').addEventListener('click', () => { newBoard(); boardElement.children[selected].focus(); });
    $('board-size').addEventListener('change', newBoard);
    newBoard();
}());
