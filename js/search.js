(function (global) {
    let index = [];
    let root = '../';
    let loaded = false;
    let bound = false;

    function normalize(text) {
        return String(text || '')
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

    function scoreItem(item, query) {
        const q = normalize(query);
        if (!q) return 0;
        const hay = normalize([
            item.title, item.cardTitle, item.question, item.excerpt,
            item.seriesLabel, item.year, item.era, item.kind
        ].join(' '));
        let score = 0;
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
        return source.replace(new RegExp(escaped, 'ig'), (match) => `<mark>${match}</mark>`);
    }

    function renderResults(query) {
        const box = document.getElementById('site-search-results');
        if (!box) return;
        if (!query.trim()) {
            box.innerHTML = '<p class="text-gray-500 py-6 text-center">输入标题、方法名、年份或中文关键词。拼写差一点也可以。</p>';
            return;
        }
        const ranked = index
            .map((item) => ({ item, score: scoreItem(item, query) }))
            .filter((entry) => entry.score >= 18)
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);
        if (!ranked.length) {
            box.innerHTML = '<p class="text-gray-500 py-6 text-center">没有匹配。可以试试 PPO、注意力、A*、DMP。</p>';
            return;
        }
        box.innerHTML = ranked.map(({ item }) => `
            <a class="site-search-hit" href="${root}${item.url}">
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
