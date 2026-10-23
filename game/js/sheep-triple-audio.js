(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SheepTripleAudio = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  // Original “Meadow Bounce”: a 16-bar, 124 BPM pentatonic hook with a
  // answering phrase, plucked accompaniment, round bass and soft shaker.
  // Everything is synthesized locally. There are no recordings or requests.
  const BPM = 124, EIGHTH = 60 / BPM / 2, STEPS = 128;
  const MELODY = [
    [76, 79, 81, 0, 79, 76, 74, 0],
    [76, 79, 81, 79, 76, 0, 72, 0],
    [74, 76, 79, 0, 76, 74, 72, 0],
    [74, 0, 76, 74, 71, 0, 74, 0],
    [76, 79, 81, 0, 79, 76, 74, 0],
    [76, 79, 84, 81, 79, 0, 76, 0],
    [77, 0, 76, 74, 76, 79, 74, 0],
    [76, 74, 72, 0, 0, 0, 74, 0],
    [76, 79, 81, 0, 79, 76, 74, 0],
    [76, 79, 81, 79, 76, 0, 72, 0],
    [74, 76, 79, 0, 81, 79, 76, 0],
    [74, 0, 76, 74, 71, 0, 74, 0],
    [76, 79, 81, 0, 84, 81, 79, 0],
    [76, 79, 84, 81, 79, 0, 76, 0],
    [77, 76, 74, 0, 76, 74, 71, 0],
    [72, 0, 0, 0, 0, 0, 74, 0]
  ];
  const CHORDS = [
    [48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 59, 62, 67],
    [48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 59, 62, 67]
  ];
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

  function create(options) {
    options = options || {};
    // Dependencies are injectable so the lifecycle can be tested without sound.
    const Context = Object.prototype.hasOwnProperty.call(options, 'AudioContext')
      ? options.AudioContext : (root.AudioContext || root.webkitAudioContext);
    const doc = options.document || root.document;
    const every = options.setInterval || root.setInterval.bind(root);
    const cancel = options.clearInterval || root.clearInterval.bind(root);
    const onChange = typeof options.onChange === 'function' ? options.onChange : function () {};
    let context = null, master = null, noise = null, timer = null;
    let enabled = false, playing = false, destroyed = false, volume = 0.28;
    let status = Context ? 'off' : 'unavailable', error = '', revision = 0;
    let step = 0, nextTime = 0;
    const voices = new Set();

    function getState() {
      return { supported: !!Context, enabled, playing, volume, status, error };
    }
    function notify() {
      // A presentation callback must not leave audio running without controls.
      try { onChange(getState()); } catch (_) { /* Keep the audio lifecycle intact. */ }
    }
    function wanted() { return enabled && !destroyed && !(doc && doc.hidden); }
    function stopScheduling() {
      if (timer !== null) { cancel(timer); timer = null; }
      if (master && context) {
        master.gain.cancelScheduledValues(context.currentTime);
        master.gain.setValueAtTime(0, context.currentTime);
      }
      for (const voice of Array.from(voices)) voice.stop();
      playing = false;
    }
    function quietSuspend() {
      if (!context || context.state === 'closed' || context.state === 'suspended') return Promise.resolve();
      try { return Promise.resolve(context.suspend()).catch(function () {}); }
      catch (_) { return Promise.resolve(); }
    }
    function fail() {
      revision++;
      enabled = false;
      stopScheduling();
      status = 'error';
      error = '音乐未能启动，请再点一次重试。';
      quietSuspend();
      notify();
      return getState();
    }
    function track(source, nodes, when, duration) {
      let ended = false;
      const voice = {
        stop: function () {
          if (ended) return;
          try { source.stop(context.currentTime); } catch (_) { /* Already stopped. */ }
          cleanup();
        }
      };
      function cleanup() {
        if (ended) return;
        ended = true;
        voices.delete(voice);
        source.onended = null;
        for (const node of [source].concat(nodes)) {
          try { node.disconnect(); } catch (_) { /* Already disconnected. */ }
        }
      }
      source.onended = cleanup;
      voices.add(voice);
      try { source.start(when); source.stop(when + duration + 0.015); }
      catch (err) { voice.stop(); throw err; }
    }
    function envelope(when, duration, peak) {
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(peak, when + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      gain.gain.setValueAtTime(0, when + duration + 0.01);
      gain.connect(master);
      return gain;
    }
    function tone(midi, when, duration, peak, type) {
      const oscillator = context.createOscillator();
      oscillator.type = type || 'sine';
      oscillator.frequency.setValueAtTime(hz(midi), when);
      const gain = envelope(when, duration, peak);
      oscillator.connect(gain);
      track(oscillator, [gain], when, duration);
    }
    function kick(when) {
      const oscillator = context.createOscillator();
      oscillator.frequency.setValueAtTime(115, when);
      oscillator.frequency.exponentialRampToValueAtTime(44, when + 0.11);
      const gain = envelope(when, 0.15, 0.16);
      oscillator.connect(gain);
      track(oscillator, [gain], when, 0.15);
    }
    function shaker(when, accent) {
      const source = context.createBufferSource(), filter = context.createBiquadFilter();
      source.buffer = noise;
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(6500, when);
      const gain = envelope(when, 0.055, accent ? 0.075 : 0.035);
      source.connect(filter); filter.connect(gain);
      track(source, [filter, gain], when, 0.06);
    }
    function schedule(index, when) {
      const bar = Math.floor(index / 8), beat = index % 8;
      const chord = CHORDS[bar % 8], note = MELODY[bar][beat];
      if (note) {
        tone(note, when, EIGHTH * 1.35, 0.22, 'triangle');
        tone(note + 12, when, EIGHTH * 0.6, 0.028);
      }
      if (beat === 0 || beat === 4) tone(chord[0], when, EIGHTH * 1.75, 0.24);
      if (beat === 3 || beat === 7) tone(chord[0] + 7, when, EIGHTH * 0.8, 0.12);
      if (beat % 2 === 1) tone(chord[1 + (beat >> 1) % 3], when, EIGHTH, 0.065, 'triangle');
      if (beat === 0 || beat === 4) kick(when);
      shaker(when, beat === 2 || beat === 6);
    }
    function tick() {
      if (!wanted() || !context || context.state !== 'running') return;
      // Recover from a throttled/busy tab without bursting through missed notes.
      if (nextTime < context.currentTime - 0.05) nextTime = context.currentTime + 0.025;
      try {
        while (nextTime < context.currentTime + 0.12) {
          schedule(step, nextTime);
          step = (step + 1) % STEPS;
          nextTime += EIGHTH;
        }
      } catch (_) { fail(); }
    }
    function begin() {
      if (timer !== null || !wanted() || context.state !== 'running') return;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(0, context.currentTime);
      master.gain.linearRampToValueAtTime(volume * 0.65, context.currentTime + 0.035);
      step = 0; nextTime = context.currentTime + 0.04;
      playing = true; status = 'playing'; error = '';
      timer = every(tick, 25);
      tick();
      notify();
    }
    function contextChanged() {
      if (destroyed) return;
      if (context.state === 'closed') { fail(); return; }
      if (context.state !== 'running') {
        stopScheduling();
        if (enabled) { status = 'paused'; notify(); }
      } else if (!wanted()) {
        stopScheduling(); quietSuspend();
      } else begin();
    }
    function prepare() {
      if (context && context.state !== 'closed') return;
      if (context && context.removeEventListener) context.removeEventListener('statechange', contextChanged);
      try {
        context = new Context();
        master = context.createGain();
        master.gain.setValueAtTime(0, context.currentTime);
        master.connect(context.destination);
        noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.08), context.sampleRate);
        const samples = noise.getChannelData(0);
        let seed = 173;
        for (let i = 0; i < samples.length; i++) {
          seed = (seed * 16807) % 2147483647;
          samples[i] = (seed / 2147483647) * 2 - 1;
        }
        if (context.addEventListener) context.addEventListener('statechange', contextChanged);
      } catch (err) {
        if (master) { try { master.disconnect(); } catch (_) {} }
        if (context) { try { Promise.resolve(context.close()).catch(function () {}); } catch (_) {} }
        context = null; master = null; noise = null;
        throw err;
      }
    }
    function reconcile() {
      const token = ++revision;
      if (!wanted()) {
        stopScheduling();
        status = enabled ? 'paused' : (Context ? 'off' : 'unavailable');
        notify();
        return quietSuspend().then(getState);
      }
      status = 'starting'; error = ''; notify();
      let resumed;
      try {
        prepare();
        // Called synchronously from toggle, preserving the browser's user gesture.
        resumed = context.resume();
      } catch (_) { return Promise.resolve(fail()); }
      return Promise.resolve(resumed).then(function () {
        if (token !== revision || destroyed) return getState();
        if (!wanted()) return getState();
        if (context.state !== 'running') return fail();
        begin();
        return getState();
      }, function () {
        if (token !== revision || destroyed) return getState();
        return fail();
      });
    }
    function visibilityChanged() { if (!destroyed && enabled) reconcile(); }
    if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', visibilityChanged);

    return {
      getState,
      toggle: function () {
        if (destroyed || !Context) return Promise.resolve(getState());
        enabled = !enabled;
        return reconcile();
      },
      setVolume: function (value) {
        if (destroyed || !Number.isFinite(Number(value))) return getState();
        volume = Math.max(0, Math.min(1, Number(value)));
        if (master && playing) {
          master.gain.cancelScheduledValues(context.currentTime);
          master.gain.setValueAtTime(master.gain.value, context.currentTime);
          master.gain.linearRampToValueAtTime(volume * 0.65, context.currentTime + 0.03);
        }
        notify();
        return getState();
      },
      destroy: function () {
        if (destroyed) return Promise.resolve(getState());
        destroyed = true; enabled = false; revision++;
        stopScheduling(); status = 'destroyed';
        if (doc && doc.removeEventListener) doc.removeEventListener('visibilitychange', visibilityChanged);
        if (context && context.removeEventListener) context.removeEventListener('statechange', contextChanged);
        if (master) master.disconnect();
        noise = null;
        notify();
        try { return Promise.resolve(context && context.close()).then(getState, getState); }
        catch (_) { return Promise.resolve(getState()); }
      }
    };
  }
  return { create };
});
