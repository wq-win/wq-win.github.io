/* Shared, CSS-only ambient backgrounds. No per-frame JavaScript or canvas. */
(function (global) {
    'use strict';
    if (global.SiteBackground) return;

    const root = document.documentElement;
    const reduced = global.matchMedia('(prefers-reduced-motion: reduce)');
    const modes = ['static', 'orbs', 'aurora', 'stars'];
    const keys = ['mylog-bg', 'mylog-bg-strength', 'mylog-bg-speed', 'mylog-bg-paused'];
    let state;
    let mounted = false;
    let pageHidden = false;

    function read(key) {
        try { return global.localStorage.getItem(key); } catch (_) { return null; }
    }

    function save(key, value) {
        try { global.localStorage.setItem(key, String(value)); } catch (_) { /* Keep the in-page choice. */ }
    }

    function number(value, fallback, min, max) {
        if (value === null || value === undefined || value === '') return fallback;
        const n = Number(value);
        return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
    }

    function readState() {
        let mode = read(keys[0]);
        // Keep an explicit static choice; the old moving light spots become A.
        if (mode === 'drift') {
            mode = 'orbs';
            save(keys[0], mode);
        }
        return {
            mode: modes.includes(mode) ? mode : 'orbs',
            strength: number(read(keys[1]), 45, 0, 100),
            speed: number(read(keys[2]), 1, 0.25, 2),
            paused: read(keys[3]) === 'true'
        };
    }

    function buildLayer() {
        let layer = document.getElementById('site-bg');
        if (!layer) {
            layer = document.createElement('div');
            layer.id = 'site-bg';
            layer.setAttribute('aria-hidden', 'true');
            document.body.insertBefore(layer, document.body.firstChild);
        }
        if (layer.dataset.ready) return;
        layer.dataset.ready = '1';
        layer.innerHTML = '<div class="site-bg-scene site-bg-static"></div>'
            + '<div class="site-bg-scene site-bg-orbs"><i class="site-bg-orb site-bg-orb-one"></i><i class="site-bg-orb site-bg-orb-two"></i><i class="site-bg-orb site-bg-orb-three"></i></div>'
            + '<div class="site-bg-scene site-bg-aurora"><i class="site-bg-ribbon site-bg-ribbon-one"></i><i class="site-bg-ribbon site-bg-ribbon-two"></i><i class="site-bg-ribbon site-bg-ribbon-three"></i></div>'
            + '<div class="site-bg-scene site-bg-stars"><div class="site-bg-star-wash"></div><div class="site-bg-star-field"></div></div>'
            + '<div class="site-bg-reading-shield"></div>';
        const field = layer.querySelector('.site-bg-star-field');
        const fragment = document.createDocumentFragment();
        // Fixed, bounded distribution in the margins. Half are hidden on small screens.
        for (let i = 0; i < 52; i += 1) {
            const star = document.createElement('i');
            star.className = 'site-bg-star';
            const x = (i * 17.71) % 24;
            star.style.left = (i % 2 ? 76 + x : x) + '%';
            star.style.top = ((i * 37.13 + 4) % 100) + '%';
            star.style.setProperty('--star-size', (1.4 + ((i * 7) % 4) * 0.55) + 'px');
            star.style.setProperty('--star-duration', (14 + i % 7) + 's');
            star.style.setProperty('--star-delay', -(i % 11) + 's');
            fragment.appendChild(star);
        }
        field.appendChild(fragment);
    }

    function sync() {
        if (!state) state = readState();
        const reason = state.mode === 'static' ? 'static'
            : reduced.matches ? 'reduced-motion'
            : (document.hidden || pageHidden) ? 'hidden'
            : state.paused ? 'paused'
            : state.strength === 0 ? 'zero-strength' : 'running';
        root.dataset.bg = state.mode;
        root.dataset.bgMotion = reason === 'running' ? 'running' : 'paused';
        root.dataset.bgReason = reason;
        // Even 100% remains restrained. The paper itself has an opaque surface.
        root.style.setProperty('--site-bg-opacity', String(state.strength * 0.0065));
        root.style.setProperty('--site-bg-time-scale', String(1 / state.speed));
        document.querySelectorAll('#look-panel [data-bg]').forEach((button) => {
            const selected = button.dataset.bg === state.mode;
            button.classList.toggle('is-on', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        const strength = document.getElementById('look-bg-strength');
        const speed = document.getElementById('look-bg-speed');
        const strengthValue = document.getElementById('look-bg-strength-value');
        const speedValue = document.getElementById('look-bg-speed-value');
        const pause = document.getElementById('look-bg-pause');
        const status = document.getElementById('look-bg-status');
        if (strength) {
            strength.disabled = false;
            strength.value = state.strength;
            strength.setAttribute('aria-valuetext', state.strength + '% 背景强度');
        }
        if (speed) {
            speed.disabled = state.mode === 'static';
            speed.value = state.speed;
            speed.setAttribute('aria-valuetext', state.speed.toFixed(2) + ' 倍背景速度');
        }
        if (strengthValue) strengthValue.textContent = state.strength + '%';
        if (speedValue) speedValue.textContent = state.speed.toFixed(2) + '×';
        if (pause) {
            pause.disabled = state.mode === 'static' || reduced.matches;
            pause.setAttribute('aria-pressed', String(state.paused));
            pause.setAttribute('aria-label', state.paused ? '继续背景动画' : '暂停背景动画');
            pause.textContent = state.paused ? '继续' : '暂停';
        }
        if (status) status.textContent = {
            static: '静态背景',
            'reduced-motion': '已跟随系统减少动态',
            hidden: '页面隐藏，已暂停',
            paused: '已暂停，画面保持',
            'zero-strength': '强度为 0，已暂停',
            running: '在页边缓慢流动'
        }[reason];
        return getState();
    }

    function setMode(mode) {
        if (!modes.includes(mode)) return;
        state.mode = mode;
        save(keys[0], mode);
        sync();
    }

    function onInput(event) {
        const input = event.target;
        if (input.id === 'look-bg-strength') {
            state.strength = number(input.value, 45, 0, 100);
            save(keys[1], state.strength);
        } else if (input.id === 'look-bg-speed') {
            state.speed = number(input.value, 1, 0.25, 2);
            save(keys[2], state.speed);
        } else return;
        sync();
    }

    function onClick(event) {
        const button = event.target.closest('#look-bg-pause');
        if (!button || button.disabled) return;
        state.paused = !state.paused;
        save(keys[3], state.paused);
        sync();
    }

    function onStorage(event) {
        if (event.key !== null && !keys.includes(event.key)) return;
        state = readState();
        sync();
    }

    function onPageHide() { pageHidden = true; sync(); }
    function onPageShow() { pageHidden = false; sync(); }
    function getState() { return Object.assign({}, state); }

    function init() {
        if (!document.body) return;
        if (!state) state = readState();
        buildLayer();
        if (!mounted) {
            mounted = true;
            document.addEventListener('input', onInput);
            document.addEventListener('click', onClick);
            document.addEventListener('visibilitychange', sync);
            global.addEventListener('storage', onStorage);
            global.addEventListener('pagehide', onPageHide);
            global.addEventListener('pageshow', onPageShow);
            if (reduced.addEventListener) reduced.addEventListener('change', sync);
            else reduced.addListener(sync);
        }
        sync();
    }

    function destroy() {
        document.removeEventListener('input', onInput);
        document.removeEventListener('click', onClick);
        document.removeEventListener('visibilitychange', sync);
        global.removeEventListener('storage', onStorage);
        global.removeEventListener('pagehide', onPageHide);
        global.removeEventListener('pageshow', onPageShow);
        if (reduced.removeEventListener) reduced.removeEventListener('change', sync);
        else reduced.removeListener(sync);
        const layer = document.getElementById('site-bg');
        if (layer) layer.remove();
        root.dataset.bgMotion = 'paused';
        mounted = false;
    }

    state = readState();
    global.SiteBackground = { init, sync, setMode, getState, destroy };
})(window);
