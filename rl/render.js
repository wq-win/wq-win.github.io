(function () {
    const mermaidTheme = {
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "loose",
        flowchart: { htmlLabels: true, curve: "basis" }
    };

    function decodeHtml(str) {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = str;
        return textarea.value;
    }

    function protectMath(markdown) {
        const mathSlots = [];
        const codeSlots = [];
        let text = markdown.replace(/```[\s\S]*?```/g, (block) => {
            codeSlots.push(block);
            return `@@CODE${codeSlots.length - 1}@@`;
        });
        const stashMath = (match) => {
            mathSlots.push(match);
            return `@@MATH${mathSlots.length - 1}@@`;
        };
        text = text.replace(/\$\$[\s\S]+?\$\$/g, stashMath);
        text = text.replace(/\\\[[\s\S]+?\\\]/g, stashMath);
        text = text.replace(/\\\([\s\S]+?\\\)/g, stashMath);
        text = text.replace(/(^|[^$])\$([^$\n]+?)\$/g, (full, prefix, inner) => {
            mathSlots.push(`$${inner}$`);
            return `${prefix}@@MATH${mathSlots.length - 1}@@`;
        });
        text = text.replace(/@@CODE(\d+)@@/g, (_, index) => codeSlots[Number(index)]);
        return { text, mathSlots };
    }

    function restoreMath(html, mathSlots) {
        return html.replace(/@@MATH(\d+)@@/g, (_, index) => mathSlots[Number(index)]);
    }

    function rewriteMarkdownLinks(html) {
        return html.replace(/href="([^"]+)"/g, (full, href) => {
            if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) {
                return full;
            }
            const decoded = decodeURIComponent(href);
            const file = decoded.split("/").pop();
            if (file === "README.md") {
                return 'href="index.html"';
            }
            if (file && file.endsWith(".md")) {
                if (file.indexOf("00-") === 0) return 'href="00-timeline.html"';
                if (file.indexOf("61-") === 0) return 'href="61-epilogue.html"';
                return `href="${file.replace(/\.md$/, "")}.html"`;
            }
            return full;
        });
    }

    function hoistMermaid(html) {
        return html.replace(
            /<pre><code class="[^"]*language-mermaid[^"]*">([\s\S]*?)<\/code><\/pre>/g,
            (_, code) => `<div class="mermaid">${decodeHtml(code)}</div>`
        );
    }

    function renderMarkdown(markdown) {
        const { text, mathSlots } = protectMath(markdown);
        let html = marked.parse(text, { gfm: true, breaks: false });
        html = restoreMath(html, mathSlots);
        html = hoistMermaid(html);
        html = rewriteMarkdownLinks(html);
        return html;
    }

    function renderMath(root) {
        if (typeof renderMathInElement !== "function") return;
        renderMathInElement(root, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "\\[", right: "\\]", display: true },
                { left: "\\(", right: "\\)", display: false },
                { left: "$", right: "$", display: false }
            ],
            throwOnError: false,
            ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"]
        });
    }

    async function renderMermaid(root) {
        if (typeof mermaid === "undefined") return;
        mermaid.initialize(mermaidTheme);
        const nodes = root.querySelectorAll(".mermaid");
        if (!nodes.length) return;
        await mermaid.run({ nodes });
    }

    function findPost(slug) {
        return (window.RL_CATALOG.posts || []).find((post) => post.slug === slug);
    }

    function paperPosts() {
        return (window.RL_CATALOG.posts || []).filter((post) => post.kind === "paper");
    }

    function neighbors(slug) {
        const posts = window.RL_CATALOG.posts || [];
        const index = posts.findIndex((post) => post.slug === slug);
        return {
            prev: index > 0 ? posts[index - 1] : null,
            next: index >= 0 && index < posts.length - 1 ? posts[index + 1] : null
        };
    }

    function postHref(post) {
        const slug = post.slug || "";
        if (slug.indexOf("00-") === 0) return "00-timeline.html";
        if (slug.indexOf("61-") === 0) return "61-epilogue.html";
        return slug + ".html";
    }

    function pagerHtml(post) {
        const { prev, next } = neighbors(post.slug);
        const prevLink = prev
            ? `<a class="rl-pager-link" href="${postHref(prev)}"><span class="text-xs text-gray-400">上一篇</span><span>${prev.shortTitle}</span></a>`
            : `<span></span>`;
        const nextLink = next
            ? `<a class="rl-pager-link text-right" href="${postHref(next)}"><span class="text-xs text-gray-400">下一篇</span><span>${next.shortTitle}</span></a>`
            : `<span></span>`;
        return `<nav class="rl-pager">${prevLink}${nextLink}</nav>`;
    }

    window.RLRender = {
        renderMarkdown,
        renderMath,
        renderMermaid,
        findPost,
        paperPosts,
        neighbors,
        postHref,
        pagerHtml
    };
})();
