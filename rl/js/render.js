(function (global) {
    const MATH_TOKEN = (index) => `@@MATH${index}@@`;

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function extractMath(markdown) {
        const blocks = [];
        const stash = (match) => {
            const token = MATH_TOKEN(blocks.length);
            blocks.push(match);
            return token;
        };

        let next = markdown.replace(/\$\$[\s\S]+?\$\$/g, stash);
        next = next.replace(/\\\[[\s\S]+?\\\]/g, stash);
        next = next.replace(/\\\([\s\S]+?\\\)/g, stash);
        next = next.replace(/\$[^$\n]+\$/g, stash);
        return { markdown: next, blocks };
    }

    function restoreMath(html, blocks) {
        return html.replace(/@@MATH(\d+)@@/g, (_, index) => blocks[Number(index)] || '');
    }

    function rewriteMarkdownLinks(markdown, slugMap) {
        return markdown.replace(/\]\(([^)\s]+?)\.md\)/g, (full, file) => {
            const name = file.split('/').pop();
            if (name === 'README') {
                return '](index.html)';
            }
            const slug = (slugMap && slugMap[name]) || name.replace(/\.md$/, '');
            return `](${slug}.html)`;
        });
    }

    function createRenderer() {
        const renderer = new marked.Renderer();
        const originalCode = renderer.code.bind(renderer);

        renderer.code = function (code, infostring, escaped) {
            const isToken = code && typeof code === 'object' && !Array.isArray(code);
            const text = isToken ? (code.text || '') : String(code || '');
            const lang = (isToken ? code.lang : infostring) || '';

            if (String(lang).trim() === 'mermaid') {
                return `<div class="mermaid">${text}</div>`;
            }

            if (isToken) {
                return originalCode(code);
            }
            return originalCode(code, infostring, escaped);
        };

        return renderer;
    }

    function renderMarkdown(markdown, options) {
        const slugMap = (options && options.slugMap) || (global.RL_SLUG_MAP || {});
        const prepared = rewriteMarkdownLinks(markdown, slugMap);
        const extracted = extractMath(prepared);

        marked.setOptions({
            gfm: true,
            breaks: false,
            renderer: createRenderer()
        });

        const html = restoreMath(marked.parse(extracted.markdown), extracted.blocks);
        return html;
    }

    function renderMath(container) {
        if (typeof renderMathInElement !== 'function') {
            return;
        }
        renderMathInElement(container, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\[', right: '\\]', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false }
            ],
            throwOnError: false
        });
    }

    function renderMermaid() {
        if (!global.mermaid) {
            return;
        }
        global.mermaid.run({ querySelector: '.mermaid' });
    }

    function mountMarkdown(container, markdown, options) {
        container.innerHTML = renderMarkdown(markdown, options);
        renderMath(container);
        renderMermaid();
    }

    global.RLRender = {
        escapeHtml,
        renderMarkdown,
        mountMarkdown,
        renderMath,
        renderMermaid
    };
})(window);
