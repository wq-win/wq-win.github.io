'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const index = read('game/index.html'), nav = read('js/site-config.js');
for (const slug of ['water-sort','sum-ten','tile-frontier','hanzi-battle','yarn','parking','screws']) {
  assert(index.includes(`href="${slug}.html"`), `missing game card: ${slug}`);
  assert(nav.includes(`href: 'game/${slug}.html'`), `missing navigation: ${slug}`);
  const html = read(`game/${slug}.html`);
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    const link = match[1];
    if (/^(?:https?:|data:|mailto:)/.test(link)) continue;
    const target = link.startsWith('/') ? path.join(root, link) : path.resolve(root, 'game', link);
    assert(fs.existsSync(target), `${slug}: missing local asset ${link}`);
  }
}
for (const slug of ['water-sort','sum-ten']) {
  const html = read(`game/${slug}.html`);
  assert(html.includes('lang="zh-CN"'), `${slug}: language`);
  assert(html.includes('viewport'), `${slug}: responsive viewport`);
  assert(html.includes('data-game-fullscreen'), `${slug}: fullscreen control`);
  assert(!/<(?:script|link|img)[^>]+(?:src|href)="https?:/i.test(html), `${slug}: remote dependency`);
}
console.log('third-batch integration: both remaining entries, five previous game entries, local assets, language, viewport and fullscreen passed');
