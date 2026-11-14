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
        const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
        try { const saved = JSON.parse(localStorage.getItem(key) || '{}'); sound = saved.sound === true; vibration = saved.vibration === true; } catch (_) {}
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
        function save() { try { localStorage.setItem(key, JSON.stringify({sound, vibration})); } catch (_) {} }
        function stop() {
            voices.forEach(voice => { try { voice.stop(); } catch (_) {} }); voices.clear();
            if (vibrationAvailable && vibration) { try { navigator.vibrate(0); } catch (_) {} }
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
            if (vibration && vibrationAvailable && !reduced()) {
                try { if (navigator.vibrate(kinds[kind].ms) === false) { vibrationAvailable = false; update(); } }
                catch (_) { vibrationAvailable = false; update(); }
            }
        }
        soundButton.addEventListener('click', () => { if (!soundAvailable) return; sound = !sound; save(); update(); if (sound) { last=-Infinity; play('tap'); } else stop(); });
        vibrationButton.addEventListener('click', () => { if (!vibrationAvailable) return; vibration = !vibration; save(); update(); if (vibration && !reduced()) { try { if(navigator.vibrate(8)===false){vibrationAvailable=false;update();} } catch(_){vibrationAvailable=false;update();} } else stop(); });
        function visibility() { if (document.hidden) stop(); }
        document.addEventListener('visibilitychange', visibility);
        update();
        return { play, controls, destroy() {
            if (destroyed) return; destroyed = true; stop(); document.removeEventListener('visibilitychange', visibility);
            timers.forEach((timer, target) => { clearTimeout(timer); target.classList.remove('game-fx-tap','game-fx-undo','game-fx-error','game-fx-success','game-fx-win'); }); timers.clear(); controls.remove();
            if(audio && typeof audio.close==='function'){try { const result=audio.close();if(result&&result.catch)result.catch(()=>{}); }catch(_){}}
        } };
    } };
})(window);
