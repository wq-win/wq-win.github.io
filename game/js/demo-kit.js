(function (global) {
    function setupCanvas(canvas, cssWidth, cssHeight) {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        canvas.style.width = '100%';
        canvas.style.maxWidth = cssWidth + 'px';
        canvas.style.height = 'auto';
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx: ctx, width: cssWidth, height: cssHeight, dpr: dpr };
    }

    function pointerFromEvent(canvas, event, view) {
        const rect = canvas.getBoundingClientRect();
        const src = (event.touches && event.touches[0]) || (event.changedTouches && event.changedTouches[0]) || event;
        const width = view && view.width ? view.width : rect.width;
        const height = view && view.height ? view.height : rect.height;
        return {
            x: (src.clientX - rect.left) * (width / (rect.width || 1)),
            y: (src.clientY - rect.top) * (height / (rect.height || 1))
        };
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function heat(t) {
        const x = clamp(t, 0, 1);
        const r = Math.round(lerp(15, 250, x));
        const g = Math.round(lerp(23, 180, 1 - Math.abs(x - 0.55) * 1.4));
        const b = Math.round(lerp(90, 40, x));
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function viridis(t) {
        const x = clamp(t, 0, 1);
        const stops = [
            [68, 1, 84],
            [59, 82, 139],
            [33, 145, 140],
            [94, 201, 98],
            [253, 231, 37]
        ];
        const p = x * (stops.length - 1);
        const i = Math.min(stops.length - 2, Math.floor(p));
        const f = p - i;
        const a = stops[i];
        const b = stops[i + 1];
        return 'rgb(' + Math.round(lerp(a[0], b[0], f)) + ',' + Math.round(lerp(a[1], b[1], f)) + ',' + Math.round(lerp(a[2], b[2], f)) + ')';
    }

    function roundRect(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    function drawPanel(ctx, width, height) {
        ctx.fillStyle = '#070b14';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    }

    function strokeLabel(ctx, text, x, y) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.lineWidth = 3.6;
        ctx.strokeStyle = 'rgba(7,11,20,0.72)';
        ctx.fillStyle = '#f8fafc';
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    function segmentHitsCircle(ax, ay, bx, by, cx, cy, r) {
        const abx = bx - ax;
        const aby = by - ay;
        const t = clamp(((cx - ax) * abx + (cy - ay) * aby) / (abx * abx + aby * aby || 1), 0, 1);
        const px = ax + t * abx;
        const py = ay + t * aby;
        return (px - cx) * (px - cx) + (py - cy) * (py - cy) <= r * r;
    }

    function segmentHitsRect(ax, ay, bx, by, x, y, w, h) {
        if (ax >= x && ax <= x + w && ay >= y && ay <= y + h) return true;
        if (bx >= x && bx <= x + w && by >= y && by <= y + h) return true;
        const edges = [
            [x, y, x + w, y],
            [x + w, y, x + w, y + h],
            [x + w, y + h, x, y + h],
            [x, y + h, x, y]
        ];
        return edges.some((e) => {
            const d = (e[2] - e[0]) * (by - ay) - (e[3] - e[1]) * (bx - ax);
            if (Math.abs(d) < 1e-6) return false;
            const u = ((e[1] - ay) * (bx - ax) - (e[0] - ax) * (by - ay)) / d;
            const t = ((e[1] - ay) * (e[2] - e[0]) - (e[0] - ax) * (e[3] - e[1])) / d;
            return u >= 0 && u <= 1 && t >= 0 && t <= 1;
        });
    }

    function escapeHtml(text) {
        return String(text).replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    }

    function catalog() {
        return ((global.SITE && global.SITE.demos) || []).filter((item) => item.cat && item.file);
    }

    function relativeDemoHref(item, fromCat) {
        if (item.cat === fromCat) return item.file + '.html';
        return '../' + item.cat + '/' + item.file + '.html';
    }

    function mountNav() {
        const path = String(location.pathname || '').replace(/\\/g, '/');
        const match = path.match(/\/game\/(rl|llm|robot-classic|robot-learn)\/([^/]+)\.html$/);
        if (!match || match[2] === 'index') return;
        if (document.getElementById('demo-jump')) return;
        const cat = match[1];
        const file = match[2];
        const items = catalog();
        if (!items.length) return;
        const main = document.querySelector('main');
        if (!main) return;

        const groups = [];
        items.forEach((item) => {
            let group = groups.find((entry) => entry.cat === item.cat);
            if (!group) {
                group = { cat: item.cat, label: item.group || item.catLabel || item.cat, items: [] };
                groups.push(group);
            }
            group.items.push(item);
        });

        const selectHtml = groups.map((group) => (
            '<optgroup label="' + escapeHtml(group.label) + '">' +
            group.items.map((item) => {
                const selected = item.cat === cat && item.file === file ? ' selected' : '';
                return '<option value="' + escapeHtml(relativeDemoHref(item, cat)) + '"' + selected + '>' + escapeHtml(item.title) + '</option>';
            }).join('') +
            '</optgroup>'
        )).join('');

        const same = items.filter((item) => item.cat === cat);
        const chips = same.map((item) => {
            const on = item.file === file ? ' is-on' : '';
            return '<a class="demo-chip' + on + '" href="' + escapeHtml(item.file + '.html') + '">' + escapeHtml(item.title) + '</a>';
        }).join('');

        const bar = document.createElement('nav');
        bar.id = 'demo-jump';
        bar.className = 'demo-jump';
        bar.setAttribute('aria-label', '切换演示');
        bar.innerHTML =
            '<label class="demo-jump-select">切换演示 <select>' + selectHtml + '</select></label>' +
            '<div class="demo-jump-chips">' + chips + '</div>';
        const intro = main.querySelector('h1') && main.querySelector('h1').nextElementSibling;
        if (intro) intro.insertAdjacentElement('afterend', bar);
        else main.insertBefore(bar, main.firstChild);
        bar.querySelector('select').addEventListener('change', (event) => {
            if (event.target.value) location.href = event.target.value;
        });

        const rail = document.createElement('aside');
        rail.id = 'demo-rail';
        rail.className = 'demo-rail';
        rail.innerHTML = groups.map((group) => (
            '<p class="demo-rail-h">' + escapeHtml(group.label) + '</p>' +
            group.items.map((item) => {
                const on = item.cat === cat && item.file === file ? ' is-on' : '';
                return '<a class="' + on + '" href="' + escapeHtml(relativeDemoHref(item, cat)) + '">' + escapeHtml(item.title) + '</a>';
            }).join('')
        )).join('') + '<a class="demo-rail-all" href="../index.html">全部演示</a>';
        document.body.appendChild(rail);
        document.body.classList.add('has-demo-rail');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountNav);
    } else {
        mountNav();
    }

    global.DemoKit = {
        setupCanvas: setupCanvas,
        pointer: pointerFromEvent,
        lerp: lerp,
        clamp: clamp,
        heat: heat,
        viridis: viridis,
        roundRect: roundRect,
        drawPanel: drawPanel,
        strokeLabel: strokeLabel,
        segmentHitsCircle: segmentHitsCircle,
        segmentHitsRect: segmentHitsRect,
        mountNav: mountNav,
        parseMaze: function (rows) {
            const h = rows.length;
            const w = rows[0].length;
            const walls = [];
            let start = { x: 1, y: 1 };
            let goal = { x: w - 2, y: h - 2 };
            for (let y = 0; y < h; y += 1) {
                for (let x = 0; x < w; x += 1) {
                    const ch = rows[y][x];
                    if (ch === '#') walls.push(x + ',' + y);
                    if (ch === 'S') start = { x: x, y: y };
                    if (ch === 'G') goal = { x: x, y: y };
                }
            }
            return { width: w, height: h, walls: new Set(walls), start: start, goal: goal };
        },
        DETOUR_MAZE: [
            '###############',
            '#S....#.......#',
            '#.###.#.#####.#',
            '#.#...#.....#.#',
            '#.#.#######.#.#',
            '#.#.........#G#',
            '#.#########.#.#',
            '#...........#.#',
            '###############'
        ]
    };
})(window);
