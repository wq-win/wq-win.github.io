(function (global) {
    function navLink(href, label, extraClass) {
        const cls = extraClass || 'text-gray-700 hover:text-primary transition-all-300 font-medium';
        return `<a href="${href}" class="${cls}">${label}</a>`;
    }

    function renderHeader(root) {
        return `
    <header class="sticky top-0 z-50 bg-white shadow-sm">
        <nav class="container mx-auto px-4 py-4 flex justify-between items-center">
            <a href="${root}index.html" class="text-2xl font-bold text-primary flex items-center">
                <span class="mr-2"><i class="fa fa-code"></i></span>
                <span>MyLog</span>
            </a>

            <div class="hidden md:flex items-center space-x-8">
                ${navLink(root + 'index.html', 'Home')}
                ${navLink(root + 'index.html#about', 'About')}
                ${navLink(root + 'index.html#articles-section', 'Articles')}
                ${navLink(root + 'index.html#contact', 'Contact')}
                <div class="relative group">
                    <button class="text-primary font-medium flex items-center focus:outline-none">
                        RL <i class="fa fa-caret-down ml-1 text-xs"></i>
                    </button>
                    <div class="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                        <a href="${root}rl/index.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-800">系列首页</a>
                        <a href="${root}rl/00-timeline.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-800">发展时间线</a>
                        <a href="${root}rl/01-actor-critic.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-800">从第 1 天开始</a>
                        <a href="${root}rl/61-epilogue.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-800">系列收尾</a>
                    </div>
                </div>
                <div class="relative group">
                    <button class="text-gray-700 hover:text-primary transition-all-300 font-medium flex items-center focus:outline-none">
                        Game <i class="fa fa-caret-down ml-1 text-xs"></i>
                    </button>
                    <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                        <a href="${root}game/sudoku.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-red-100 hover:text-red-800">Sudoku</a>
                        <a href="${root}game/jianghu-slay.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-red-100 hover:text-red-800">江湖 Slay</a>
                    </div>
                </div>
            </div>

            <button id="mobile-menu-button" class="md:hidden text-gray-700 focus:outline-none">
                <i class="fa fa-bars text-xl"></i>
            </button>
        </nav>

        <div id="mobile-menu" class="mobile-menu fixed top-0 left-0 h-full w-3/4 max-w-xs bg-white shadow-lg z-50 p-4">
            <div class="flex justify-between items-center mb-8">
                <span class="text-xl font-bold text-primary">MyLog</span>
                <button id="close-menu-button" class="text-gray-700 focus:outline-none">
                    <i class="fa fa-times text-xl"></i>
                </button>
            </div>
            <div class="flex flex-col space-y-4">
                <a href="${root}index.html" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">Home</a>
                <a href="${root}index.html#about" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">About</a>
                <a href="${root}index.html#articles-section" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">Articles</a>
                <a href="${root}index.html#contact" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">Contact</a>
                <a href="${root}rl/index.html" class="text-primary font-medium py-2 border-b border-gray-100">强化学习系列</a>
                <a href="${root}rl/00-timeline.html" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">发展时间线</a>
                <a href="${root}game/sudoku.html" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">Sudoku</a>
                <a href="${root}game/jianghu-slay.html" class="text-gray-700 hover:text-primary font-medium py-2 border-b border-gray-100">江湖 Slay</a>
            </div>
        </div>
    </header>`;
    }

    function renderFooter() {
        return `
    <footer class="bg-gray-800 text-white py-8 mt-16">
        <div class="container mx-auto px-4">
            <div class="flex flex-col md:flex-row justify-between items-center">
                <div class="mb-4 md:mb-0">
                    <p class="text-lg font-bold">MyLog</p>
                    <p class="text-gray-400 text-sm">© 2026 All rights reserved</p>
                </div>
                <div class="flex space-x-4">
                    <a href="../index.html" class="text-gray-400 hover:text-white transition-all-300">Home</a>
                    <a href="index.html" class="text-gray-400 hover:text-white transition-all-300">RL 系列</a>
                </div>
            </div>
        </div>
    </footer>
    <button id="back-to-top" class="fixed bottom-6 right-6 bg-primary text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg opacity-0 invisible transition-all-300">
        <i class="fa fa-arrow-up"></i>
    </button>`;
    }

    function bindChrome() {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const closeMenuButton = document.getElementById('close-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        const backToTopButton = document.getElementById('back-to-top');

        if (mobileMenuButton && mobileMenu) {
            mobileMenuButton.addEventListener('click', () => mobileMenu.classList.add('open'));
        }
        if (closeMenuButton && mobileMenu) {
            closeMenuButton.addEventListener('click', () => mobileMenu.classList.remove('open'));
        }
        if (mobileMenu) {
            mobileMenu.querySelectorAll('a').forEach((link) => {
                link.addEventListener('click', () => mobileMenu.classList.remove('open'));
            });
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
    }

    function mountChrome(options) {
        const root = (options && options.root) || '../';
        const headerHost = document.getElementById('site-header');
        const footerHost = document.getElementById('site-footer');
        if (headerHost) {
            headerHost.innerHTML = renderHeader(root);
        }
        if (footerHost) {
            footerHost.innerHTML = renderFooter();
        }
        bindChrome();
    }

    global.RLChrome = { mountChrome };
})(window);
