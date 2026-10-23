'use strict';
const assert = require('node:assert/strict');
const Audio = require('../game/js/sheep-triple-audio.js');

class Events {
  constructor() { this.listeners = new Map(); }
  addEventListener(name, fn) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(fn);
  }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name) { for (const fn of this.listeners.get(name) || []) fn(); }
}
class Param {
  constructor() { this.value = 0; }
  setValueAtTime(v) { assert(Number.isFinite(v)); this.value = v; }
  linearRampToValueAtTime(v) { this.setValueAtTime(v); }
  exponentialRampToValueAtTime(v) { assert(v > 0); this.setValueAtTime(v); }
  cancelScheduledValues() {}
}
class Node {
  constructor(context) { this.context = context; this.gain = new Param(); this.frequency = new Param(); }
  connect() { this.connected = true; }
  disconnect() { this.connected = false; }
}
class Source extends Node {
  start(when) {
    assert(when >= this.context.currentTime, 'no sound scheduled in the past');
    this.when = when; this.context.sources.add(this); this.context.starts++;
  }
  stop(when) {
    this.end = when;
    if (when <= this.context.currentTime) this.finish();
  }
  finish() { this.context.sources.delete(this); if (this.onended) this.onended(); }
}
class FakeContext extends Events {
  constructor() {
    super(); this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 22050;
    this.destination = {}; this.sources = new Set(); this.starts = 0;
    FakeContext.instances.push(this);
  }
  createGain() { const node = new Node(this); if (!this.master) this.master = node; return node; }
  createOscillator() { return new Source(this); }
  createBufferSource() { return new Source(this); }
  createBiquadFilter() { return new Node(this); }
  createBuffer(channels, frames) { return { getChannelData() { return new Float32Array(frames); } }; }
  change(state) { this.state = state; this.emit('statechange'); }
  resume() {
    this.resumes = (this.resumes || 0) + 1;
    if (this.rejectResume) return Promise.reject(new Error('gesture denied'));
    this.change('running');
    if (this.deferResume) return new Promise(resolve => { this.resolveResume = resolve; });
    return Promise.resolve();
  }
  suspend() { this.suspends = (this.suspends || 0) + 1; this.change('suspended'); return Promise.resolve(); }
  close() { this.closes = (this.closes || 0) + 1; this.change('closed'); return Promise.resolve(); }
  advance(seconds) {
    this.currentTime += seconds;
    for (const source of Array.from(this.sources)) if (source.end <= this.currentTime) source.finish();
  }
}
FakeContext.instances = [];
function setup(extra) {
  const doc = new Events(), timers = new Map(), changes = []; let id = 0;
  doc.hidden = false;
  const audio = Audio.create(Object.assign({
    AudioContext: FakeContext, document: doc, onChange: state => changes.push(state),
    setInterval(fn) { timers.set(++id, fn); return id; },
    clearInterval(handle) { timers.delete(handle); }
  }, extra));
  return { audio, doc, timers, changes, pulse() { for (const fn of Array.from(timers.values())) fn(); } };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

(async function () {
  const env = setup(), { audio, doc, timers } = env;
  assert.equal(FakeContext.instances.length, 0, 'no context before an explicit toggle');
  assert.deepEqual(audio.getState(), {
    supported: true, enabled: false, playing: false, volume: 0.28, status: 'off', error: ''
  });
  doc.emit('visibilitychange');
  audio.setVolume(0.4);
  assert.equal(FakeContext.instances.length, 0, 'volume and visibility cannot opt in');
  assert.equal(timers.size, 0);
  await audio.toggle();
  const context = FakeContext.instances[0];
  assert.equal(audio.getState().status, 'playing');
  assert.equal(timers.size, 1); assert(context.sources.size > 0);
  assert.equal(context.master.gain.value, 0.4 * 0.65);

  // Exercise more than two complete 16-bar loops; ended voices stay bounded.
  let maxVoices = 0;
  for (let n = 0; n < 3000; n++) {
    context.advance(0.025); env.pulse(); maxVoices = Math.max(maxVoices, context.sources.size);
  }
  assert(maxVoices < 20, `bounded polyphony: ${maxVoices}`);
  assert(context.starts > 1000, 'the melody continues looping');
  assert.equal(timers.size, 1);
  const before = context.starts;
  context.advance(60); env.pulse();
  assert(context.starts - before < 12, 'long stalls do not burst through missed notes');

  audio.setVolume(4); assert.equal(audio.getState().volume, 1);
  audio.setVolume(-2); assert.equal(audio.getState().volume, 0);
  audio.setVolume(NaN); assert.equal(audio.getState().volume, 0);
  assert.equal(context.master.gain.value, 0);
  audio.setVolume(0.28);
  doc.hidden = true; doc.emit('visibilitychange'); await settle();
  assert.equal(audio.getState().status, 'paused'); assert.equal(audio.getState().enabled, true);
  assert.equal(context.state, 'suspended'); assert.equal(timers.size, 0); assert.equal(context.sources.size, 0);
  doc.hidden = false; doc.emit('visibilitychange'); await settle();
  assert.equal(audio.getState().status, 'playing'); assert.equal(timers.size, 1);
  assert.equal(FakeContext.instances.length, 1, 'visibility reuses the same context');
  await audio.toggle();
  doc.hidden = true; doc.emit('visibilitychange'); doc.hidden = false; doc.emit('visibilitychange'); await settle();
  assert.equal(audio.getState().status, 'off'); assert.equal(timers.size, 0); assert.equal(context.sources.size, 0);

  // Every later toggle reuses one context and creates at most one timer.
  for (let n = 0; n < 30; n++) {
    await audio.toggle(); assert.equal(timers.size, 1);
    await audio.toggle(); assert.equal(timers.size, 0); assert.equal(context.sources.size, 0);
  }
  context.deferResume = true;
  const pending = audio.toggle();
  await audio.toggle();
  context.resolveResume(); await pending;
  assert.equal(audio.getState().enabled, false); assert.equal(timers.size, 0);
  context.deferResume = false;
  await audio.toggle();
  context.change('interrupted');
  assert.equal(audio.getState().status, 'paused'); assert.equal(timers.size, 0);
  assert.equal(context.sources.size, 0, 'OS interruptions release the scheduled voices');
  context.change('running'); await settle();
  assert.equal(audio.getState().status, 'playing');
  await audio.destroy();
  assert.equal(audio.getState().status, 'destroyed'); assert.equal(context.state, 'closed');
  assert.equal(timers.size, 0); assert.equal(context.sources.size, 0);
  assert.equal(doc.listeners.get('visibilitychange').size, 0);
  await audio.toggle(); await audio.destroy();
  assert.equal(context.closes, 1, 'destroy is idempotent');

  const denied = setup();
  await denied.audio.toggle(); await denied.audio.toggle();
  const deniedContext = FakeContext.instances.at(-1); deniedContext.rejectResume = true;
  await denied.audio.toggle();
  assert.equal(denied.audio.getState().status, 'error'); assert.equal(denied.audio.getState().enabled, false);
  assert.equal(denied.timers.size, 0); assert(denied.audio.getState().error);
  deniedContext.rejectResume = false;
  await denied.audio.toggle(); assert.equal(denied.audio.getState().status, 'playing');
  await denied.audio.destroy();

  const missing = setup({ AudioContext: null });
  assert.equal(missing.audio.getState().supported, false);
  await missing.audio.toggle(); assert.equal(missing.audio.getState().status, 'unavailable');
  await missing.audio.destroy();
  const broken = setup({ AudioContext: class { constructor() { throw new Error('not available'); } } });
  await broken.audio.toggle(); assert.equal(broken.audio.getState().status, 'error');
  await broken.audio.destroy();
  class BrokenBufferContext extends FakeContext {
    createBuffer(...args) {
      if (BrokenBufferContext.breakNext) { BrokenBufferContext.breakNext = false; throw new Error('buffer failed'); }
      return super.createBuffer(...args);
    }
  }
  BrokenBufferContext.breakNext = true;
  const partial = setup({ AudioContext: BrokenBufferContext });
  await partial.audio.toggle();
  assert.equal(partial.audio.getState().status, 'error');
  assert.equal(FakeContext.instances.at(-1).state, 'closed', 'partial initialization releases its context');
  await partial.audio.toggle(); assert.equal(partial.audio.getState().status, 'playing');
  await partial.audio.destroy();
  console.log('sheep-triple audio: opt-in, looping, bounded voices, volume, hidden-tab pause, interruptions, rapid toggles, retry and cleanup PASS');
})().catch(error => { console.error(error); process.exitCode = 1; });
