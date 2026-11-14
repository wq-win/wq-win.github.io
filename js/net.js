(function () {
    'use strict';
    const engine = window.NetEngine;
    const $ = id => document.getElementById(id);
    const boardElement = $('net-board'), status = $('net-status');
    const feedback = window.GameFeedback ? window.GameFeedback.create({host:$('net-feedback')}) : {play(){}};
    let board, selected = 0, hinted = -1, hasWon = false, direction = 1, history = [];
    const saveKey = "mylog-net-run-v1";
    function save(){try { localStorage.setItem(saveKey,window.NetSession.encode(board)); $("save-status").textContent="本局自动保存 · 刷新可续玩"; } catch (_) { $("save-status").textContent="无法保存，请勿关闭本局"; }}
    const directionNames = ['上', '右', '下', '左'];
    const session=window.WorkshopSession?window.WorkshopSession({confirmText:'重置会恢复本局开局，已用提示不返还；换关或换题会替换当前棋盘。取消可继续本局。',rules:'① 从金色光源向外连接，点击线路旋转。\n② 用顺/逆时针按钮选择方向，也可撤回最近旋转。\n③ 连通每格并消除悬空管口即可过关；提示不因撤回或重置返还。'}):null;
    function protect(action){if(session&&board&&board.moves>0&&!hasWon)session.confirm(action);else action();}
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
        const state = engine.inspect(board.masks, board, board.source);
        boardElement.style.setProperty('--columns', board.width);
        boardElement.style.setProperty('--rows', board.height);
        $('level-number').textContent = board.level;
        $('level-dimensions').textContent = `${board.width} × ${board.height} · ${board.masks.length} 格`;
        $('board-level').value = String(board.level);
        boardElement.setAttribute('aria-label', `第 ${board.level} 关接线棋盘，${board.height} 行 ${board.width} 列`);
        if (boardElement.children.length !== board.masks.length) {
            boardElement.replaceChildren();
            board.masks.forEach((_, index) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'net-tile'; button.dataset.index = index; boardElement.appendChild(button); });
        }
        board.masks.forEach((mask, i) => {
            const cell = boardElement.children[i], powered = state.powered.has(i), isSource = i === board.source, terminal = state.terminals.includes(i);
            cell.className = 'net-tile' + (powered ? ' powered' : '') + (isSource ? ' source' : '') + (terminal ? ' terminal' : '') + (i === hinted ? ' hinted' : '');
            cell.tabIndex = selected === i ? 0 : -1;
            cell.setAttribute('aria-label', `第 ${Math.floor(i / board.width) + 1} 行第 ${i % board.width + 1} 列，${isSource ? '光源' : terminal ? '终点' : '线路'}，管口朝${engine.DIRS.map((d, n) => mask & d.bit ? directionNames[n] : '').filter(Boolean).join('、')}，${powered ? '已通电' : '未通电'}${state.solved ? '，已完成' : '，点击旋转'}`);
            // Keep solved cells focusable, but guard mutations in both model and UI.
            cell.setAttribute('aria-disabled', state.solved ? 'true' : 'false');
            cell.innerHTML = tileSVG(mask, i, powered);
        });
        $('lit-count').textContent = state.litTerminals;
        $('terminal-total').textContent = state.terminals.length;
        $('powered-count').textContent = state.powered.size;
        $('cell-total').textContent = board.masks.length;
        $('move-count').textContent = board.moves;
        $('undo-board').disabled = history.length === 0 || state.solved;
        save();
        $('hint-count').textContent = board.hintsLeft;
        $('hint-board').disabled = board.hintsLeft === 0 || state.solved;
        $('hint-board').setAttribute('aria-label', `提示：校准一格，剩余 ${board.hintsLeft} 次`);
        $('victory').hidden = !state.solved;
        $('next-level').hidden = !state.solved || board.level === engine.LEVELS.length;
        $('victory-title').textContent = board.level === engine.LEVELS.length ? '第二十关完成' : '万灯俱明';
        if (state.solved) {
            $('victory-detail').textContent = `${state.terminals.length} 个终点全部点亮，${board.masks.length} 格线路已连通。共操作 ${board.moves} 次，使用 ${3 - board.hintsLeft} 次提示。`;
            if (!hasWon) { message = board.level === engine.LEVELS.length ? '第二十关完成！已到达最后一关，可以重玩本关或选择其他关卡。' : `万灯俱明！第 ${board.level} 关完成，可以进入下一关。`; hasWon = true; }
        } else hasWon = false;
        if (message) status.textContent = message;
    }
    function startBoard(next) { history = []; board = next; selected = board.source; hinted = -1; hasWon = false; $('board-scroll').scrollLeft = 0; $('board-scroll').scrollTop = 0; render(`第 ${board.level} / ${engine.LEVELS.length} 关，${board.width} × ${board.height}，共 ${board.masks.length} 格。从金色光源开始，连通所有线路。`); }
    function newBoard() { startBoard(engine.generateLevel(Number($('board-level').value), seed())); }
    function rotateAt(index, turn = direction) {
        const before={index,mask:board.masks[index],moves:board.moves};
        const prior = engine.inspect(board.masks,board,board.source);
        if (engine.turn(board, index, turn)) {
            history.push(before); if(history.length>100)history.shift(); hinted=-1;selected=index;
            const state=engine.inspect(board.masks,board,board.source);
            render(`已${turn === 1 ? '顺' : '逆'}时针旋转。已点亮 ${state.litTerminals} / ${state.terminals.length} 个终点，${state.powered.size} / ${board.masks.length} 格通电。`);
            const tile=boardElement.children[index];tile.className += turn===1?' net-rotate-cw':' net-rotate-ccw';
            feedback.play(state.solved?'win':state.litTerminals>prior.litTerminals?'success':'tap',state.solved?$('victory'):tile);
        } else { status.textContent=hasWon?'本关已完成，可以进入下一关或重玩。':'这次操作没有改变线路。';feedback.play('error',boardElement.children[index]); }
    }
    boardElement.addEventListener('click', event => { const cell = event.target.closest('[data-index]'); if (cell && boardElement.contains(cell)) rotateAt(Number(cell.dataset.index)); });
    boardElement.addEventListener('focusin', event => { const cell = event.target.closest('[data-index]'); if (!cell) return; selected = Number(cell.dataset.index); Array.from(boardElement.children).forEach((el, n) => { el.tabIndex = n === selected ? 0 : -1; }); });
    boardElement.addEventListener('keydown', event => {
        const cell = event.target.closest('[data-index]'); if (!cell) return;
        const i = Number(cell.dataset.index), dirs = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3 };
        if (Object.prototype.hasOwnProperty.call(dirs, event.key)) { event.preventDefault(); const next = engine.neighbor(i, engine.DIRS[dirs[event.key]], board); if (next >= 0) { selected = next; boardElement.children[next].focus(); } }
        else if (event.key.toLowerCase() === 'r') { event.preventDefault(); rotateAt(i, -1); }
        // Enter and Space use the native button's click, avoiding double rotations.
    });
    $('reset-board').addEventListener('click', () => protect(()=>{ history=[]; engine.reset(board); hinted = -1; hasWon = false; render(`已恢复本局开局。还剩 ${board.hintsLeft} 次提示。`); }));
    $('hint-board').addEventListener('click', () => { const i = engine.hint(board); if (i < 0) { status.textContent=hasWon?'本关已完成，不需要提示。':'本局提示已用完，可以继续旋转或撤回。';feedback.play('error',$('hint-board'));return; } history=[]; hinted = i; selected = i; render(`已校准第 ${Math.floor(i / board.width) + 1} 行第 ${i % board.width + 1} 列，以金色虚线标记。还剩 ${board.hintsLeft} 次提示。`); boardElement.children[i].focus();feedback.play(hasWon?'win':'success',hasWon?$('victory'):boardElement.children[i]); });
    $('new-board').addEventListener('click',()=>protect(newBoard));
    $('play-again').addEventListener('click', () => { newBoard(); boardElement.children[selected].focus(); });
    $('next-level').addEventListener('click', () => { const next = engine.nextLevel(board, seed()); if (!next) return; startBoard(next); boardElement.children[selected].focus(); });
    engine.LEVELS.forEach(level => { const option = document.createElement('option'); option.value = String(level.level); option.textContent = `第 ${level.level} 关 · ${level.width} × ${level.height} · ${level.width * level.height} 格`; $('board-level').appendChild(option); });
    $('board-level').value = '1';
    $('board-level').addEventListener('change',()=>{const level=Number($('board-level').value);$('board-level').value=String(board.level);protect(()=>startBoard(engine.generateLevel(level,seed())));});
    $('undo-board').addEventListener('click',()=>{if(!history.length||hasWon)return;const prior=history.pop();board.masks[prior.index]=prior.mask;board.moves=prior.moves;selected=prior.index;hinted=-1;render('已撤回一次旋转。提示次数不变。');boardElement.children[selected].focus();feedback.play('undo',boardElement.children[selected]);});
    $('turn-direction').addEventListener('click',()=>{direction=-direction;$('turn-direction').setAttribute('aria-pressed',String(direction===-1));$('turn-direction').textContent=direction===1?'顺时针 ↻':'逆时针 ↺';status.textContent=direction===1?'点击线路顺时针旋转。':'点击线路逆时针旋转，少点两次。';});
    let restored=null;try{restored=window.NetSession.restore(localStorage.getItem(saveKey),engine);}catch(_){}
    if(restored){startBoard(restored);status.textContent='已恢复上次的第 '+board.level+' 关，旋转与提示次数均保留。';}else newBoard();
}());
