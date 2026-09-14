(function (global) {
    function boot(options) {
        const posts = options.posts || [];
        const currentSlug = options.slug;
        const slugMap = options.slugMap || {};
        const seriesLabel = options.seriesLabel || '系列';

        if (global.mermaid) {
            global.mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
        }
        if (global.SeriesChrome) {
            global.SeriesChrome.mount({
                root: options.root || '../',
                active: options.active || '',
                seriesLabel: seriesLabel
            });
        }

        const source = document.getElementById('md-source').value;
        global.SeriesRender.mountMarkdown(document.getElementById('article-body'), source, { slugMap: slugMap });

        const index = posts.findIndex((item) => item.slug === currentSlug);
        const current = posts[index];
        const prev = index > 0 ? posts[index - 1] : null;
        const next = index >= 0 && index < posts.length - 1 ? posts[index + 1] : null;

        const nav = document.getElementById('article-nav');
        const chips = [`<a class="rl-nav-chip" href="index.html"><i class="fa fa-list"></i> 系列目录</a>`];
        if (current && current.year) {
            chips.push(`<span class="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">${current.year}</span>`);
        }
        if (current && current.eraLabel) {
            chips.push(`<span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">${current.eraLabel}</span>`);
        }
        nav.innerHTML = chips.join('');

        const pager = document.getElementById('article-pager');
        pager.innerHTML = `
            ${prev ? `<a class="flex-1 bg-white rounded-lg shadow-card p-4 hover:shadow-card-hover" href="${prev.slug}.html"><div class="text-xs text-gray-400 mb-1">上一篇</div><div class="font-medium text-gray-800">${prev.cardTitle}</div></a>` : '<div class="flex-1"></div>'}
            ${next ? `<a class="flex-1 bg-white rounded-lg shadow-card p-4 hover:shadow-card-hover text-right" href="${next.slug}.html"><div class="text-xs text-gray-400 mb-1">下一篇</div><div class="font-medium text-gray-800">${next.cardTitle}</div></a>` : '<div class="flex-1"></div>'}
        `;
    }

    global.SeriesArticle = { boot };
})(window);
