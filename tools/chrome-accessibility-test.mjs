import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let dependency = process.env.HAPPY_DOM_PATH || require.resolve('happy-dom');
if (fs.statSync(dependency).isDirectory()) dependency = path.join(dependency, 'lib/index.js');
const { Window } = await import(pathToFileURL(path.resolve(dependency)).href);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = fs.readFileSync(path.join(root, 'js/site-chrome.js'), 'utf8');
let checks = 0;
function equal(actual, expected, label) { assert.equal(actual, expected, label); checks++; }

for (const initial of ['light', 'dark']) {
    const w = new Window({ url: 'https://example.test/', settings: { disableJavaScriptFileLoading: true, disableCSSFileLoading: true } });
    w.localStorage.setItem('mylog-theme', initial);
    w.SiteBackground = { getState: () => ({mode: 'static'}), sync() {}, init() {} };
    w.document.write('<div id="site-header"></div><div id="site-footer"></div>');
    w.eval(script);
    w.SeriesChrome.mount({root: ''});
    const doc = w.document;
    const toggle = doc.getElementById('theme-toggle');
    const assertTheme = (dark) => {
        const label = dark ? '切换浅色模式' : '切换深色模式';
        equal(doc.documentElement.classList.contains('dark'), dark, 'theme applied');
        equal(toggle.getAttribute('aria-label'), label, 'theme name describes next action');
        equal(toggle.title, label, 'theme tooltip describes next action');
        equal(toggle.querySelector('i').className, dark ? 'fa fa-sun-o' : 'fa fa-moon-o', 'theme icon matches next action');
    };
    assertTheme(initial === 'dark');
    toggle.click(); assertTheme(initial !== 'dark');
    toggle.click(); assertTheme(initial === 'dark');
    const open = doc.getElementById('mobile-menu-button');
    const close = doc.getElementById('close-menu-button');
    const menu = doc.getElementById('mobile-menu');
    equal(open.getAttribute('aria-label'), '打开菜单', 'menu opener named');
    equal(close.getAttribute('aria-label'), '关闭菜单', 'menu closer named');
    equal(doc.getElementById('back-to-top').getAttribute('aria-label'), '返回顶部', 'back to top named');
    equal(open.getAttribute('aria-controls'), menu.id, 'opener controls menu');
    const assertMenu = (expanded) => {
        equal(menu.classList.contains('open'), expanded, 'menu visibility');
        equal(open.getAttribute('aria-expanded'), String(expanded), 'expanded state matches visibility');
    };
    assertMenu(false);
    open.click(); assertMenu(true);
    open.click(); assertMenu(true);
    close.click(); assertMenu(false);
    open.click(); assertMenu(true);
    const link = menu.querySelector('a');
    link.addEventListener('click', e => e.preventDefault());
    link.click(); assertMenu(false);
    await w.happyDOM.close();
}
const w = new Window({settings: {disableJavaScriptFileLoading: true, disableCSSFileLoading: true, disableJavaScriptEvaluation: true}});
w.document.write(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
equal(w.document.querySelector('#about a[href="https://github.com/wq-win"]').getAttribute('aria-label'), 'GitHub 主页', 'About GitHub named');
equal(w.document.querySelector('#about a[href^="mailto:"]').getAttribute('aria-label'), '发送邮件', 'About mail named');
await w.happyDOM.close();
console.log(`Chrome accessibility: ${checks} checks passed`);
