(function (global) {
    function init(config) {
        const posts = config.posts || [];
        const eraOrder = config.eras || [{ id: 'all', label: '全部' }];
        let activeEra = 'all';
        let query = '';

        function matches(post) {
            if (activeEra !== 'all' && post.eraId !== activeEra) return false;
            if (!query.trim()) return true;
            const q = query.toLowerCase();
            return [post.title, post.cardTitle, post.question, String(post.year || ''), post.excerpt, post.eraLabel]
                .join(' ')
                .toLowerCase()
                .includes(q);
        }

        function extras() {
            return posts.filter((post) => post.kind !== 'paper');
        }

        function papers() {
            return posts.filter((post) => post.kind === 'paper');
        }

        function renderFilters() {
            const root = document.getElementById('series-era-filters');
            root.innerHTML = eraOrder.map((era) => `
                <button data-era="${era.id}" class="rl-era-chip px-3 py-1 rounded-full text-sm font-medium ${era.id === activeEra ? 'active bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">
                    ${era.label}
                </button>
            `).join('');
            root.querySelectorAll('button').forEach((button) => {
                button.addEventListener('click', () => {
                    activeEra = button.getAttribute('data-era');
                    renderCatalog();
                    renderFilters();
                });
            });
        }

        function renderCatalog() {
            const root = document.getElementById('series-catalog');
            const specials = extras().filter(matches);
            const list = papers().filter(matches);
            document.getElementById('series-count').textContent =
                `显示 ${list.length} 篇论文精读${specials.length ? `，另有 ${specials.length} 篇导读／收尾` : ''}`;

            const groups = [];
            if (specials.length && (activeEra === 'all' || query)) {
                groups.push({ title: query ? '导读与收尾' : '阅读入口', posts: specials });
            }

            const eraSeen = [];
            list.forEach((post) => {
                let group = eraSeen.find((item) => item.id === post.eraId);
                if (!group) {
                    group = {
                        id: post.eraId,
                        title: post.eraYears ? `${post.eraYears} ${post.eraLabel}` : post.eraLabel,
                        posts: []
                    };
                    eraSeen.push(group);
                }
                group.posts.push(post);
            });
            groups.push(...eraSeen);

            if (!groups.length) {
                root.innerHTML = `<div class="bg-white rounded-lg shadow-card p-6 text-gray-500">没有匹配的文章。</div>`;
                return;
            }

            root.innerHTML = groups.map((group) => `
                <div>
                    <h3 class="text-lg font-bold text-gray-800 mb-3">${group.title}</h3>
                    <div class="grid grid-cols-1 gap-3">
                        ${group.posts.map((post) => `
                            <a href="${post.slug}.html" class="article-card block bg-white rounded-lg shadow-card hover:shadow-card-hover p-5">
                                <div class="flex justify-between items-start gap-3 mb-2">
                                    <span class="px-2 py-1 ${post.kind === 'paper' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-900'} rounded-full text-xs font-medium">
                                        ${post.kind === 'paper' ? `第 ${String(post.day).padStart(3, '0')} 篇 · ${post.year}` : post.eraLabel}
                                    </span>
                                </div>
                                <h4 class="text-lg font-bold text-gray-800 mb-1">${post.cardTitle}</h4>
                                <p class="text-sm text-gray-500">${post.question || ''}</p>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `).join('');
        }

        document.addEventListener('DOMContentLoaded', () => {
            if (global.AOS) {
                global.AOS.init({ duration: 700, once: true });
            }
            if (global.mermaid) {
                global.mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
                global.mermaid.run();
            }
            if (global.SeriesChrome) {
                global.SeriesChrome.mount({
                    root: config.root || '../',
                    active: config.active || '',
                    seriesLabel: config.seriesLabel || ''
                });
            }
            renderFilters();
            renderCatalog();
            const search = document.getElementById('series-search');
            if (search) {
                search.addEventListener('input', (event) => {
                    query = event.target.value;
                    renderCatalog();
                });
            }
        });
    }

    global.SeriesHub = { init };
})(window);
