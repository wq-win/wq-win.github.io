(function (global) {
    let index = [];
    let root = '../';
    let loaded = false;
    let bound = false;

    const lobby = 'game/index.html';
    const solo = 'game/paodekuai.html';
    const roomFragment = '#friend-rooms-title';
    const roomQueries = new Set(['南昌麻将', '好友开房', '好友联机', '开房间', '房间号',
        '跑得快联机', '在线跑得快', '跑得快房间', '南昌麻将联机',
        '房间码', '六位房间码', '六位房间号', '6位房间号', '好友牌桌', '加入房间', '跑得快开房', '南昌麻将开房']);

    function foldWidth(text) {
        return text.replace(/[\uFF01-\uFF5E\u3000]/g, (char) =>
            char === '\u3000' ? ' ' : String.fromCharCode(char.charCodeAt(0) - 0xFEE0));
    }

    function preferredPath(normalizedQuery) {
        const intent = normalizedQuery.replace(/\s/g, '');
        return roomQueries.has(intent) ? lobby : intent === '跑得快单机' ? solo : null;
    }

    function resultHref(item, preferred) {
        if (preferred !== lobby || item.url !== lobby) return root + item.url;
        const target = new URL(root + lobby, global.location.href);
        const here = global.location;
        const directory = target.pathname.slice(0, -'index.html'.length);
        if (target.origin === here.origin && (here.pathname === target.pathname || here.pathname === directory)) {
            return here.pathname + here.search + roomFragment;
        }
        return root + lobby + roomFragment;
    }

    function normalize(text) {
        return foldWidth(String(text || ''))
            .toLowerCase()
            .replace(/[‐‑–—]/g, '-')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function subsequence(needle, hay) {
        let i = 0;
        for (let j = 0; j < hay.length && i < needle.length; j += 1) {
            if (hay[j] === needle[i]) i += 1;
        }
        return i === needle.length;
    }

    function ngrams(text, size) {
        const grams = [];
        if (text.length < size) {
            if (text) grams.push(text);
            return grams;
        }
        for (let i = 0; i <= text.length - size; i += 1) {
            grams.push(text.slice(i, i + size));
        }
        return grams;
    }

    function editClose(a, b) {
        if (!a || !b) return false;
        if (Math.abs(a.length - b.length) > 2) return false;
        if (a.length < 4 && b.length < 4) return a === b;
        const long = a.length >= b.length ? a : b;
        const short = a.length >= b.length ? b : a;
        if (long.includes(short) && short.length >= 4) return true;
        let misses = 0;
        let i = 0;
        let j = 0;
        while (i < a.length && j < b.length) {
            if (a[i] === b[j]) {
                i += 1;
                j += 1;
            } else {
                misses += 1;
                if (misses > 2) return false;
                if (a.length > b.length) i += 1;
                else if (b.length > a.length) j += 1;
                else {
                    i += 1;
                    j += 1;
                }
            }
        }
        misses += (a.length - i) + (b.length - j);
        return misses <= 2;
    }

    function scoreItem(item, q) {
        if (!q) return 0;
        const hay = normalize([
            item.title, item.cardTitle, item.question, item.excerpt,
            item.seriesLabel, item.year, item.era, item.kind
        ].join(' '));
        // An exact series-name query should lead to its reading directory.
        const isSeriesHub = item.kind === 'page' && item.id === item.series + ':index';
        let score = isSeriesHub && q === normalize(item.seriesLabel) ? 200 : 0;
        if (hay.includes(q)) score += 120;
        if (normalize(item.cardTitle).includes(q)) score += 80;
        if (normalize(item.title).includes(q)) score += 50;
        const tokens = q.split(' ').filter(Boolean);
        tokens.forEach((token) => {
            if (hay.includes(token)) score += 24;
            else if (subsequence(token, hay)) score += 10;
            else if (editClose(token, normalize(item.cardTitle).replace(/\s/g, ''))) score += 16;
        });
        ngrams(q.replace(/\s/g, ''), 2).forEach((gram) => {
            if (gram && hay.includes(gram)) score += 3;
        });
        return score;
    }

    function highlight(text, query) {
        const source = String(text || '');
        const q = query.trim();
        if (!q) return source;
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Each folded character maps to one code unit in the displayed source.
        let out = '', start = 0;
        for (const match of foldWidth(source).matchAll(new RegExp(escaped, 'ig'))) {
            const end = match.index + match[0].length;
            out += source.slice(start, match.index) + '<mark>' + source.slice(match.index, end) + '</mark>';
            start = end;
        }
        return out + source.slice(start);
    }

    function renderResults(rawQuery) {
        const box = document.getElementById('site-search-results');
        if (!box) return;
        const query = foldWidth(rawQuery);
        if (!query.trim()) {
            box.innerHTML = '<p class="text-gray-500 py-6 text-center">输入标题、方法名、年份或中文关键词。拼写差一点也可以。</p>';
            return;
        }
        const normalizedQuery = normalize(query);
        const preferred = preferredPath(normalizedQuery);
        const ranked = index
            .map((item) => ({ item, score: scoreItem(item, normalizedQuery), promoted: preferred === item.url }))
            .filter((entry) => entry.promoted || entry.score >= 18)
            .sort((a, b) => Number(b.promoted) - Number(a.promoted) || b.score - a.score)
            .slice(0, 20);
        if (!ranked.length) {
            box.innerHTML = '<p class="text-gray-500 py-6 text-center">没有匹配。可以试试 PPO、注意力、A*、DMP。</p>';
            return;
        }
        box.innerHTML = ranked.map(({ item }) => `
            <a class="site-search-hit" href="${resultHref(item, preferred)}">
                <div class="flex justify-between gap-3 mb-1">
                    <span class="font-medium text-gray-800">${highlight(item.cardTitle, query)}</span>
                    <span class="text-xs text-gray-400 shrink-0">${item.seriesLabel}${item.year ? ' · ' + item.year : ''}</span>
                </div>
                <p class="text-gray-500">${highlight(item.question || item.excerpt, query)}</p>
            </a>
        `).join('');
    }

    function openModal() {
        const modal = document.getElementById('site-search-modal');
        const input = document.getElementById('site-search-input');
        if (!modal) return;
        modal.classList.remove('hidden');
        if (input) {
            input.focus();
            renderResults(input.value);
        }
    }

    function closeModal() {
        const modal = document.getElementById('site-search-modal');
        if (modal) modal.classList.add('hidden');
    }

    function bind() {
        if (bound) return;
        bound = true;
        const button = document.getElementById('site-search-button');
        const modal = document.getElementById('site-search-modal');
        const input = document.getElementById('site-search-input');
        if (button) button.addEventListener('click', openModal);
        if (modal) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) closeModal();
                if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
                    event.ctrlKey || event.shiftKey || event.altKey) return;
                const link = event.target.closest('.site-search-hit');
                if (!link || link.hash !== roomFragment) return;
                const target = new URL(link.href);
                const here = global.location;
                if (target.origin !== here.origin || target.pathname !== here.pathname || target.search !== here.search) return;
                const heading = document.getElementById(roomFragment.slice(1));
                closeModal();
                if (!heading) return;
                if (!heading.hasAttribute('tabindex')) {
                    heading.setAttribute('tabindex', '-1');
                    heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
                }
                heading.focus({ preventScroll: true });
            });
        }
        if (input) {
            input.addEventListener('input', () => renderResults(input.value));
        }
        document.addEventListener('keydown', (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                openModal();
            }
            if (event.key === 'Escape') closeModal();
        });
    }

    function init(pathRoot) {
        root = pathRoot || '../';
        if (loaded) return Promise.resolve();
        loaded = true;
        const url = new URL('../data/search-index.json', document.querySelector('script[src*="search.js"], script[src*="site-chrome.js"]').src);
        return fetch(url.toString())
            .then((res) => res.json())
            .then((data) => {
                index = data;
                const input = document.getElementById('site-search-input');
                if (input && input.value) renderResults(input.value);
            })
            .catch(() => {
                index = [];
            });
    }

    global.SiteSearch = { init, bind, open: openModal };
})(window);
