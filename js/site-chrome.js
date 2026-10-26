(function (global) {
    const SERIES = (global.SITE && global.SITE.series) || [
        { id: 'rl', href: 'rl/index.html', label: '强化学习 60 篇' },
        { id: 'llm', href: 'llm/index.html', label: '大语言模型 100 篇' },
        { id: 'robot-learn', href: 'robot-learn/index.html', label: '机器人学习 100 篇' },
        { id: 'robot-classic', href: 'robot-classic/index.html', label: '机器人经典基础 100 篇' },
        { id: 'english', href: 'english/index.html', label: '英语学习 · 小学到大学' }
    ];

    const FALLBACK_DEMOS = [
        { group: '游戏', href: 'game/sudoku.html', title: 'Sudoku' },
        { group: '游戏', href: 'game/spider.html', title: '蜘蛛纸牌' },
        { group: '游戏', href: 'game/doudizhu.html', title: '斗地主残局' },
        { group: '游戏', href: 'game/paodekuai.html', title: '跑得快' },
        { group: '游戏', href: 'game/jianghu-slay/', title: '江湖 Slay' },
        { group: '强化学习', cat: 'rl', file: 'q-learning', href: 'game/rl/q-learning.html', title: 'Q-learning 迷宫' },
        { group: '强化学习', cat: 'rl', file: 'value-iteration', href: 'game/rl/value-iteration.html', title: '价值迭代' },
        { group: '强化学习', cat: 'rl', file: 'policy-gradient', href: 'game/rl/policy-gradient.html', title: 'REINFORCE 倒立摆' },
        { group: '强化学习', cat: 'rl', file: 'cliff', href: 'game/rl/cliff.html', title: '悬崖：SARSA vs Q' },
        { group: '大语言模型', cat: 'llm', file: 'attention', href: 'game/llm/attention.html', title: '注意力可视化' },
        { group: '大语言模型', cat: 'llm', file: 'positional', href: 'game/llm/positional.html', title: '正弦位置编码' },
        { group: '大语言模型', cat: 'llm', file: 'softmax', href: 'game/llm/softmax.html', title: 'Softmax 与温度' },
        { group: '大语言模型', cat: 'llm', file: 'bpe', href: 'game/llm/bpe.html', title: 'BPE 分词' },
        { group: '机器人经典', cat: 'robot-classic', file: 'astar', href: 'game/robot-classic/astar.html', title: 'A* 与 Dijkstra' },
        { group: '机器人经典', cat: 'robot-classic', file: 'rrt', href: 'game/robot-classic/rrt.html', title: 'RRT 绕障' },
        { group: '机器人经典', cat: 'robot-classic', file: 'kalman', href: 'game/robot-classic/kalman.html', title: 'Kalman 跟踪' },
        { group: '机器人经典', cat: 'robot-classic', file: 'potential', href: 'game/robot-classic/potential.html', title: '人工势场' },
        { group: '机器人经典', cat: 'robot-classic', file: 'pid', href: 'game/robot-classic/pid.html', title: 'PID 跟踪' },
        { group: '机器人经典', cat: 'robot-classic', file: 'icp', href: 'game/robot-classic/icp.html', title: 'ICP 点云配准' },
        { group: '机器人学习', cat: 'robot-learn', file: 'dmp', href: 'game/robot-learn/dmp.html', title: 'DMP 运动基元' },
        { group: '机器人学习', cat: 'robot-learn', file: 'dagger', href: 'game/robot-learn/dagger.html', title: '行为克隆 vs DAgger' },
        { group: '机器人学习', cat: 'robot-learn', file: 'domain-rand', href: 'game/robot-learn/domain-rand.html', title: '域随机化' }
    ];

    function demoItems() {
        if (global.SITE && global.SITE.demos && global.SITE.demos.length) return global.SITE.demos;
        return FALLBACK_DEMOS;
    }

    function gameGroups() {
        const groups = [{ heading: '入口', items: [{ href: 'game/index.html', label: '全部演示' }] }];
        demoItems().forEach((item) => {
            let group = groups.find((entry) => entry.heading === item.group);
            if (!group) {
                group = { heading: item.group, items: [] };
                groups.push(group);
            }
            group.items.push({ href: item.href, label: item.title });
        });
        return groups;
    }

    function scriptBase() {
        const scripts = document.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i -= 1) {
            const src = scripts[i].src || '';
            if (src.indexOf('site-chrome.js') !== -1) {
                return src.replace(/site-chrome\.js.*$/, '');
            }
        }
        return '';
    }

    const LOOK = {
        cursor: ['system', 'dot', 'comet', 'spark'],
        bg: ['static', 'orbs', 'aurora', 'stars']
    };

    function readPref(key, fallback) {
        try {
            return localStorage.getItem(key) || fallback;
        } catch (error) {
            return fallback;
        }
    }

    function writePref(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            /* ignore */
        }
    }

    function applyStoredTheme() {
        try {
            if (localStorage.getItem('mylog-theme') === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } catch (error) {
            /* ignore */
        }
    }

    function applyStoredLook() {
        const cursor = LOOK.cursor.indexOf(readPref('mylog-cursor', 'system')) >= 0
            ? readPref('mylog-cursor', 'system')
            : 'system';
        const savedBg = readPref('mylog-bg', 'orbs');
        const bg = global.SiteBackground ? global.SiteBackground.getState().mode
            : savedBg === 'drift' ? 'orbs'
            : LOOK.bg.includes(savedBg) ? savedBg : 'orbs';
        const fancy = (cursor === 'comet' || cursor === 'spark') && fxEnabled();
        if (cursor === 'system') document.documentElement.removeAttribute('data-cursor');
        else if ((cursor === 'comet' || cursor === 'spark') && !fancy) document.documentElement.dataset.cursor = 'dot';
        else document.documentElement.dataset.cursor = cursor;
        document.documentElement.dataset.bg = bg;
        if (global.SiteBackground) global.SiteBackground.sync();
        if (document.body) setCursorFX(fancy ? cursor : '');
        return { cursor: cursor, bg: bg };
    }

    let backgroundLoading;
    function ensureBgLayer() {
        if (global.SiteBackground) {
            global.SiteBackground.init();
            return;
        }
        if (!backgroundLoading) {
            backgroundLoading = loadScript(scriptBase() + 'site-background.js').then(() => {
                if (global.SiteBackground) global.SiteBackground.init();
                else {
                    const status = document.getElementById('look-bg-status');
                    if (status) status.textContent = '背景设置暂不可用，请刷新重试';
                }
            });
        }
    }

    const cursorFX = {
        mode: '',
        canvas: null,
        ctx: null,
        raf: 0,
        x: -80,
        y: -80,
        trail: [],
        sparks: [],
        hover: 0,
        down: 0,
        visible: false,
        text: false,
        bound: false,
        boom: 0
    };

    function fxEnabled() {
        return window.matchMedia('(pointer: fine)').matches
            && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function fxPalette() {
        const dark = document.documentElement.classList.contains('dark');
        return dark
            ? { core: '#e0f2fe', glow: '#38bdf8', tail: '#a78bfa', spark: '#fbbf24' }
            : { core: '#1d4ed8', glow: '#3b82f6', tail: '#6366f1', spark: '#f59e0b' };
    }

    function isTextCursorTarget(node) {
        if (!node) return false;
        const el = node.nodeType === 1 ? node : node.parentElement;
        if (!el || !el.closest) return false;
        if (el.closest('input, textarea, select, [contenteditable="true"]')) return true;
        const tag = (el.tagName || '').toLowerCase();
        return tag === 'input' || tag === 'textarea';
    }

    function isHoverCursorTarget(node) {
        if (!node) return false;
        const el = node.nodeType === 1 ? node : node.parentElement;
        if (!el || !el.closest) return false;
        return !!el.closest('a, button, [role="button"], label, summary, select');
    }

    function spawnSparks(n, speed) {
        const palSpread = speed == null ? 2.4 : speed;
        for (let i = 0; i < n; i += 1) {
            const a = Math.random() * Math.PI * 2;
            const s = (0.6 + Math.random()) * palSpread;
            cursorFX.sparks.push({
                kind: 'dot',
                x: cursorFX.x,
                y: cursorFX.y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                life: 1,
                decay: 0.91,
                r: 1.1 + Math.random() * 1.8,
                warm: Math.random() > 0.55
            });
        }
    }

    const SPARKLER_BURST = ['#fde68a', '#fb7185', '#7dd3fc', '#fb923c', '#e879f9', '#fef3c7'];

    function spawnEmber() {
        const a = Math.random() * Math.PI * 2;
        const speed = 1.1 + Math.random() * 3.6;
        const roll = Math.random();
        cursorFX.sparks.push({
            kind: 'ember',
            x: cursorFX.x + (Math.random() - 0.5) * 3,
            y: cursorFX.y + (Math.random() - 0.5) * 3,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed * 0.72 - 1.1 - Math.random() * 1.4,
            life: 0.75 + Math.random() * 0.45,
            decay: 0.955 + Math.random() * 0.02,
            r: 0.7 + Math.random() * 1.3,
            tone: roll < 0.22 ? '#fff' : (roll < 0.62 ? '#fde68a' : '#fb923c')
        });
    }

    function spawnFirework(x, y, n) {
        const color = SPARKLER_BURST[Math.floor(Math.random() * SPARKLER_BURST.length)];
        for (let i = 0; i < n; i += 1) {
            const a = (Math.PI * 2 * i) / n + (Math.random() - 0.5) * 0.35;
            const s = 1.2 + Math.random() * 2.6;
            cursorFX.sparks.push({
                kind: 'burst',
                x: x,
                y: y,
                vx: Math.cos(a) * s,
                vy: Math.sin(a) * s,
                life: 1,
                decay: 0.93 + Math.random() * 0.03,
                r: 1.1 + Math.random() * 1.3,
                tone: Math.random() > 0.82 ? '#fff' : color
            });
        }
    }

    function tickSparkler(fx) {
        if (!fx.visible || fx.text) return;
        const spray = 3 + (fx.down > 0.2 ? 2 : 0);
        for (let i = 0; i < spray; i += 1) spawnEmber();
        fx.boom += 1;
        if (fx.boom < 18) return;
        fx.boom = 0;
        const a = Math.random() * Math.PI * 2;
        const d = 16 + Math.random() * 42;
        spawnFirework(fx.x + Math.cos(a) * d, fx.y + Math.sin(a) * d - 10, 14 + Math.floor(Math.random() * 6));
    }

    function drawCursorFX() {
        const fx = cursorFX;
        if (!fx.mode || !fx.ctx) return;
        const ctx = fx.ctx;
        const pal = fxPalette();
        const w = fx.canvas.clientWidth;
        const h = fx.canvas.clientHeight;
        ctx.clearRect(0, 0, w, h);
        fx.hover += (((fx.visible && !fx.text && isHoverCursorTarget(fx.target)) ? 1 : 0) - fx.hover) * 0.22;
        fx.down *= 0.86;

        if (fx.mode === 'spark') tickSparkler(fx);

        if (fx.mode === 'comet' && fx.visible && !fx.text) {
            const last = fx.trail[fx.trail.length - 1];
            if (!last || last.x !== fx.x || last.y !== fx.y) {
                fx.trail.push({ x: fx.x, y: fx.y });
                if (fx.trail.length > 18) fx.trail.shift();
            } else if (fx.trail.length > 2) {
                fx.trail.shift();
            }
        } else if (fx.trail.length) {
            fx.trail.shift();
        }

        if (fx.trail.length > 1) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            for (let i = 1; i < fx.trail.length; i += 1) {
                const t = i / (fx.trail.length - 1);
                ctx.beginPath();
                ctx.moveTo(fx.trail[i - 1].x, fx.trail[i - 1].y);
                ctx.lineTo(fx.trail[i].x, fx.trail[i].y);
                ctx.strokeStyle = pal.tail;
                ctx.globalAlpha = 0.12 + t * 0.42;
                ctx.lineWidth = 1.4 + t * 8;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        ctx.lineCap = 'round';
        fx.sparks = fx.sparks.filter((p) => p.life > 0.04);
        if (fx.sparks.length > 260) fx.sparks.splice(0, fx.sparks.length - 260);
        fx.sparks.forEach((p) => {
            const px = p.x;
            const py = p.y;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.kind === 'burst' ? 0.018 : 0.055;
            p.vx *= 0.985;
            p.life *= p.decay || 0.91;
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
            if (p.kind === 'ember' || p.kind === 'burst') {
                ctx.strokeStyle = p.tone;
                ctx.lineWidth = Math.max(0.6, p.r * p.life);
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                return;
            }
            ctx.beginPath();
            ctx.fillStyle = p.warm ? pal.spark : pal.glow;
            ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        if (fx.visible && !fx.text) {
            const flicker = fx.mode === 'spark' ? 0.65 + Math.sin(performance.now() / 38) * 0.35 : 0;
            const r = 4 + fx.hover * 2.6 + fx.down * 3.5 + flicker;
            const glow = fx.mode === 'spark' ? '#fbbf24' : pal.glow;
            const core = fx.mode === 'spark' ? '#fff7ed' : pal.core;
            ctx.beginPath();
            ctx.globalAlpha = fx.mode === 'spark' ? 0.28 : 0.22 + fx.hover * 0.12;
            ctx.fillStyle = glow;
            ctx.arc(fx.x, fx.y, r * (fx.mode === 'spark' ? 4.2 : 3.4), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            if (fx.hover > 0.08 && fx.mode !== 'spark') {
                ctx.beginPath();
                ctx.strokeStyle = pal.glow;
                ctx.lineWidth = 1.6;
                ctx.globalAlpha = fx.hover;
                ctx.arc(fx.x, fx.y, 11 + fx.hover * 4, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            ctx.beginPath();
            ctx.fillStyle = core;
            ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.9;
            ctx.arc(fx.x - 1.1, fx.y - 1.2, Math.max(1.1, r * 0.32), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        fx.raf = requestAnimationFrame(drawCursorFX);
    }

    function resizeCursorFX() {
        const canvas = cursorFX.canvas;
        if (!canvas || !cursorFX.ctx) return;
        const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        cursorFX.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onCursorPointer(event) {
        cursorFX.x = event.clientX;
        cursorFX.y = event.clientY;
        cursorFX.target = event.target;
        cursorFX.visible = true;
        cursorFX.text = isTextCursorTarget(event.target);
        document.documentElement.classList.toggle('cursor-text', cursorFX.text);
    }

    function bindCursorFX() {
        if (cursorFX.bound) return;
        cursorFX.bound = true;
        window.addEventListener('pointermove', (event) => {
            if (event.pointerType === 'touch') return;
            onCursorPointer(event);
        }, { passive: true });
        window.addEventListener('pointerdown', (event) => {
            if (event.pointerType !== 'mouse') return;
            onCursorPointer(event);
            if (!cursorFX.mode || cursorFX.text) return;
            cursorFX.down = 1;
            if (cursorFX.mode === 'spark') {
                spawnFirework(cursorFX.x, cursorFX.y, 26);
                spawnFirework(cursorFX.x, cursorFX.y - 6, 14);
            } else {
                spawnSparks(8, 2.2);
            }
        });
        window.addEventListener('pointerleave', () => {
            cursorFX.visible = false;
            document.documentElement.classList.remove('cursor-text');
        });
        window.addEventListener('blur', () => { cursorFX.visible = false; });
        window.addEventListener('resize', resizeCursorFX);
    }

    function setCursorFX(mode) {
        const want = (mode === 'comet' || mode === 'spark') && fxEnabled() && !document.hidden ? mode : '';
        if (want && cursorFX.mode === want && cursorFX.raf) return;
        if (!want) {
            cursorFX.mode = '';
            cursorFX.trail = [];
            cursorFX.sparks = [];
            if (cursorFX.raf) {
                cancelAnimationFrame(cursorFX.raf);
                cursorFX.raf = 0;
            }
            if (cursorFX.canvas) cursorFX.canvas.style.display = 'none';
            document.documentElement.classList.remove('cursor-text');
            return;
        }
        if (!document.body) return;
        if (!cursorFX.canvas) {
            const canvas = document.createElement('canvas');
            canvas.id = 'site-cursor';
            canvas.setAttribute('aria-hidden', 'true');
            document.body.appendChild(canvas);
            cursorFX.canvas = canvas;
            cursorFX.ctx = canvas.getContext('2d');
        }
        cursorFX.canvas.style.display = 'block';
        cursorFX.mode = want;
        cursorFX.trail = [];
        cursorFX.sparks = [];
        cursorFX.boom = 0;
        bindCursorFX();
        resizeCursorFX();
        if (!cursorFX.raf) cursorFX.raf = requestAnimationFrame(drawCursorFX);
    }

    applyStoredTheme();
    applyStoredLook();
    document.addEventListener('visibilitychange', applyStoredLook);
    global.addEventListener('pagehide', () => setCursorFX(''));
    global.addEventListener('pageshow', applyStoredLook);
    const cursorMotionQuery = global.matchMedia('(prefers-reduced-motion: reduce)');
    if (cursorMotionQuery.addEventListener) cursorMotionQuery.addEventListener('change', applyStoredLook);
    else cursorMotionQuery.addListener(applyStoredLook);

    function navLink(href, label, extraClass) {
        const cls = extraClass || 'text-gray-700 hover:text-primary transition-all-300 font-medium';
        return `<a href="${href}" class="${cls}">${label}</a>`;
    }

    function dropdown(label, items, active, width) {
        const list = items.map((item) => {
            const current = item.id && item.id === active ? ' text-primary font-medium' : ' text-gray-700';
            return `<a href="${item.href}" class="block px-4 py-2 text-sm${current} hover:bg-indigo-50 hover:text-indigo-800">${item.label}</a>`;
        }).join('');
        return `
                <div class="relative group">
                    <button class="${active ? 'text-primary' : 'text-gray-700 hover:text-primary'} font-medium flex items-center focus:outline-none">
                        ${label} <i class="fa fa-caret-down ml-1 text-xs"></i>
                    </button>
                    <div class="absolute right-0 mt-2 ${width || 'w-64'} bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 max-h-[80vh] overflow-y-auto">
                        ${list}
                    </div>
                </div>`;
    }

    function groupedDropdown(label, groups, width) {
        const list = groups.map((group) => {
            const head = group.heading ? `<div class="px-4 pt-2 pb-1 text-[11px] tracking-wide text-gray-400">${group.heading}</div>` : '';
            const items = group.items.map((item) => `<a href="${item.href}" class="block px-4 py-1.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-800">${item.label}</a>`).join('');
            return head + items;
        }).join('');
        return `
                <div class="relative group">
                    <button class="text-gray-700 hover:text-primary font-medium flex items-center focus:outline-none">
                        ${label} <i class="fa fa-caret-down ml-1 text-xs"></i>
                    </button>
                    <div class="absolute right-0 mt-2 ${width || 'w-64'} bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 max-h-[80vh] overflow-y-auto">
                        ${list}
                    </div>
                </div>`;
    }

    function renderHeader(root, active) {
        const seriesItems = SERIES.map((item) => ({ id: item.id, href: root + item.href, label: item.label }));
        const groups = gameGroups();
        return `
    <header class="sticky top-0 z-50 bg-white shadow-sm site-header">
        <nav class="container mx-auto px-4 py-4 flex justify-between items-center gap-4">
            <a href="${root}index.html" class="text-2xl font-bold text-primary flex items-center shrink-0">
                <span class="mr-2"><i class="fa fa-code"></i></span>
                <span>MyLog</span>
            </a>
            <div class="hidden md:flex items-center space-x-6">
                ${navLink(root + 'index.html', 'Home')}
                ${dropdown('系列', seriesItems, active)}
                ${groupedDropdown('演示', groups.map((group) => ({
                    heading: group.heading,
                    items: group.items.map((item) => ({ href: root + item.href, label: item.label }))
                })), 'w-72')}
                ${navLink(root + 'glossary.html', '名词表')}
                ${navLink(root + 'map.html', '概念图')}
                ${navLink(root + 'index.html#contact', '联系')}
            </div>
            <div class="flex items-center gap-2">
                <button id="site-search-button" class="w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:text-primary hover:border-primary" title="搜索全站" aria-label="搜索全站">
                    <i class="fa fa-search"></i>
                </button>
                <div class="look-wrap">
                    <button id="look-toggle" class="w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:text-primary hover:border-primary" title="外观：鼠标与背景" aria-label="外观：鼠标与背景" aria-expanded="false" aria-haspopup="dialog" aria-controls="look-panel">
                        <i class="fa fa-paint-brush"></i>
                    </button>
                    <div id="look-panel" class="look-panel hidden" role="dialog" aria-label="外观设置">
                        <h3>外观</h3>
                        <div class="look-row">
                            <span>鼠标</span>
                            <div class="look-chips look-chips-grid" data-look="cursor">
                                <button type="button" data-cursor="system">系统</button>
                                <button type="button" data-cursor="dot">圆点</button>
                                <button type="button" data-cursor="comet">彗星</button>
                                <button type="button" data-cursor="spark">仙女棒</button>
                            </div>
                        </div>
                        <div class="look-row">
                            <span>背景</span>
                            <div class="look-chips look-chips-grid" data-look="bg" role="group" aria-label="背景样式">
                                <button type="button" data-bg="static">静态</button>
                                <button type="button" data-bg="orbs">A 浮光</button>
                                <button type="button" data-bg="aurora">B 极光</button>
                                <button type="button" data-bg="stars">C 星尘</button>
                            </div>
                        </div>
                        <div class="look-motion-controls">
                            <div class="look-motion-setting">
                                <label class="look-motion-label" for="look-bg-strength">强度 <output id="look-bg-strength-value" for="look-bg-strength">45%</output></label>
                                <input id="look-bg-strength" type="range" min="0" max="100" step="5" value="45" disabled>
                            </div>
                            <div class="look-motion-setting">
                                <label class="look-motion-label" for="look-bg-speed">速度 <output id="look-bg-speed-value" for="look-bg-speed">1.00×</output></label>
                                <input id="look-bg-speed" type="range" min="0.25" max="2" step="0.25" value="1" disabled>
                            </div>
                            <div class="look-motion-footer">
                                <span id="look-bg-status" role="status" aria-live="polite">正在载入背景设置…</span>
                                <button id="look-bg-pause" type="button" aria-pressed="false" disabled>暂停</button>
                            </div>
                        </div>
                    </div>
                </div>
                <button id="theme-toggle" class="w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:text-primary hover:border-primary" title="切换深色模式" aria-label="切换深色模式">
                    <i class="fa fa-moon-o"></i>
                </button>
                <button id="mobile-menu-button" class="md:hidden text-gray-700 focus:outline-none">
                    <i class="fa fa-bars text-xl"></i>
                </button>
            </div>
        </nav>
        <div id="mobile-menu" class="mobile-menu fixed top-0 left-0 h-full w-3/4 max-w-xs bg-white shadow-lg z-50 p-4">
            <div class="flex justify-between items-center mb-8">
                <span class="text-xl font-bold text-primary">MyLog</span>
                <button id="close-menu-button" class="text-gray-700 focus:outline-none">
                    <i class="fa fa-times text-xl"></i>
                </button>
            </div>
            <div class="flex flex-col space-y-3">
                <a href="${root}index.html" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">Home</a>
                ${SERIES.map((item) => `<a href="${root}${item.href}" class="${item.id === active ? 'text-primary' : 'text-gray-700 hover:text-primary'} font-medium py-2 border-b border-gray-100">${item.label}</a>`).join('')}
                ${groups.map((group) => `<div class="pt-2 pb-1 text-xs text-gray-400">${group.heading}</div>` + group.items.map((item) => `<a href="${root}${item.href}" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">${item.label}</a>`).join('')).join('')}
                <a href="${root}glossary.html" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">名词表</a>
                <a href="${root}map.html" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">概念图</a>
                <a href="${root}index.html#contact" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">联系</a>
            </div>
        </div>
        <div id="site-search-modal" class="site-search-modal hidden">
            <div class="site-search-panel">
                <div class="flex items-center gap-3 border-b border-gray-200 pb-3 mb-3">
                    <i class="fa fa-search text-gray-400"></i>
                    <input id="site-search-input" type="search" placeholder="搜索课程、论文、概念、演示… 支持模糊匹配" class="flex-1 bg-transparent outline-none text-gray-800">
                    <kbd class="text-xs text-gray-400 border rounded px-1.5 py-0.5">Esc</kbd>
                </div>
                <div id="site-search-results" class="max-h-[60vh] overflow-y-auto text-sm"></div>
            </div>
        </div>
    </header>`;
    }

    function renderFooter(root, seriesLabel) {
        const site = global.SITE || {};
        const seriesHome = seriesLabel ? `<a href="index.html" class="text-gray-400 hover:text-white">${seriesLabel}</a>` : '';
        return `
    <footer class="bg-gray-800 text-white py-8 mt-16">
        <div class="container mx-auto px-4">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                <div class="mb-2 md:mb-0 text-center md:text-left">
                    <p class="text-lg font-bold">MyLog</p>
                    <p class="text-gray-400 text-sm">© 2026 学习笔记</p>
                </div>
                <div class="flex flex-wrap justify-center gap-4 text-sm">
                    <a href="${root}index.html" class="text-gray-400 hover:text-white">Home</a>
                    ${seriesHome}
                    <a href="${root}glossary.html" class="text-gray-400 hover:text-white">名词表</a>
                    <a href="${root}map.html" class="text-gray-400 hover:text-white">概念图</a>
                    <a href="${root}rss.xml" class="text-gray-400 hover:text-white">RSS</a>
                    <a href="${site.github || 'https://github.com/wq-win'}" class="text-gray-400 hover:text-white" target="_blank" rel="noopener">GitHub</a>
                </div>
            </div>
        </div>
    </footer>
    <button id="back-to-top" class="fixed bottom-6 right-6 bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg opacity-0 invisible transition-all-300">
        <i class="fa fa-arrow-up"></i>
    </button>`;
    }

    function toggleTheme() {
        const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        document.documentElement.classList.toggle('dark', next === 'dark');
        try {
            localStorage.setItem('mylog-theme', next);
        } catch (error) {
            /* ignore */
        }
        const icon = document.querySelector('#theme-toggle i');
        if (icon) {
            icon.className = next === 'dark' ? 'fa fa-sun-o' : 'fa fa-moon-o';
        }
        if (global.mermaid) {
            global.mermaid.initialize({
                startOnLoad: false,
                theme: next === 'dark' ? 'dark' : 'neutral',
                securityLevel: 'loose'
            });
        }
    }

    function syncThemeIcon() {
        const icon = document.querySelector('#theme-toggle i');
        if (icon) {
            icon.className = document.documentElement.classList.contains('dark') ? 'fa fa-sun-o' : 'fa fa-moon-o';
        }
    }

    function syncLookPanel() {
        const look = applyStoredLook();
        document.querySelectorAll('#look-panel [data-cursor]').forEach((btn) => {
            const selected = btn.getAttribute('data-cursor') === look.cursor;
            btn.classList.toggle('is-on', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
        document.querySelectorAll('#look-panel [data-bg]').forEach((btn) => {
            const selected = btn.getAttribute('data-bg') === look.bg;
            btn.classList.toggle('is-on', selected);
            btn.setAttribute('aria-pressed', String(selected));
        });
    }

    function setLookPanelOpen(open) {
        const panel = document.getElementById('look-panel');
        const toggle = document.getElementById('look-toggle');
        if (!panel || !toggle) return;
        panel.classList.toggle('hidden', !open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    let lookDismissBound = false;
    function bindLook() {
        const toggle = document.getElementById('look-toggle');
        const panel = document.getElementById('look-panel');
        if (!toggle || !panel || toggle.dataset.bound) return;
        toggle.dataset.bound = '1';
        syncLookPanel();
        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            setLookPanelOpen(panel.classList.contains('hidden'));
        });
        panel.addEventListener('click', (event) => {
            const cursorBtn = event.target.closest('[data-cursor]');
            const bgBtn = event.target.closest('[data-bg]');
            if (cursorBtn) {
                writePref('mylog-cursor', cursorBtn.getAttribute('data-cursor'));
                syncLookPanel();
            }
            if (bgBtn) {
                const mode = bgBtn.getAttribute('data-bg');
                if (global.SiteBackground) global.SiteBackground.setMode(mode);
                else writePref('mylog-bg', mode);
                syncLookPanel();
            }
        });
        if (lookDismissBound) return;
        lookDismissBound = true;
        document.addEventListener('click', (event) => {
            const panel = document.getElementById('look-panel');
            if (panel && !panel.classList.contains('hidden') && !event.target.closest('.look-wrap')) {
                setLookPanelOpen(false);
            }
        });
        document.addEventListener('keydown', (event) => {
            const toggle = document.getElementById('look-toggle');
            if (event.key === 'Escape' && toggle && toggle.getAttribute('aria-expanded') === 'true') {
                setLookPanelOpen(false);
                toggle.focus();
            }
        });
    }

    let chromeScrollBound = false;
    function updateBackToTop() {
        const button = document.getElementById('back-to-top');
        if (!button) return;
        const show = window.pageYOffset > 300;
        button.classList.toggle('opacity-0', !show);
        button.classList.toggle('invisible', !show);
        button.classList.toggle('opacity-100', show);
        button.classList.toggle('visible', show);
    }

    function bindChrome() {
        ensureBgLayer();
        const mobileMenu = document.getElementById('mobile-menu');
        const backToTopButton = document.getElementById('back-to-top');
        const openMenu = document.getElementById('mobile-menu-button');
        const closeMenu = document.getElementById('close-menu-button');
        if (openMenu && mobileMenu) {
            openMenu.addEventListener('click', () => mobileMenu.classList.add('open'));
        }
        if (closeMenu && mobileMenu) {
            closeMenu.addEventListener('click', () => mobileMenu.classList.remove('open'));
        }
        if (mobileMenu) {
            mobileMenu.querySelectorAll('a').forEach((link) => {
                link.addEventListener('click', () => mobileMenu.classList.remove('open'));
            });
        }
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
            syncThemeIcon();
        }
        bindLook();
        if (backToTopButton) {
            if (!chromeScrollBound) {
                chromeScrollBound = true;
                window.addEventListener('scroll', updateBackToTop, { passive: true });
            }
            updateBackToTop();
            backToTopButton.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
        if (global.SiteSearch) {
            global.SiteSearch.bind();
        }
    }

    function loadScript(src) {
        return new Promise((resolve) => {
            if ([...document.scripts].some((script) => script.src === src)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = resolve;
            document.body.appendChild(script);
        });
    }

    function loadExtras(root) {
        const base = scriptBase();
        const article = document.getElementById('article-body');
        const files = ['site-config.js', 'search.js'];
        if (article) {
            if (!document.getElementById('reading-guide-style')) {
                const style = document.createElement('link');
                style.id = 'reading-guide-style';
                style.rel = 'stylesheet';
                style.href = base + '../css/reading-guide.css';
                document.head.appendChild(style);
            }
            files.push('related-data.js', 'glossary-data.js', 'reading-symbols.js', 'reading-guide.js');
        }
        // Reader also owns saved progress on series hubs, but games need no paper data.
        if (article || document.getElementById('series-catalog') || document.getElementById('rl-catalog')) files.push('reader.js');
        return files.reduce((chain, file) => chain.then(() => loadScript(base + file)), Promise.resolve())
            .then(() => {
                if (global.SiteSearch) {
                    global.SiteSearch.init(root);
                    global.SiteSearch.bind();
                }
                setTimeout(() => {
                    if (global.SeriesReader) {
                        global.SeriesReader.init({ root: root });
                    }
                }, 0);
            });
    }

    function mount(options) {
        const root = (options && options.root) || '../';
        const active = (options && options.active) || '';
        const seriesLabel = (options && options.seriesLabel) || '';
        const headerHost = document.getElementById('site-header');
        const footerHost = document.getElementById('site-footer');
        if (headerHost) {
            headerHost.innerHTML = renderHeader(root, active);
        }
        if (footerHost) {
            footerHost.innerHTML = renderFooter(root, seriesLabel);
        }
        bindChrome();
        loadExtras(root);
    }

    global.SeriesChrome = { mount, SERIES, applyStoredTheme, applyStoredLook };
})(window);
