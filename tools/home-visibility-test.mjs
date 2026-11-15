// DOM/CSS regression: homepage reading must not depend on animation startup.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Window } from 'happy-dom';
const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const html = read('index.html');
const ids = ['welcome', 'about', 'articles-section', 'contact'];
assert.doesNotMatch(html, /data-aos|aos@|AOS\.init/, 'homepage must not require AOS to reveal content');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
for (const motion of ['no-preference', 'reduce']) {
    for (const mode of ['no-js', 'failed-chrome', 'normal']) {
        const w = new Window({ url: 'https://mylog.test/', settings: {
            disableJavaScriptFileLoading: true, disableCSSFileLoading: true,
            device: { prefersReducedMotion: motion }
        }});
        const d = w.document;
        d.write(html.replace(/<script[\s\S]*?<\/script>/g, ''));
        const css = d.createElement('style');
        // Match the AOS fade-up failure mode too, should an old stylesheet persist.
        css.textContent = '[data-aos="fade-up"] { opacity: 0; transform: translate3d(0,100px,0); }\n' + read('css/style.css');
        d.head.append(css);
        assert.equal(w.matchMedia('(prefers-reduced-motion: reduce)').matches, motion === 'reduce');
        if (mode !== 'no-js') {
            w.tailwind = {};
            if (mode === 'normal') {
                w.eval(read('js/site-config.js'));
                w.eval(read('js/site-chrome.js'));
            }
            let errors = 0;
            for (const script of inline) {
                try { w.eval(script); } catch (error) {
                    assert.equal(mode, 'failed-chrome');
                    assert.match(error.message, /SeriesChrome/);
                    errors++;
                }
            }
            assert.equal(errors, mode === 'failed-chrome' ? 1 : 0);
        }
        for (const id of ids) {
            const section = d.getElementById(id);
            assert.ok(section.textContent.trim().length > 30, `${id}: static content retained`);
            const style = w.getComputedStyle(section);
            assert.notEqual(style.opacity, '0', `${mode}/${motion}/${id}: visible`);
            assert.notEqual(style.display, 'none');
            assert.notEqual(style.visibility, 'hidden');
            assert.ok(!style.transform || style.transform === 'none', 'no entrance displacement');
        }
        for (const href of ['rl/index.html', 'llm/index.html', 'robot-learn/index.html', 'robot-classic/index.html', 'english/index.html', 'game/index.html']) {
            assert.ok(d.querySelector(`main a[href="${href}"]`), `${href}: static navigation`);
        }
        assert.ok(d.querySelector('main a[href^="mailto:"]'), 'email link usable without copy script');
        if (mode === 'normal') assert.ok(d.getElementById('site-search-button'), 'shared navigation still mounts');
        await w.happyDOM.close();
    }
}
console.log('Homepage visibility: no JS, failed chrome, normal startup, reduced motion and static links passed.');
