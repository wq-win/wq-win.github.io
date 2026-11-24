(function (root) {
    'use strict';
    // Explicit game events only: never intercept document clicks or mutate game state.
    const kinds = {
        tap: { hz: 420, ms: 8 }, undo: { hz: 320, ms: 8 },
        error: { hz: 180, ms: 18 }, success: { hz: 620, ms: 12 },
        win: { hz: 880, ms: [12, 65, 18] }
    };
    root.GameFeedback = { create(options = {}) {
        const key = options.key || 'mylog-game-feedback-v1';
        const AC = root.AudioContext || root.webkitAudioContext;
        let sound = false, vibration = false, audio, destroyed = false, last = -Infinity;
        let soundAvailable = !!AC, vibrationAvailable = typeof navigator.vibrate === 'function';
        const timers = new Map(), voices = new Set();
        const localOnly = {};
        const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
        function readPrefs(area) {
            try {
                const raw = area.getItem(key);
                if (raw === null) return {sound: false, vibration: false};
                const saved = JSON.parse(raw);
                if (!saved || typeof saved !== 'object' || Array.isArray(saved) ||
                    ['sound', 'vibration'].some(field => Object.hasOwn(saved, field) && typeof saved[field] !== 'boolean')) return null;
                return {sound: saved.sound === true, vibration: saved.vibration === true};
            } catch (_) { return null; }
        }
        function storageArea() { try { return root.localStorage; } catch (_) { return null; } }
        const initial = readPrefs(storageArea());
        if (initial) ({sound, vibration} = initial);
        const controls = document.createElement('div'); controls.className = 'game-feedback-controls';
        controls.setAttribute('role', 'group'); controls.setAttribute('aria-label', '游戏反馈设置');
        const soundButton = document.createElement('button'), vibrationButton = document.createElement('button');
        soundButton.type = vibrationButton.type = 'button';
        const note = document.createElement('span'); note.className = 'game-feedback-note'; note.setAttribute('role', 'status');
        controls.append(soundButton, vibrationButton, note);
        if (options.host) options.host.append(controls);
        function update() {
            soundButton.disabled = !soundAvailable; vibrationButton.disabled = !vibrationAvailable;
            soundButton.setAttribute('aria-pressed', String(sound && soundAvailable));
            vibrationButton.setAttribute('aria-pressed', String(vibration && vibrationAvailable));
            soundButton.textContent = !soundAvailable ? '音效不支持' : sound ? '音效：开' : '音效：关';
            vibrationButton.textContent = !vibrationAvailable ? '震动不支持' : vibration ? '震动：开' : '震动：关';
            note.textContent = !vibrationAvailable ? '当前浏览器不提供震动，画面反馈仍可用' : vibration && reduced() ? '减少动态效果已启用，暂停震动与动画' : '声音与震动可分别开启';
        }
        function stopSound() {
            voices.forEach(voice => { try { voice.stop(); } catch (_) {} }); voices.clear();
        }
        function vibrate(pattern) {
            // An available API can refuse an individual request; preserve the opt-in.
            if (vibrationAvailable) { try { navigator.vibrate(pattern); } catch (_) {} }
        }
        function stop() {
            stopSound();
            if (vibration) vibrate(0);
        }
        function applyPrefs(next) {
            if (sound && !next.sound) stopSound();
            if (vibration && !next.vibration) vibrate(0);
            ({sound, vibration} = next);
            update();
        }
        function syncPrefs(area) {
            const next = area && readPrefs(area);
            if (next) {
                delete localOnly.sound; delete localOnly.vibration;
                applyPrefs(next);
            }
        }
        function onStorage(event) {
            const area = storageArea();
            if (area && event.storageArea === area && (event.key === key || event.key === null)) syncPrefs(area);
        }
        function onPageShow(event) {
            if (event.persisted) syncPrefs(storageArea());
        }
        function toggle(field) {
            if (destroyed || !(field === 'sound' ? soundAvailable : vibrationAvailable)) return;
            // Honor the affordance that was shown, but never save the other field from a stale tab.
            const intent = !(field === 'sound' ? sound : vibration);
            const area = storageArea(), durable = readPrefs(area);
            const alreadyApplied = durable && durable[field] === intent;
            const next = {...(durable || {sound, vibration}), [field]: intent};
            let persisted = alreadyApplied;
            if (durable && !alreadyApplied) {
                try { area.setItem(key, JSON.stringify(next)); persisted = true; } catch (_) {}
            }
            if (persisted) delete localOnly[field];
            else localOnly[field] = intent;
            applyPrefs({...next, ...localOnly});
            if (!intent || alreadyApplied || document.hidden) return;
            if (field === 'sound') tone('tap');
            else if (!reduced()) vibrate(8);
        }
        function visual(kind, target) {
            if (!target || !target.classList || reduced()) return;
            const old = timers.get(target); if (old) clearTimeout(old);
            target.classList.remove('game-fx-tap','game-fx-undo','game-fx-error','game-fx-success','game-fx-win');
            void target.offsetWidth;
            target.classList.add('game-fx-' + kind);
            timers.set(target, setTimeout(() => { target.classList.remove('game-fx-' + kind); timers.delete(target); }, 520));
        }
        function tone(kind) {
            if (!sound || !soundAvailable) return;
            try {
                audio = audio || new AC();
                if (audio.state === 'suspended') { const result = audio.resume(); if (result && result.catch) result.catch(() => {}); }
                if (audio.state === 'closed') return;
                const osc = audio.createOscillator(), gain = audio.createGain(), now = audio.currentTime;
                osc.type = 'sine'; osc.frequency.setValueAtTime(kinds[kind].hz, now);
                if (kind === 'win') osc.frequency.exponentialRampToValueAtTime(1320, now + .15);
                gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.035, now + .012);
                gain.gain.exponentialRampToValueAtTime(.0001, now + .16);
                osc.connect(gain); gain.connect(audio.destination); voices.add(osc);
                osc.onended = () => { voices.delete(osc); osc.disconnect(); gain.disconnect(); };
                osc.start(now); osc.stop(now + .18);
            } catch (_) { soundAvailable = false; update(); }
        }
        function play(kind = 'tap', target) {
            if (destroyed || document.hidden || !Object.prototype.hasOwnProperty.call(kinds, kind)) return;
            visual(kind, target);
            const now = Date.now(); if (now - last < 60) return; last = now;
            tone(kind);
            if (vibration && !reduced()) vibrate(kinds[kind].ms);
        }
        soundButton.addEventListener('click', () => toggle('sound'));
        vibrationButton.addEventListener('click', () => toggle('vibration'));
        root.addEventListener('storage', onStorage);
        root.addEventListener('pageshow', onPageShow);
        function visibility() { if (document.hidden) stop(); }
        document.addEventListener('visibilitychange', visibility);
        update();
        return { play, controls, destroy() {
            if (destroyed) return; destroyed = true; stop(); document.removeEventListener('visibilitychange', visibility);
            root.removeEventListener('storage', onStorage); root.removeEventListener('pageshow', onPageShow);
            timers.forEach((timer, target) => { clearTimeout(timer); target.classList.remove('game-fx-tap','game-fx-undo','game-fx-error','game-fx-success','game-fx-win'); }); timers.clear(); controls.remove();
            if(audio && typeof audio.close==='function'){try { const result=audio.close();if(result&&result.catch)result.catch(()=>{}); }catch(_){}}
        } };
    } };
})(window);
