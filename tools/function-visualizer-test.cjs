'use strict';
// Dependency-free checks against the actual inline implementation, not copied formulas.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'game/function-visualizer.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
const candidates = scripts.filter(s => s.includes('const PI=Math.PI'));
assert.equal(candidates.length, 1, 'find exactly one visualization implementation');
const script = candidates[0];
const start = script.indexOf('const PI=Math.PI');
const cutoff = script.indexOf('const el=', start);
assert.ok(cutoff > start, 'pure function definitions end at DOM lookup');
const context = vm.createContext({});
vm.runInContext(script.slice(start, cutoff) + '\nglobalThis.catalog = functions;', context);
const catalog = context.catalog;
const byId = Object.fromEntries(catalog.map(f => [f.id, f]));
const near = (actual, expected, tolerance = 1e-10) => assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS', name); }

test('12 unique functions and 32 valid parameter controls', () => {
  assert.equal(catalog.length, 12);
  assert.equal(new Set(catalog.map(f => f.id)).size, 12);
  assert.equal(catalog.reduce((sum, f) => sum + f.params.length, 0), 32);
  for (const f of catalog) {
    assert.equal(new Set(f.params.map(p => p.id)).size, f.params.length);
    assert.ok(f.range[0] < f.range[1] && f.range[2] < f.range[3]);
    for (const p of f.params) assert.ok(p.min < p.max && p.step > 0 && p.value >= p.min && p.value <= p.max);
  }
});
test('Gaussian controls are mean and positive standard deviation; variance is derived', () => {
  const f = byId.normal;
  assert.equal(f.params.map(p => p.id).join(','), 'mu,sigma');
  assert.ok(f.params.find(p => p.id === 'sigma').min > 0);
  assert.ok(f.detail({mu: 1, sigma: 2}).includes('σ² = 4'));
  near(f.fn(1, {mu: 1, sigma: 2}), 1 / (2 * Math.sqrt(2 * Math.PI)));
});
test('Gaussian symmetry, unit integral and standard-deviation scaling', () => {
  const f = byId.normal;
  for (const mu of [-4, 0, 4]) for (const sigma of [.5, 1, 3]) {
    const p = {mu, sigma};
    for (const delta of [.1, 1, 2]) near(f.fn(mu + delta, p), f.fn(mu - delta, p));
    const n = 10000, dx = 16 * sigma / n;
    let integral = 0;
    for (let i = 0; i <= n; i++) integral += (i === 0 || i === n ? .5 : 1) * f.fn(mu - 8 * sigma + i * dx, p) * dx;
    near(integral, 1, 1e-9);
    near(f.fn(mu + sigma, p) / f.fn(mu, p), Math.exp(-.5));
  }
});
test('trigonometric amplitude, phase and angular-frequency periods', () => {
  for (const w of [.2, 1, 3]) for (const phi of [-2, 0, 2]) {
    const p = {A: 2.3, w, phi};
    const center = -phi / w;
    near(byId.sine.fn(center, p), 0);
    near(byId.cosine.fn(center, p), p.A);
    near(byId.sine.fn(center + Math.PI / (2 * w), p), p.A);
    for (const id of ['sine', 'cosine']) near(byId[id].fn(.37, p), byId[id].fn(.37 + 2 * Math.PI / w, p));
    near(byId.tangent.fn(center + .2 / w, p), byId.tangent.fn(center + (.2 + Math.PI) / w, p));
  }
});
test('tangent poles are undefined and split into different drawing segments', () => {
  const f = byId.tangent;
  for (const w of [.2, 1, 3]) for (const phi of [-2, 0, 2]) for (let k = -4; k <= 4; k++) {
    const p = {A: 1, w, phi}, pole = (Math.PI / 2 - phi + k * Math.PI) / w;
    assert.ok(Number.isNaN(f.fn(pole, p)));
    assert.notEqual(f.segment(pole - 1e-6, p), f.segment(pole + 1e-6, p));
  }
  assert.match(script, /if\(current\.segment&&segment!==previousSegment\)open=false/);
  assert.match(script, /!Number\.isFinite\(y\)/);
  assert.match(script, /clip-path['"]?:['"]url\(#plot-clip\)/);
});
test('polynomial and exponential reference values including degeneracy', () => {
  near(byId.linear.fn(2, {k: 3, b: -1}), 5);
  near(byId.quadratic.fn(2, {a: 2, b: -3, c: 4}), 6);
  near(byId.quadratic.fn(2, {a: 0, b: -3, c: 4}), -2);
  near(byId.cubic.fn(2, {a: 2, b: -3, c: 4, d: -5}), 7);
  near(byId.cubic.fn(2, {a: 0, b: -3, c: 4, d: -5}), -9);
  for (const k of [-2, 0, 2]) {
    near(byId.exponential.fn(0, {A: 2, k}), 2);
    near(byId.exponential.fn(1, {A: 2, k}), 2 * Math.exp(k));
  }
});
test('logarithm and power domains and reference values', () => {
  for (const base of [.2, .5, 2, 5]) {
    const p = {base, a: 2, h: 1};
    assert.ok(Number.isNaN(byId.logarithm.fn(1, p)));
    assert.ok(Number.isNaN(byId.logarithm.fn(0, p)));
    near(byId.logarithm.fn(2, p), 0);
    near(byId.logarithm.fn(1 + base, p), 2);
  }
  for (const p of [.1, .5, 1, 2, 4]) {
    assert.ok(Number.isNaN(byId.power.fn(-1, {a: 2, p})));
    near(byId.power.fn(0, {a: 2, p}), 0);
    near(byId.power.fn(1, {a: 2, p}), 2);
    near(byId.power.fn(4, {a: 2, p}), 2 * Math.pow(4, p));
  }
});
let adaptiveHarness;
test('number fields are unbounded and actual handler validates domains without clamping', () => {
  const number = script.match(/<input class="param-value"[^>]+>/)[0];
  assert.match(number, /step="any"/);
  assert.doesNotMatch(number, /\s(?:min|max)=/);
  const begin = script.indexOf('function validParameter(');
  const end = script.indexOf('function updateDetail(', begin);
  assert.ok(begin >= 0 && end > begin);
  const nodes = new Map();
  const ui = vm.createContext({
    current: byId.logarithm, values: {base: 2}, frame: 0, TAU: 2 * Math.PI,
    sliderBounds: Object.fromEntries(catalog.map(f => [f.id, Object.fromEntries(f.params.map(p => [p.id, {min:p.min, max:p.max, step:p.step}]))])),
    el: id => { if (!nodes.has(id)) nodes.set(id, {value: '', textContent: '', style: {setProperty() {}}, setAttribute(k,v) {this[k]=v;}, removeAttribute(k) {delete this[k];}}); return nodes.get(id); },
    fmt: String, updateDetail() {}, draw() {}, requestAnimationFrame() { return 1; }
  });
  vm.runInContext(script.slice(begin, end) + '\nglobalThis.update = updateParameter; globalThis.range = viewRange;', ui);
  const setFunction = id => { ui.current = byId[id]; ui.values = Object.fromEntries(byId[id].params.map(p => [p.id,p.value])); };
  const update = (id, value) => ui.update(ui.current.params.find(p => p.id === id), String(value), 'number');
  const base = byId.logarithm.params.find(p => p.id === 'base');
  for (const invalid of [1, 0, -2, Infinity, NaN]) {
    ui.update(base, String(invalid), 'number');
    assert.equal(ui.values.base, 2);
    assert.equal(nodes.get('number-base')['aria-invalid'], 'true');
  }
  for (const valid of [.5, 1 + 1e-12, 1000]) {
    update('base', valid); near(ui.values.base, valid);
    assert.equal(nodes.get('number-base')['aria-invalid'], undefined);
  }
  ui.update(base, '', 'number'); near(ui.values.base, 1000);
  setFunction('normal');
  for (const invalid of [0, -1]) { update('sigma', invalid); near(ui.values.sigma, 1); }
  update('sigma', .0001); near(ui.values.sigma, .0001);
  update('mu', 1000); near(ui.values.mu, 1000);
  assert.ok(Number(nodes.get('range-mu').max) >= 1000);
  assert.ok(Number(nodes.get('range-sigma').min) <= .0001);
  adaptiveHarness = {ui, setFunction, update};
});
test('adaptive viewport handles tiny sigma, large offsets, frequency, coefficients and near-one bases', () => {
  const {ui, setFunction, update} = adaptiveHarness;
  const nr = ui.range(ui.current, ui.values);
  near(nr[0], 1000 - .0004); near(nr[1], 1000 + .0004);
  assert.ok(nr[3] > byId.normal.fn(1000, ui.values));
  assert.equal(ui.range(byId.normal, {mu: 1e30, sigma: .0001}), null, 'unrepresentable zoom is disclosed');
  const cases = [
    ['sine', {A: 100, w: 1000, phi: 0}], ['cosine', {A: -100, w: -1000, phi: 0}],
    ['tangent', {A: 100, w: 1000, phi: 0}], ['linear', {k: 1e6, b: 0}],
    ['quadratic', {a: 1e6, b: 0, c: 0}], ['cubic', {a: 1e6, b: 0, c: 0, d: 0}],
    ['exponential', {A: 100, k: 1000}], ['logarithm', {base: .5, a: 1, h: 1000}],
    ['logarithm', {base: 1 + 1e-12, a: 1, h: 0}],
    ...[-2, 0, 100].map(p => ['power', {a: 1, p}]),
    ['sigmoid', {k: 1, x0: 1000}], ['tanh', {A: 100, k: -1000, x0: 1000}]
  ];
  for (const [id, params] of cases) {
    setFunction(id);
    for (const [key, value] of Object.entries(params)) { update(key, value); assert.equal(ui.values[key], value); }
    const r = ui.range(ui.current, ui.values);
    assert.ok(r && r.every(Number.isFinite) && r[0] < r[1] && r[2] < r[3], id + ' adaptive range');
    if (id === 'sigmoid') assert.ok(r[0] < 1000 && r[1] > 1000);
    if (['sine','cosine','tangent'].includes(id)) { assert.ok(r[1] - r[0] < .02); assert.ok(r[3] >= 100); }
    if (['linear','quadratic','cubic'].includes(id)) assert.ok(r[3] > 1e6);
    if (id === 'logarithm' && params.base > 1) assert.ok(r[3] > 1e10);
  }
  for (const id of ['sine', 'cosine', 'tangent']) {
    setFunction(id); update('A', 0); update('w', 0);
    near(ui.current.fn(.5, ui.values), 0); assert.ok(ui.range(ui.current, ui.values));
  }
  setFunction('sigmoid'); update('k', 0); near(ui.current.fn(1000, ui.values), .5);
  setFunction('tanh'); update('k', 0); near(ui.current.fn(1000, ui.values), 0);
});
test('power handles negative, zero and large exponents with the correct origin domain', () => {
  for (const p of [-2, 0]) {
    assert.ok(Number.isNaN(byId.power.fn(0, {a: 1, p})));
    near(byId.power.fn(2, {a: 1, p}), 2 ** p);
  }
  near(byId.power.fn(1.01, {a: 1, p: 100}), 1.01 ** 100);
});
test('sigmoid and tanh centers, symmetry, monotonicity and limiting values', () => {
  for (const x0 of [-4, 0, 4]) for (const k of [.1, 1, 4]) {
    const p = {A: 2, k, x0};
    near(byId.sigmoid.fn(x0, p), .5);
    near(byId.sigmoid.fn(x0 - 1, p) + byId.sigmoid.fn(x0 + 1, p), 1);
    assert.ok(byId.sigmoid.fn(x0 - 1, p) < byId.sigmoid.fn(x0 + 1, p));
    near(byId.tanh.fn(x0, p), 0);
    near(byId.tanh.fn(x0 - 1, p), -byId.tanh.fn(x0 + 1, p));
    near(byId.tanh.fn(x0 + 100 / k, p), p.A);
    near(byId.sigmoid.fn(x0 + 100 / k, p), 1);
  }
});
test('game hub and shared site catalog expose the published page', () => {
  const hub = fs.readFileSync(path.join(root, 'game/index.html'), 'utf8');
  assert.match(hub, /href=["'](?:\.\/)?function-visualizer\.html["']/);
  const config = vm.createContext({window: {}});
  vm.runInContext(fs.readFileSync(path.join(root, 'js/site-config.js'), 'utf8'), config);
  const matches = config.window.SITE.demos.filter(d => d.href === 'game/function-visualizer.html');
  assert.equal(matches.length, 1);
  assert.ok(matches[0].title);
});
console.log(`Function visualizer: ${count} test groups passed (12 functions, 32 controls).`);
