#!/usr/bin/env node
'use strict';
// Source-derived box arithmetic, not a browser/CSS rendering substitute.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../css/doudizhu.css'), 'utf8');
const shared = fs.readFileSync(path.join(__dirname, '../css/game-view.css'), 'utf8');
assert.match(css, /--dd-card-width:\s*clamp\(76px, 6vw, 112px\)/);
assert.match(css, /@media \(max-width: 760px\)[\s\S]*?--dd-card-width: 68px/);
assert.match(css, /@media \(max-width: 520px\)[\s\S]*?--dd-card-width: 64px/);
assert.match(css, /@media \(max-width: 360px\)[\s\S]*?--dd-card-width: 60px/);
assert.match(css, /@media \(orientation: landscape\)[\s\S]*?--dd-card-width: 72px/);
assert.match(css, /\.dd-table \.dd-row \{[^}]*gap: 16px 7px/);
assert.match(css, /\.dd-table \.dd-row \{[^}]*gap: 16px 6px/);
assert.match(css, /transform: translateY\(-10px\)/);
assert.match(css, /outline: 2px[^}]*outline-offset: 1px/);
assert.ok(16 - 10 - 2 - 1 >= 3, 'Selected cards retain at least 3px between adjacent face outlines.');
assert.match(shared, /\.game-page \.game-view\.is-expanded\s*\{[^}]*overflow: auto/);
assert.match(css, /\.dd-table \.dd-seat \{[^}]*flex: 1 0 auto/);
assert.match(css, /\.dd-table \.dd-levels \{ grid-area: levels;[^}]*min-height: 66px;[^}]*overflow-y: hidden/); // Grid scrolling content must not collapse its row.
const results = [];
for (const [width, height] of [[320,568],[360,640],[375,667],[390,844],[414,896],[430,932],[520,800],[760,1024],[768,1024],[1024,768],[1440,900],[1920,1080],[568,320],[667,375],[740,360],[844,390],[932,430]]) {
    for (const expanded of [false, true]) {
        const shortLandscape = width > height && height <= 560;
        const card = shortLandscape ? 72 : width <= 360 ? 60 : width <= 520 ? 64 : width <= 760 ? 68 : Math.max(76, Math.min(width * .06, 112));
        const pagePadding = expanded ? 0 : Math.max(8, Math.min(width * .017, 32));
        const tablePadding = expanded ? width <= 520 ? 10 : 16 : width <= 520 ? 10 : width <= 760 ? 12 : 22;
        const profileAndGap = shortLandscape ? 0 : width > 760 ? 136 : 0;
        const gap = width <= 360 ? 5 : width <= 760 ? 6 : 7;
        const insideWidth = width - 2 * pagePadding - 2 - 2 * tablePadding;
        const handWidth = shortLandscape ? (insideWidth - 14) / 2 - 6 : insideWidth - profileAndGap - 4;
        const columns = Math.floor((handWidth + gap) / (card + gap));
        assert.ok(columns >= (shortLandscape ? 2 : 3), `${width}×${height} must retain readable wrapping columns`);
        for (const count of [17,20]) {
            const rows = shortLandscape ? 1 : Math.ceil(count / columns);
            const finalRow = shortLandscape ? Math.min(count, columns) : count - (rows - 1) * columns;
            assert.ok(columns * card + (columns - 1) * gap <= handWidth + .01);
            assert.ok(finalRow > 0 && finalRow <= columns);
            if (shortLandscape) {
                assert.ok(card * .42 > card * .38, 'Exposed strip preserves full corner width.');
                assert.ok(card * .62 > card * (.06 + .27 * 2), 'Joker strip preserves both full-size CJK title characters.');
                assert.match(css, /\.dd-row \.dd-joker \+ \.pcard \{ --dd-overlap-limit: -\.38/);
                assert.match(css, /overflow-x: auto; scrollbar-width: thin; touch-action: pan-x pan-y/);
            }
            results.push({ horizontalHandScroll: shortLandscape, viewport: `${width}x${height}`, expanded, cards: count, cardWidth: Number(card.toFixed(2)), columns, rows, handWidth: Number(handWidth.toFixed(2)) });
        }
    }
}
// The complete pip/ace/court region is centered on the whole card, not the
// remainder to the right of the index. Ten moves only its outer pips to the
// center column so both full-size two-digit corner labels have clearance.
assert.match(css, /\.dd-table \.pcard \.dd-corner b \{[^}]*letter-spacing: -\.04em; text-align: left/);
assert.match(css, /\.dd-table \.dd-pips \{[^}]*inset: 17% 24%/);
assert.match(css, /\.dd-table \.dd-pip \{[^}]*\* \.17\)/);
for (const selector of ['dd-ace', 'dd-court', 'dd-joker-mark']) {
    assert.match(css, new RegExp('\\.' + selector + ' \\{[^}]*left: 50%; top: 50%;[^}]*transform: translate\\(-50%, -50%\\)'));
}
const ui = fs.readFileSync(path.join(__dirname, '../js/doudizhu.js'), 'utf8');
const pips = JSON.parse('{' + ui.match(/var PIPS = \{([\s\S]*?)\n    \};/)[1].replace(/(\d+):/g, '"$1":') + '}');
const rankWidth = .27 * (2 * .557 - .04);
const rankRight = .04 + rankWidth;
const pipHalfWidth = .17 / 2;
const pipHalfHeight = .17 / 1.43 / 2;
for (const [rank, points] of Object.entries(pips)) {
    assert.equal(Math.min(...points.map(p => p[0])) + Math.max(...points.map(p => p[0])), 100);
    assert.equal(Math.min(...points.map(p => p[1])) + Math.max(...points.map(p => p[1])), 100);
    for (const [x, y] of points) {
        const left = .24 + .52 * x / 100 - pipHalfWidth;
        const right = left + .17;
        const top = .17 + .66 * y / 100 - pipHalfHeight;
        const bottom = top + .17 / 1.43;
        if (rank === '10') {
            assert.ok(left > rankRight || top > .04 + .31 / 1.43, '10 top-left corner clearance');
            assert.ok(right < 1 - rankRight || bottom < .96 - .31 / 1.43, '10 bottom-right corner clearance');
        } else {
            assert.ok(left > .04 + .27 * .78, 'Single-rank top-left clearance');
            assert.ok(right < .96 - .27 * .78, 'Single-rank bottom-right clearance');
        }
    }
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ kind: 'source-box-arithmetic-not-browser-layout', cases: results.length, results }, null, 2));
else console.log(results.length + ' source-derived hand-layout cases passed; centered artwork and corner clearance passed (not browser layout QA).');
