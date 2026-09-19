(function (global) {
    function setupCanvas(canvas, cssWidth, cssHeight) {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        canvas.width = Math.round(cssWidth * dpr);
        canvas.height = Math.round(cssHeight * dpr);
        canvas.style.width = cssWidth + 'px';
        canvas.style.height = cssHeight + 'px';
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx: ctx, width: cssWidth, height: cssHeight, dpr: dpr };
    }

    function pointer(canvas, event, width) {
        const rect = canvas.getBoundingClientRect();
        const src = event.touches ? event.touches[0] : event;
        return {
            x: (src.clientX - rect.left) * (width / rect.width),
            y: (src.clientY - rect.top) * ((canvas.height / (window.devicePixelRatio || 1)) / rect.height)
        };
    }

    function pointerFromEvent(canvas, event, view) {
        const rect = canvas.getBoundingClientRect();
        const src = event.touches ? event.touches[0] : event;
        return {
            x: (src.clientX - rect.left) * (view.width / rect.width),
            y: (src.clientY - rect.top) * (view.height / rect.height)
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

    global.DemoKit = {
        setupCanvas: setupCanvas,
        pointer: pointerFromEvent,
        lerp: lerp,
        clamp: clamp,
        heat: heat,
        viridis: viridis,
        roundRect: roundRect,
        drawPanel: drawPanel,
        segmentHitsCircle: segmentHitsCircle,
        segmentHitsRect: segmentHitsRect,
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
