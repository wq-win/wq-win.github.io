(function (global) {
    const SERIES = (global.SITE && global.SITE.series) || [
        { id: 'rl', href: 'rl/index.html', label: '强化学习 60 篇' },
        { id: 'llm', href: 'llm/index.html', label: '大语言模型 100 篇' },
        { id: 'robot-learn', href: 'robot-learn/index.html', label: '机器人学习 100 篇' },
        { id: 'robot-classic', href: 'robot-classic/index.html', label: '机器人经典基础 100 篇' }
    ];

    const GAMES = [
        { href: 'game/index.html', label: '演示入口' },
        { href: 'game/sudoku.html', label: 'Sudoku' },
        { href: 'game/jianghu-slay.html', label: '江湖 Slay' },
        { href: 'game/rl/index.html', label: '强化学习演示' },
        { href: 'game/llm/index.html', label: '大语言模型演示' },
        { href: 'game/robot-learn/index.html', label: '机器人学习演示' },
        { href: 'game/robot-classic/index.html', label: '机器人经典演示' }
    ];

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

    applyStoredTheme();

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
                    <div class="absolute right-0 mt-2 ${width || 'w-64'} bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                        ${list}
                    </div>
                </div>`;
    }

    function renderHeader(root, active) {
        const seriesItems = SERIES.map((item) => ({ id: item.id, href: root + item.href, label: item.label }));
        const gameItems = GAMES.map((item) => ({ href: root + item.href, label: item.label }));
        return `
    <header class="sticky top-0 z-50 bg-white shadow-sm site-header">
        <nav class="container mx-auto px-4 py-4 flex justify-between items-center gap-4">
            <a href="${root}index.html" class="text-2xl font-bold text-primary flex items-center shrink-0">
                <span class="mr-2"><i class="fa fa-code"></i></span>
                <span>MyLog</span>
            </a>
            <div class="hidden md:flex items-center space-x-6">
                ${navLink(root + 'index.html', 'Home')}
                ${dropdown('精读', seriesItems, active)}
                ${dropdown('演示', gameItems, '', 'w-56')}
                ${navLink(root + 'glossary.html', '名词表')}
                ${navLink(root + 'map.html', '概念图')}
                ${navLink(root + 'index.html#contact', '联系')}
            </div>
            <div class="flex items-center gap-2">
                <button id="site-search-button" class="w-9 h-9 rounded-full border border-gray-200 text-gray-600 hover:text-primary hover:border-primary" title="搜索全站" aria-label="搜索全站">
                    <i class="fa fa-search"></i>
                </button>
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
                ${GAMES.map((item) => `<a href="${root}${item.href}" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">${item.label}</a>`).join('')}
                <a href="${root}glossary.html" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">名词表</a>
                <a href="${root}map.html" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">概念图</a>
                <a href="${root}index.html#contact" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">联系</a>
            </div>
        </div>
        <div id="site-search-modal" class="site-search-modal hidden">
            <div class="site-search-panel">
                <div class="flex items-center gap-3 border-b border-gray-200 pb-3 mb-3">
                    <i class="fa fa-search text-gray-400"></i>
                    <input id="site-search-input" type="search" placeholder="搜索论文、概念、演示… 支持模糊匹配" class="flex-1 bg-transparent outline-none text-gray-800">
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
                    <p class="text-gray-400 text-sm">© 2026 论文精读笔记</p>
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

    function bindChrome() {
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
        if (backToTopButton) {
            window.addEventListener('scroll', () => {
                if (window.pageYOffset > 300) {
                    backToTopButton.classList.remove('opacity-0', 'invisible');
                    backToTopButton.classList.add('opacity-100', 'visible');
                } else {
                    backToTopButton.classList.add('opacity-0', 'invisible');
                    backToTopButton.classList.remove('opacity-100', 'visible');
                }
            });
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
        const files = ['site-config.js', 'search.js', 'related-data.js', 'glossary-data.js', 'reader.js'];
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

    global.SeriesChrome = { mount, SERIES, applyStoredTheme };
})(window);
