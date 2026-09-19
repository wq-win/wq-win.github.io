(function (global) {
    const STORAGE_KEY = 'mylog-progress-v1';

    function loadProgress() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (error) {
            return {};
        }
    }

    function saveProgress(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (error) {
            /* ignore quota */
        }
    }

    function seriesFromPath() {
        const parts = location.pathname.split('/').filter(Boolean);
        if (parts.includes('game')) return '';
        const known = ['rl', 'llm', 'robot-learn', 'robot-classic'];
        return known.find((name) => parts.includes(name)) || '';
    }

    function currentSlug() {
        const file = location.pathname.split('/').pop() || '';
        return file.replace(/\.html$/, '');
    }

    function progressKey(series, slug) {
        return `${series}:${slug}`;
    }

    function isRead(series, slug) {
        const data = loadProgress();
        return Boolean(data[progressKey(series, slug)]);
    }

    function setRead(series, slug, value) {
        const data = loadProgress();
        const key = progressKey(series, slug);
        if (value) data[key] = Date.now();
        else delete data[key];
        saveProgress(data);
    }

    function countRead(posts, series) {
        return posts.filter((post) => post.kind !== 'overview' && post.kind !== 'epilogue' && isRead(series, post.slug)).length;
    }

    function slugifyHeading(text, used) {
        const base = String(text).trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '');
        let slug = base || 'section';
        let n = 1;
        while (used[slug]) {
            n += 1;
            slug = `${base}-${n}`;
        }
        used[slug] = true;
        return slug;
    }

    function renderToc(container) {
        const headings = container.querySelectorAll('h2, h3');
        if (headings.length < 3) return;
        const used = {};
        const items = [];
        headings.forEach((heading) => {
            if (!heading.id) heading.id = slugifyHeading(heading.textContent, used);
            items.push({
                id: heading.id,
                text: heading.textContent,
                level: heading.tagName === 'H2' ? 2 : 3
            });
        });
        let toc = document.getElementById('article-toc');
        if (!toc) {
            toc = document.createElement('nav');
            toc.id = 'article-toc';
            toc.className = 'article-toc';
            container.insertBefore(toc, container.firstChild);
        }
        toc.innerHTML = `<p class="article-toc-title">本页目录</p>` + items.map((item) =>
            `<a class="toc-level-${item.level}" href="#${item.id}">${item.text}</a>`
        ).join('');
    }

    function renderRelated(root, series, slug) {
        const related = (global.RELATED_PAPERS || {})[`${series}:${slug}`] || [];
        if (!related.length) return;
        let host = document.getElementById('related-papers');
        const pager = document.getElementById('article-pager');
        if (!host) {
            host = document.createElement('section');
            host.id = 'related-papers';
            host.className = 'related-papers';
            if (pager && pager.parentNode) pager.parentNode.insertBefore(host, pager.nextSibling);
            else document.querySelector('article, main')?.appendChild(host);
        }
        host.innerHTML = `
            <h2 class="text-xl font-bold mb-4">相关篇与对照</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${related.map((item) => `
                    <a class="block bg-white rounded-lg shadow-card hover:shadow-card-hover p-4" href="${root}${item.url}">
                        <div class="text-xs text-gray-400 mb-1">${item.seriesLabel} · ${item.reason}</div>
                        <div class="font-medium text-gray-800">${item.title}</div>
                    </a>
                `).join('')}
            </div>
        `;
    }

    function wrapGlossary(container, root) {
        const terms = (global.GLOSSARY || []).slice().sort((a, b) => b.term.length - a.term.length);
        if (!terms.length) return;
        let wraps = 0;
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (wraps >= 20) return NodeFilter.FILTER_REJECT;
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                if (parent.closest('a, code, pre, .katex, .mermaid, .glossary-term, h1, h2, h3')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach((node) => {
            let html = node.nodeValue.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
            let changed = false;
            terms.forEach((term) => {
                const names = [term.term].concat(term.aliases || []);
                names.forEach((name) => {
                    if (!name || name.length < 2) return;
                    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const pattern = /^[A-Za-z0-9*+\-]+$/.test(name)
                        ? new RegExp('\\b' + escaped + '\\b')
                        : new RegExp(escaped);
                    if (pattern.test(html) && html.indexOf('glossary-term') === -1) {
                        html = html.replace(pattern, `<a class="glossary-term" href="${root}${term.href}" title="${term.definition}">$&</a>`);
                        changed = true;
                        wraps += 1;
                    }
                });
            });
            if (changed) {
                const span = document.createElement('span');
                span.innerHTML = html;
                node.parentNode.replaceChild(span, node);
            }
        });
    }

    function renderProgressButton(series, slug) {
        const nav = document.getElementById('article-nav');
        if (!nav || !series || !slug || slug === 'index') return;
        let button = document.getElementById('mark-read-button');
        if (!button) {
            button = document.createElement('button');
            button.id = 'mark-read-button';
            button.className = 'rl-nav-chip';
            nav.appendChild(button);
        }
        const read = isRead(series, slug);
        button.innerHTML = read
            ? '<i class="fa fa-check"></i> 已读'
            : '<i class="fa fa-bookmark-o"></i> 标为已读';
        button.classList.toggle('is-read', read);
        button.onclick = () => {
            setRead(series, slug, !isRead(series, slug));
            renderProgressButton(series, slug);
        };
    }

    function markOpened(series, slug) {
        if (!series || !slug || slug === 'index') return;
        if (!isRead(series, slug)) {
            setRead(series, slug, true);
        }
    }

    function decorateCatalog(series) {
        const root = document.getElementById('series-catalog') || document.getElementById('rl-catalog');
        if (!root || !series) return;
        root.querySelectorAll('a[href$=".html"]').forEach((link) => {
            const slug = (link.getAttribute('href') || '').replace('.html', '');
            if (isRead(series, slug)) {
                link.classList.add('is-read-card');
                if (!link.querySelector('.read-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'read-badge';
                    badge.textContent = '已读';
                    link.querySelector('.flex, div')?.prepend(badge);
                }
            }
        });
    }

    function renderHubProgress(posts, series) {
        if (!posts || !series) return;
        const papers = posts.filter((post) => (post.kind || 'paper') === 'paper');
        if (!papers.length) return;
        const read = countRead(papers, series);
        let host = document.getElementById('reading-progress');
        if (!host) {
            const catalog = document.getElementById('series-catalog') || document.getElementById('rl-catalog');
            if (!catalog) return;
            host = document.createElement('div');
            host.id = 'reading-progress';
            host.className = 'reading-progress';
            catalog.parentElement.insertBefore(host, catalog);
        }
        const percent = Math.round((read / papers.length) * 100);
        host.innerHTML = `
            <div class="flex justify-between text-sm mb-2">
                <span>阅读进度保存在这台设备的浏览器里，不会上传。</span>
                <span>${read} / ${papers.length}（${percent}%）</span>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
        `;
    }

    function init(options) {
        const root = (options && options.root) || '../';
        const series = (options && options.series) || seriesFromPath();
        const slug = (options && options.slug) || currentSlug();
        const body = document.getElementById('article-body');
        if (body) {
            renderToc(body);
            wrapGlossary(body, root);
            renderRelated(root, series, slug);
            if (series && slug && slug !== 'index') {
                markOpened(series, slug);
                renderProgressButton(series, slug);
            }
        }
        decorateCatalog(series);
        const posts = global.SERIES_POSTS || global.RL_POSTS || (global.RL_CATALOG && global.RL_CATALOG.posts);
        if (posts) renderHubProgress(posts, series);
    }

    global.SeriesReader = {
        init,
        isRead,
        setRead,
        countRead,
        renderHubProgress,
        decorateCatalog
    };
})(window);
