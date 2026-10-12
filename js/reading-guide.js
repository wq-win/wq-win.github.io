/* Shared, progressively enhanced article tools. Source text is never rewritten. */
(function (global) {
    'use strict';

    const instances = new WeakMap();
    const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    const escapePattern = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const list = (value) => Array.isArray(value) ? value : value ? [value] : [];
    const asciiWord = (ch) => Boolean(ch && /[A-Za-z0-9_]/.test(ch));

    // English names need word boundaries; Chinese names may occur in compounds.
    function boundaryMatches(text, index, name) {
        return !((asciiWord(name[0]) && asciiWord(text[index - 1])) ||
            (asciiWord(name[name.length - 1]) && asciiWord(text[index + name.length])));
    }

    function containsLiteral(text, value, caseSensitive) {
        const needle = caseSensitive ? String(value || '') : String(value || '').toLowerCase();
        if (!needle) return false;
        const haystack = caseSensitive ? String(text || '') : String(text || '').toLowerCase();
        let index = haystack.indexOf(needle);
        while (index !== -1) {
            if (boundaryMatches(haystack, index, needle)) return true;
            index = haystack.indexOf(needle, index + 1);
        }
        return false;
    }

    function normalizeTerms(terms, series, slug) {
        return (terms || []).filter((term) => term && term.id && (!list(term.series).length || list(term.series).includes(series))).map((term) => {
            const contexts = term.contexts || {};
            const context = contexts[series + ':' + slug] || contexts[slug];
            const next = Object.assign({}, term, typeof context === 'object' ? context : {});
            if (typeof context === 'string') next.purpose = context;
            next.zh = next.zh || next.term || next.id;
            next.en = next.en || (/[A-Za-z]/.test(next.term || '') ? next.term : '');
            next.names = [...new Set([next.term, ...list(next.aliases), ...list(next.names)].filter((name) => typeof name === 'string' && name.trim().length >= 2))];
            return next;
        });
    }

    function termMatcher(terms) {
        const names = new Map();
        terms.forEach((term) => term.names.forEach((name) => {
            const key = name.toLowerCase();
            if (!names.has(key)) names.set(key, term);
        }));
        const sorted = [...names.keys()].sort((a, b) => b.length - a.length);
        return { names, pattern: sorted.length ? new RegExp(sorted.map(escapePattern).join('|'), 'gi') : null };
    }

    // Context words, not isolated letters, decide whether a notation is relevant.
    function selectSymbols(entries, context) {
        const text = context.text || '';
        const heading = context.heading || '';
        const candidates = [];
        list(entries).forEach((entry) => {
            if (!entry || !(entry.symbol || entry.label)) return;
            const articles = list(entry.articles);
            if (articles.length && !articles.includes(context.slug)) return;
            if (list(entry.exclude).some((value) => containsLiteral(heading, value))) return;
            const sections = list(entry.sections);
            if (sections.length && !sections.some((value) => containsLiteral(heading, value))) return;
            const matches = list(entry.match).filter((value) => String(value).trim().length >= 2 && containsLiteral(text, value, true));
            if (!matches.length && !sections.length) return;
            candidates.push({ entry, score: (articles.length ? 100 : 0) + (sections.length ? 20 : 0) + matches.length });
        });
        const selected = new Map();
        candidates.forEach((candidate) => {
            const key = candidate.entry.symbol || candidate.entry.label;
            if (!selected.has(key) || selected.get(key).score < candidate.score) selected.set(key, candidate);
        });
        return [...selected.values()].map((candidate) => candidate.entry);
    }

    function symbolEntries(series, slug) {
        const data = (global.READING_SYMBOLS || {})[series] || [];
        return Array.isArray(data) ? data : list(data.entries).concat(list((data.articles || {})[slug]));
    }

    function mount(options) {
        options = options || {};
        const container = options.container || document.getElementById('article-body');
        if (!container || !container.parentElement) return null;
        if (instances.has(container)) {
            instances.get(container).refresh();
            return instances.get(container);
        }
        const article = container.closest('article') || container;
        const main = article.parentElement;
        const series = options.series || location.pathname.split('/').filter(Boolean)[0] || '';
        const slug = options.slug || (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
        const root = options.root === undefined ? '../' : options.root;
        const referenceURL = root + 'glossary.html?series=' + encodeURIComponent(series);
        const symbolsURL = root + 'glossary.html?view=symbols&series=' + encodeURIComponent(series);
        const guideURL = options.guideHref || '00-reading-guide.html';
        const glossaryURL = (term) => referenceURL + '#' + encodeURIComponent(term.id);
        const terms = normalizeTerms(global.GLOSSARY, series, slug);
        const termMap = new Map(terms.map((term) => [term.id, term]));
        const matcher = termMatcher(terms);
        const firsts = new Map();
        const counts = new Map();
        const cleanups = [];
        const listen = (element, type, listener, opts) => {
            element.addEventListener(type, listener, opts);
            cleanups.push(() => element.removeEventListener(type, listener, opts));
        };
        const wide = global.matchMedia('(min-width: 1280px)');
        const reducedMotion = () => global.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const suffix = document.getElementById('reading-term-dialog') ? '-' + (document.querySelectorAll('.rg-layout').length + 1) : '';
        const dialogID = 'reading-term-dialog' + suffix;
        const tocID = 'reading-toc' + suffix;
        const noteID = 'margin-notes' + suffix;
        const anchorID = (id) => 'term-' + id + suffix;
        const allHeadings = [...container.querySelectorAll('h2, h3')];
        const usedIDs = new Set([...document.querySelectorAll('[id]')].map((element) => element.id));
        allHeadings.forEach((heading) => {
            if (heading.id) return;
            const base = heading.textContent.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u3400-\u9fff-]/g, '') || 'section';
            let id = base;
            let number = 1;
            while (usedIDs.has(id)) id = base + '-' + (++number);
            heading.id = id;
            usedIDs.add(id);
        });

        // Build section context before adding any reading UI or term buttons.
        let parentHeading = '';
        const sections = [{ heading: null, title: '开篇', parent: '' }].concat(allHeadings.map((heading) => {
            if (heading.tagName === 'H2') parentHeading = heading.textContent;
            return { heading, title: heading.textContent, parent: parentHeading };
        }));
        sections.forEach((section, index) => {
            const range = document.createRange();
            if (section.heading) range.setStartBefore(section.heading);
            else range.setStart(container, 0);
            if (sections[index + 1]) range.setEndBefore(sections[index + 1].heading);
            else range.setEnd(container, container.childNodes.length);
            const fragment = range.cloneContents();
            fragment.querySelectorAll('.katex-html, .mermaid, script, style').forEach((node) => node.remove());
            section.text = section.parent + '\n' + fragment.textContent;
            section.symbols = selectSymbols(symbolEntries(series, slug), { slug, text: section.text, heading: section.parent + ' ' + section.title });
        });

        const layout = document.createElement('div');
        layout.className = 'rg-layout';
        layout.dataset.series = series;
        main.insertBefore(layout, article);
        article.classList.add('rg-article');
        container.classList.add('rg-paper');
        main.classList.add('rg-main');
        const left = document.createElement('aside');
        left.className = 'rg-left-rail';
        left.setAttribute('aria-label', '阅读工具');
        left.innerHTML = '<div class="rg-rail-intro"><span>阅读工具</span><a href="' + esc(guideURL) + '">系列阅读指南 ↗</a></div>' +
            '<details class="rg-disclosure rg-toc-disclosure"><summary>本页目录<span aria-hidden="true">⌄</span></summary><nav id="' + tocID + '" class="rg-toc" aria-label="本页目录"></nav></details>' +
            '<details class="rg-disclosure rg-symbols-disclosure"><summary>当前段落符号<span aria-hidden="true">⌄</span></summary><div class="rg-symbol-panel"></div></details>' +
            '<a class="rg-reference-link" href="' + esc(referenceURL) + '">中英术语与符号总表 ↗</a>';
        const right = document.createElement('aside');
        right.className = 'rg-right-rail';
        right.setAttribute('aria-label', '首次出现的术语旁注');
        right.innerHTML = '<div class="rg-notes-heading"><span>术语旁注 <small class="rg-note-count"></small></span><button type="button" class="rg-notes-toggle" aria-expanded="true" aria-controls="' + noteID + '">收起</button></div><div class="rg-notes" id="' + noteID + '"></div>';
        layout.append(left, article, right);
        const tocDisclosure = left.querySelector('.rg-toc-disclosure');
        const symbolsDisclosure = left.querySelector('.rg-symbols-disclosure');
        const toc = left.querySelector('.rg-toc');
        const symbolPanel = left.querySelector('.rg-symbol-panel');
        const notes = right.querySelector('.rg-notes');
        const notesToggle = right.querySelector('.rg-notes-toggle');
        toc.innerHTML = allHeadings.length ? allHeadings.map((heading) => '<a class="' + (heading.tagName === 'H3' ? 'rg-toc-child' : '') + '" href="#' + esc(heading.id) + '">' + esc(heading.textContent) + '</a>').join('') : '<p class="rg-empty">本篇没有分节标题。</p>';
        const tocLinks = [...toc.querySelectorAll('a')];

        const dialog = document.createElement('dialog');
        dialog.id = dialogID;
        dialog.className = 'rg-dialog';
        dialog.setAttribute('aria-labelledby', dialogID + '-title');
        dialog.innerHTML = '<div class="rg-dialog-top"><span>随文速查</span><button class="rg-dialog-close" type="button" aria-label="关闭速查">×</button></div><div class="rg-dialog-content"></div>';
        document.body.append(dialog);
        const dialogContent = dialog.querySelector('.rg-dialog-content');
        const dialogClose = dialog.querySelector('.rg-dialog-close');
        let lastTrigger = null;
        let highlightedNote = null;
        let activeSection = null;
        let activeIndex = -1;
        let layoutFrame = 0;
        let scrollFrame = 0;
        let destroyed = false;

        function showDialog(trigger, content) {
            if (lastTrigger && lastTrigger !== trigger) lastTrigger.setAttribute('aria-expanded', 'false');
            lastTrigger = trigger;
            trigger.setAttribute('aria-expanded', 'true');
            dialogContent.innerHTML = content;
            if (!dialog.open) {
                if (typeof dialog.showModal === 'function') dialog.showModal();
                else { dialog.setAttribute('open', ''); dialog.setAttribute('aria-modal', 'true'); }
            }
            dialogClose.focus();
        }
        function restoreFocus() {
            if (lastTrigger) {
                lastTrigger.setAttribute('aria-expanded', 'false');
                if (lastTrigger.isConnected) lastTrigger.focus({ preventScroll: true });
                else symbolsDisclosure.querySelector('summary').focus({ preventScroll: true });
            }
            lastTrigger = null;
        }
        function closeDialog() {
            if (typeof dialog.close === 'function') dialog.close();
            else { dialog.removeAttribute('open'); restoreFocus(); }
        }
        function openTerm(trigger) {
            const term = termMap.get(trigger.dataset.term);
            if (!term) return;
            if (highlightedNote) highlightedNote.classList.remove('is-highlighted');
            highlightedNote = [...notes.children].find((note) => note.dataset.term === term.id);
            if (highlightedNote) highlightedNote.classList.add('is-highlighted');
            const paragraph = (label, value, className) => value ? '<p class="' + (className || '') + '"><strong>' + label + '</strong>' + esc(value) + '</p>' : '';
            const first = firsts.get(term.id);
            showDialog(trigger, '<h2 id="' + dialogID + '-title">' + esc(term.zh) + '</h2><p class="rg-term-en" lang="en">' + esc(term.en) + '</p>' +
                paragraph('', term.definition) + paragraph('用来做什么：', term.purpose, 'rg-dialog-context') + paragraph('直观例子：', term.example) +
                '<div class="rg-dialog-links"><a href="' + esc(glossaryURL(term)) + '">概念详解与相关篇 ↗</a>' + (first ? '<button type="button" data-first="' + esc(term.id) + '">回到首次出现处</button>' : '') + '</div>');
        }
        function symbolMarkup(symbols) {
            if (!symbols.length) return '<p class="rg-empty">这一节没有匹配到专用符号。遇到记号时，请以正文定义为准。</p>';
            return '<dl class="rg-symbol-list">' + symbols.map((entry) => '<div><dt>' + esc(entry.symbol || entry.label) + '</dt><dd>' + esc(entry.meaning || entry.definition || '') +
                (entry.type ? '<span class="rg-symbol-type">' + esc(entry.type) + '</span>' : '') +
                (entry.note ? '<span class="rg-symbol-note">' + esc(entry.note) + '</span>' : '') + '</dd></div>').join('') + '</dl>';
        }
        function renderSymbols(section) {
            symbolPanel.innerHTML = '<p class="rg-symbol-context">' + esc(section.title) + '</p>' + symbolMarkup(section.symbols.slice(0, 6)) +
                (section.symbols.length > 6 ? '<p class="rg-more-symbols">还有 ' + (section.symbols.length - 6) + ' 个符号</p>' : '') +
                '<div class="rg-symbol-actions"><button type="button" class="rg-symbol-open" aria-haspopup="dialog" aria-controls="' + dialogID + '" aria-expanded="false">展开本节速查</button><a href="' + esc(symbolsURL) + '">总表 ↗</a></div>';
        }
        function goToFirst(id) {
            const trigger = firsts.get(id);
            if (!trigger) return;
            trigger.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
            trigger.focus({ preventScroll: true });
        }

        // Replace text nodes, never parse source text as HTML or touch math/code/links.
        if (matcher.pattern) {
            const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    if (!node.nodeValue || !node.nodeValue.trim() || !node.parentElement) return NodeFilter.FILTER_REJECT;
                    return node.parentElement.closest('a,button,pre,code,h1,h2,h3,h4,h5,h6,.katex,.mermaid,.math-source,.reading-math-source,math,svg,script,style,textarea,[data-no-reading],.glossary-term') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
                }
            });
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach((node) => {
                const text = node.nodeValue;
                matcher.pattern.lastIndex = 0;
                const matches = [...text.matchAll(matcher.pattern)].filter((match) => boundaryMatches(text, match.index, match[0]));
                if (!matches.length) return;
                const fragment = document.createDocumentFragment();
                let offset = 0;
                matches.forEach((match) => {
                    const term = matcher.names.get(match[0].toLowerCase());
                    fragment.append(document.createTextNode(text.slice(offset, match.index)));
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.className = 'rg-term-trigger term-trigger';
                    button.dataset.term = term.id;
                    button.textContent = match[0];
                    button.setAttribute('aria-haspopup', 'dialog');
                    button.setAttribute('aria-controls', dialogID);
                    button.setAttribute('aria-expanded', 'false');
                    button.setAttribute('aria-label', match[0] + '：查看' + term.zh + '解释');
                    counts.set(term.id, (counts.get(term.id) || 0) + 1);
                    if (!firsts.has(term.id)) {
                        if (!document.getElementById(anchorID(term.id))) button.id = anchorID(term.id);
                        button.classList.add('rg-first-term', 'first-term');
                        firsts.set(term.id, button);
                    }
                    fragment.append(button);
                    offset = match.index + match[0].length;
                });
                fragment.append(document.createTextNode(text.slice(offset)));
                node.replaceWith(fragment);
            });
        }
        let noteNumber = 0;
        firsts.forEach((trigger, id) => {
            const term = termMap.get(id);
            const note = document.createElement('details');
            note.className = 'rg-margin-note margin-note';
            note.id = 'note-' + id + suffix;
            note.dataset.term = id;
            note.open = true;
            note.innerHTML = '<summary><span class="rg-note-number">' + String(++noteNumber).padStart(2, '0') + '</span><span class="rg-note-name">' + esc(term.zh) + '<span class="rg-term-en" lang="en">' + esc(term.en) + '</span></span><span class="rg-note-chevron" aria-hidden="true">⌄</span></summary>' +
                '<p>' + esc(term.purpose || term.definition || '') + '</p><div class="rg-note-links"><a href="' + esc(glossaryURL(term)) + '">概念详解 ↗</a><button type="button" data-back="' + esc(id) + '">定位原句</button></div>';
            notes.append(note);
            listen(note, 'toggle', scheduleLayout);
        });
        right.querySelector('.rg-note-count').textContent = firsts.size + ' 个概念';
        if (!firsts.size) {
            notes.innerHTML = '<p class="rg-empty">正文尚未匹配到术语。可打开中英术语总表查阅。</p>';
            notesToggle.hidden = true;
        }

        function layoutNotes() {
            if (!wide.matches) {
                notes.style.height = '';
                right.style.paddingTop = '';
                return;
            }
            right.style.paddingTop = Math.max(0, container.getBoundingClientRect().top - layout.getBoundingClientRect().top) + 'px';
            const top = notes.getBoundingClientRect().top;
            let previousBottom = 12;
            [...notes.children].filter((note) => note.dataset.term).forEach((note) => {
                const trigger = firsts.get(note.dataset.term);
                const desired = trigger.getBoundingClientRect().top - top;
                const position = Math.max(previousBottom, desired);
                note.style.top = Math.round(position) + 'px';
                previousBottom = position + note.offsetHeight + 26;
            });
            notes.style.height = previousBottom + 'px';
        }
        function scheduleLayout() {
            if (layoutFrame || destroyed) return;
            layoutFrame = global.requestAnimationFrame(() => { layoutFrame = 0; layoutNotes(); });
        }
        function updateActive() {
            const line = Math.min(230, global.innerHeight * 0.3);
            let index = 0;
            for (let i = 1; i < sections.length; i += 1) {
                if (sections[i].heading.getBoundingClientRect().top <= line) index = i;
                else break;
            }
            if (index === activeIndex) return;
            activeIndex = index;
            activeSection = sections[index];
            tocLinks.forEach((link, i) => {
                const active = allHeadings[i] === activeSection.heading;
                link.classList.toggle('is-active', active);
                if (active) link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
            });
            renderSymbols(activeSection);
        }
        function setDisclosure() {
            tocDisclosure.open = wide.matches;
            symbolsDisclosure.open = wide.matches;
            scheduleLayout();
        }
        listen(container, 'click', (event) => {
            const trigger = event.target.closest('.rg-term-trigger');
            if (trigger && container.contains(trigger)) openTerm(trigger);
        });
        listen(notes, 'click', (event) => {
            const button = event.target.closest('[data-back]');
            if (button) goToFirst(button.dataset.back);
        });
        listen(symbolPanel, 'click', (event) => {
            const button = event.target.closest('.rg-symbol-open');
            if (!button) return;
            const section = activeSection || sections[0];
            showDialog(button, '<h2 id="' + dialogID + '-title">本节符号速查</h2><p class="rg-symbol-context">' + esc(section.title) + '</p>' + symbolMarkup(section.symbols) + '<p class="rg-symbol-boundary">同一个字母在不同文章或公式中可能含义不同；这里仅显示本节语境匹配的释义，以正文的局部定义为准。</p><a href="' + esc(symbolsURL) + '">查看本系列完整符号表 ↗</a>');
        });
        listen(dialogClose, 'click', closeDialog);
        listen(dialog, 'close', restoreFocus);
        listen(dialog, 'cancel', (event) => { event.preventDefault(); closeDialog(); });
        listen(dialog, 'click', (event) => {
            if (event.target.closest('[data-first]')) {
                const id = event.target.closest('[data-first]').dataset.first;
                if (lastTrigger) lastTrigger.setAttribute('aria-expanded', 'false');
                lastTrigger = firsts.get(id) || lastTrigger;
                closeDialog();
                goToFirst(id);
            } else if (event.target === dialog) {
                const rect = dialog.getBoundingClientRect();
                if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
            }
        });
        listen(dialog, 'keydown', (event) => {
            if (event.key === 'Escape') { event.preventDefault(); closeDialog(); return; }
            if (event.key !== 'Tab') return;
            const focusable = [...dialog.querySelectorAll('button:not([disabled]),a[href],[tabindex="0"]')];
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        });
        listen(toc, 'click', (event) => {
            if (event.target.closest('a') && !wide.matches) tocDisclosure.open = false;
        });
        listen(document, 'click', (event) => {
            if (wide.matches || left.contains(event.target) || dialog.contains(event.target)) return;
            tocDisclosure.open = false;
            symbolsDisclosure.open = false;
        });
        listen(left, 'keydown', (event) => {
            if (event.key !== 'Escape' || wide.matches) return;
            const disclosure = event.target.closest('details');
            if (disclosure && disclosure.open) { disclosure.open = false; disclosure.querySelector('summary').focus(); }
        });
        listen(tocDisclosure, 'toggle', () => { if (!wide.matches && tocDisclosure.open) symbolsDisclosure.open = false; });
        listen(symbolsDisclosure, 'toggle', () => { if (!wide.matches && symbolsDisclosure.open) tocDisclosure.open = false; });
        listen(notesToggle, 'click', () => {
            const hidden = layout.classList.toggle('rg-notes-hidden');
            notes.inert = hidden;
            notesToggle.setAttribute('aria-expanded', String(!hidden));
            notesToggle.textContent = hidden ? '展开' : '收起';
        });
        listen(global, 'scroll', () => {
            if (scrollFrame) return;
            scrollFrame = global.requestAnimationFrame(() => { scrollFrame = 0; updateActive(); });
        }, { passive: true });
        listen(global, 'resize', () => { scheduleLayout(); updateActive(); });
        if (typeof wide.addEventListener === 'function') listen(wide, 'change', setDisclosure);
        else if (wide.addListener) { wide.addListener(setDisclosure); cleanups.push(() => wide.removeListener(setDisclosure)); }
        if (typeof global.ResizeObserver === 'function') {
            const resizeObserver = new global.ResizeObserver(scheduleLayout);
            resizeObserver.observe(container);
            resizeObserver.observe(article);
            [...notes.children].forEach((note) => resizeObserver.observe(note));
            cleanups.push(() => resizeObserver.disconnect());
        }
        listen(container, 'load', scheduleLayout, true);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleLayout);
        setDisclosure();
        updateActive();
        scheduleLayout();
        const state = {
            conceptCount: firsts.size,
            occurrences: Object.fromEntries(counts),
            sections: sections.map((section) => ({ title: section.title, id: section.heading && section.heading.id, symbols: section.symbols.map((symbol) => symbol.id) })),
            refresh() { activeIndex = -1; updateActive(); scheduleLayout(); },
            getAlignment() { return [...notes.children].filter((note) => note.dataset.term).map((note) => ({ id: note.dataset.term, top: note.getBoundingClientRect().top, height: note.offsetHeight, anchor: firsts.get(note.dataset.term).getBoundingClientRect().top })); },
            destroy() {
                destroyed = true;
                cleanups.forEach((cleanup) => cleanup());
                global.cancelAnimationFrame(layoutFrame);
                global.cancelAnimationFrame(scrollFrame);
                if (dialog.open) closeDialog();
                dialog.remove();
                container.querySelectorAll('.rg-term-trigger').forEach((trigger) => trigger.replaceWith(document.createTextNode(trigger.textContent)));
                main.insertBefore(article, layout);
                layout.remove();
                article.classList.remove('rg-article');
                container.classList.remove('rg-paper');
                main.classList.remove('rg-main');
                instances.delete(container);
            }
        };
        instances.set(container, state);
        global.__readingQA = state;
        if (location.hash.indexOf('#term-') === 0) {
            global.requestAnimationFrame(() => {
                let id;
                try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
                const target = document.getElementById(id);
                if (target && container.contains(target)) target.scrollIntoView({ block: 'center' });
            });
        }
        return state;
    }

    global.ReadingGuide = { mount, selectSymbols, normalizeTerms, containsLiteral };
})(window);
