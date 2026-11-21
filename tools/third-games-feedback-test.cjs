'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../game/js/third-games-feedback.js'), 'utf8');
const key = 'cozy-third-audio-v1';
const values = new Map(), storage = {
    getItem: k => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v)
};
function boot(options = {}) {
    let sounds = 0;
    const events = new Map();
    const window = {
        addEventListener: (type, fn) => events.set(type, fn),
        AudioContext: class {
            get currentTime() { return 0; }
            createOscillator() { return { frequency: {}, connect() {}, start() { sounds++; }, stop() {} }; }
            createGain() { return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
        }
    };
    const localStorage = options.storage || storage;
    window.localStorage = localStorage;
    const document = { createElement: () => ({
        attributes: {}, setAttribute(k, v) { this.attributes[k] = v; },
        addEventListener(type, fn) { this[type] = fn; }
    }) };
    vm.runInNewContext(source, {window, localStorage, document});
    const attach = () => { let result; window.CozyThirdFeedback.attach({append: b => { result = b; }}); return result; };
    return { attach, button: attach(), dispatched(type, props = {}) { events.get(type)?.(props); },
        get sounds() { return sounds; }, tone: () => window.CozyThirdFeedback.tone('match') };
}
const expect = (button, enabled) => {
    assert.equal(button.attributes['aria-pressed'], String(enabled));
    assert.equal(button.textContent, enabled ? '音效：开' : '音效：关');
};
const a = boot(), b = boot(), bSecondButton = b.attach();
expect(a.button, false);
a.tone(); assert.equal(a.sounds, 0);
a.button.click(); assert.equal(a.sounds, 2);
b.dispatched('storage', {key, storageArea:storage});
expect(b.button, true); expect(bSecondButton, true);
assert.equal(b.sounds,0,'remote opt-in updates UI without playing a preview tone');
b.tone(); assert.equal(b.sounds,2);
storage.setItem(key, 'off');
b.dispatched('storage', {key:'unrelated-game', storageArea:storage});
b.dispatched('storage', {key, storageArea:{getItem:()=> 'off'}});
expect(b.button, true);
b.dispatched('storage', {key, storageArea:storage});
expect(b.button, false); expect(bSecondButton, false);
b.tone(); assert.equal(b.sounds,2,'remote mute suppresses subsequent gameplay sounds');
assert.equal(a.sounds,2);
storage.setItem(key, 'on');
b.dispatched('pageshow', {persisted:true});
expect(b.button, true); assert.equal(b.sounds,2,'BFCache restore does not play sound');
expect(boot().button, true); // Reload gives a new helper the current preference.
values.clear();
b.dispatched('storage', {key:null, storageArea:storage});
expect(b.button, false);
const fails = () => { throw new Error('denied'); };
const denied = boot({storage:{getItem:fails, setItem:fails}});
expect(denied.button,false);
denied.button.click(); expect(denied.button,true);
denied.dispatched('pageshow', {persisted:true}); expect(denied.button,true);
const readOnly = boot({storage:{getItem:()=>null, setItem:fails}});
readOnly.button.click();
readOnly.dispatched('pageshow', {persisted:true}); expect(readOnly.button,true);
console.log('Shared feedback: cross-tab opt-in/mute, silent refresh, event filters, clear, reload/BFCache and unavailable storage passed (modeled).');
