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
const relativeNear = (actual, expected, tolerance = 1e-8) => near(actual, expected, Math.max(Number.MIN_VALUE, Math.abs(expected) * tolerance));
function integrate(fn, min, max, intervals = 20000) {
  const dx = (max - min) / intervals;
  let result = 0;
  for (let i = 0; i <= intervals; i++) result += fn(min + i * dx) * (i === 0 || i === intervals ? .5 : 1) * dx;
  return result;
}
const isUndrawn = value => value === 0 || Number.isNaN(value);
let count = 0, failures = 0;
function test(name, fn) {
  try { fn(); count++; console.log('PASS', name); }
  catch (error) { failures++; process.exitCode = 1; console.error('FAIL', name, '\n' + error.stack); }
}

test('23 unique functions and 66 valid parameter controls', () => {
  assert.equal(catalog.length, 23);
  assert.equal(new Set(catalog.map(f => f.id)).size, 23);
  assert.equal(catalog.reduce((sum, f) => sum + f.params.length, 0), 66);
  for (const id of ['normal','sine','cosine','tangent','linear','quadratic','cubic','exponential','logarithm','power','sigmoid','tanh','absolute','reciprocal','sqrt','step','relu','leakyrelu','mixture','beta','poisson','damped','bivariate']) assert.ok(byId[id], id);
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
  vm.runInContext(script.slice(start, cutoff) + '\n' + script.slice(begin, end) + '\nglobalThis.update = updateParameter; globalThis.range = viewRange;', ui);
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
  adaptiveHarness = {ui, setFunction, update, nodes};
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
test('absolute value has a translated vertex, symmetry and a constant degeneracy', () => {
  for (const a of [-3, 0, 2]) for (const h of [-1000, 0, 1000]) {
    const p = {a, h, k: 4};
    near(byId.absolute.fn(h, p), p.k);
    for (const d of [.25, 1, 4]) {
      near(byId.absolute.fn(h + d, p), a * d + p.k);
      near(byId.absolute.fn(h - d, p), byId.absolute.fn(h + d, p));
    }
  }
});
test('reciprocal preserves its pole and never joins opposite branches', () => {
  const f = byId.reciprocal;
  assert.equal(typeof f.segment, 'function');
  for (const a of [-2, 0, 3]) for (const h of [-4, 0, 1000]) {
    const p = {a, h, k: 5};
    assert.ok(Number.isNaN(f.fn(h, p)), 'pole remains outside the domain even for a=0');
    for (const d of [.25, 1, 4]) {
      near(f.fn(h + d, p), a / d + p.k);
      near(f.fn(h - d, p), -a / d + p.k);
      near(f.fn(h + d, p) + f.fn(h - d, p), 2 * p.k);
    }
    assert.notEqual(f.segment(h - 1e-6, p), f.segment(h + 1e-6, p));
  }
});
test('square root includes its translated endpoint and excludes the left domain', () => {
  for (const a of [-3, 0, 2]) for (const h of [-4, 0, 1000]) {
    const p = {a, h, k: -2};
    assert.ok(Number.isNaN(byId.sqrt.fn(h - .01, p)));
    near(byId.sqrt.fn(h, p), p.k);
    for (const d of [.25, 1, 4]) near(byId.sqrt.fn(h + d, p), a * Math.sqrt(d) + p.k);
  }
});
test('step has a documented right-continuous boundary and separate segments', () => {
  const f = byId.step;
  assert.equal(typeof f.segment, 'function');
  for (const h of [-1000, 0, 1000]) {
    const p = {h, lo: -2, hi: 5};
    near(f.fn(h - 1e-6, p), p.lo);
    near(f.fn(h, p), p.hi);
    near(f.fn(h + 1e-6, p), p.hi);
    assert.notEqual(f.segment(h - 1e-6, p), f.segment(h, p));
    near(f.fn(h - 1, {...p, lo: 5}), 5);
    near(f.fn(h + 1, {...p, lo: 5}), 5);
  }
});
test('ReLU and leaky ReLU handle slopes, translations, and alpha=0/1 limits', () => {
  for (const a of [-2, 0, 3]) for (const h of [-1000, 0, 1000]) {
    const p = {a, h};
    near(byId.relu.fn(h - 2, p), 0);
    near(byId.relu.fn(h, p), 0);
    near(byId.relu.fn(h + 2, p), 2 * a);
    for (const alpha of [0, .1, 1]) {
      const q = {...p, alpha};
      near(byId.leakyrelu.fn(h - 2, q), -2 * a * alpha);
      near(byId.leakyrelu.fn(h, q), 0);
      near(byId.leakyrelu.fn(h + 2, q), 2 * a);
      for (const d of [-2, 0, 2]) {
        near(byId.leakyrelu.fn(h + d, {...p, alpha: 0}), byId.relu.fn(h + d, p));
        near(byId.leakyrelu.fn(h + d, {...p, alpha: 1}), a * d);
      }
    }
  }
});
test('Gaussian mixture is normalized, weighted correctly and reduces at w=0/1', () => {
  const f = byId.mixture;
  for (const w of [0, .15, .5, 1]) {
    const p = {w, mu1: -2, sigma1: .5, mu2: 3, sigma2: 1.5};
    for (const x of [-4, -2, 0, 3, 6]) {
      const n1 = byId.normal.fn(x, {mu: p.mu1, sigma: p.sigma1});
      const n2 = byId.normal.fn(x, {mu: p.mu2, sigma: p.sigma2});
      near(f.fn(x, p), w * n1 + (1 - w) * n2);
    }
    near(integrate(x => f.fn(x, p), -10, 15), 1, 1e-9);
  }
  const symmetric = {w: .5, mu1: -2, sigma1: .7, mu2: 2, sigma2: .7};
  for (const x of [.1, 1, 3]) near(f.fn(x, symmetric), f.fn(-x, symmetric));
  const coincident = {w: .37, mu1: 7, sigma1: .0001, mu2: 7, sigma2: .0001};
  near(f.fn(7, coincident), byId.normal.fn(7, {mu: 7, sigma: .0001}), 1e-10);
});
test('Beta density matches known values, mirrored shapes and endpoint limits', () => {
  const f = byId.beta;
  for (const x of [0, .1, .5, .9, 1]) near(f.fn(x, {alpha: 1, beta: 1}), 1);
  for (const x of [.1, .25, .5, .8]) {
    near(f.fn(x, {alpha: 2, beta: 3}), 12 * x * (1 - x) ** 2);
    near(f.fn(x, {alpha: .5, beta: .5}), 1 / (Math.PI * Math.sqrt(x * (1 - x))));
    near(f.fn(x, {alpha: 2, beta: 3}), f.fn(1 - x, {alpha: 3, beta: 2}));
  }
  near(f.fn(0, {alpha: 2, beta: 3}), 0);
  near(f.fn(1, {alpha: 2, beta: 3}), 0);
  near(f.fn(0, {alpha: 1, beta: 3}), 3);
  near(f.fn(1, {alpha: 3, beta: 1}), 3);
  assert.equal(f.fn(0, {alpha: .5, beta: 2}), Infinity);
  assert.equal(f.fn(1, {alpha: 2, beta: .5}), Infinity);
  for (const x of [-1, 2]) assert.ok(isUndrawn(f.fn(x, {alpha: 2, beta: 3})));
});
test('Beta normalizes and remains stable for concentrated and singular shapes', () => {
  const f = byId.beta;
  near(integrate(x => f.fn(x, {alpha: 2, beta: 3}), 0, 1), 1, 1e-8);
  near(integrate(x => f.fn(x, {alpha: 8, beta: 5}), 0, 1), 1, 1e-9);
  // Transform the arcsine density to avoid evaluating divergent endpoints.
  let arcsine = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, x = (1 - Math.cos(Math.PI * t)) / 2;
    arcsine += f.fn(x, {alpha: .5, beta: .5}) * Math.PI * Math.sin(Math.PI * t) / (2 * n);
  }
  near(arcsine, 1, 1e-8);
  const p = {alpha: 10000, beta: 10000}, sigma = Math.sqrt(1 / (4 * 20001));
  assert.ok(Number.isFinite(f.fn(.5, p)) && f.fn(.5, p) > 100);
  near(integrate(x => f.fn(x, p), .5 - 8 * sigma, .5 + 8 * sigma), 1, 1e-7);
  relativeNear(f.fn(1e-10, {alpha: 1, beta: 1e10}), 1e10 * Math.exp((1e10 - 1) * Math.log1p(-1e-10)), 1e-6);
});
test('Poisson is discrete with a lambda=0 point mass and exact reference values', () => {
  const f = byId.poisson;
  near(f.fn(0, {lambda: 0}), 1);
  for (const k of [1, 2, 100]) near(f.fn(k, {lambda: 0}), 0);
  for (const k of [-1, .5, 1.25]) assert.ok(isUndrawn(f.fn(k, {lambda: 3})));
  for (const lambda of [1e-8, .1, 1, 4]) {
    near(f.fn(0, {lambda}), Math.exp(-lambda));
    near(f.fn(1, {lambda}), lambda * Math.exp(-lambda));
    near(f.fn(2, {lambda}), lambda ** 2 * Math.exp(-lambda) / 2);
    for (let k = 0; k < 10; k++) near(f.fn(k + 1, {lambda}), f.fn(k, {lambda}) * lambda / (k + 1));
  }
});
test('Poisson normalizes, has mean/variance lambda and supports large rates', () => {
  const f = byId.poisson;
  for (const lambda of [.1, 1, 8, 1000, 10000]) {
    let total = 0, first = 0, variance = 0;
    const lower = Math.max(0, Math.floor(lambda - 12 * Math.sqrt(lambda)));
    const upper = Math.ceil(lambda + 12 * Math.sqrt(lambda) + 30);
    for (let k = lower; k <= upper; k++) {
      const mass = f.fn(k, {lambda});
      assert.ok(Number.isFinite(mass) && mass >= 0 && mass <= 1);
      total += mass; first += mass * k; variance += mass * (k - lambda) ** 2;
    }
    near(total, 1, 1e-8);
    near(first, lambda, Math.max(1e-8, lambda * 1e-8));
    near(variance, lambda, Math.max(1e-8, lambda * 1e-8));
  }
  relativeNear(f.fn(1000, {lambda: 1000}), .012614611348721499, 1e-8);
  relativeNear(f.fn(10000, {lambda: 10000}), .003989389558962825, 1e-8);
});
test('damped oscillation follows the envelope and has undamped/zero limits', () => {
  const f = byId.damped;
  for (const A of [-3, 0, 2]) for (const decay of [0, .2, 2]) {
    const p = {A, decay, w: 2, phi: .7};
    assert.ok(Number.isNaN(f.fn(-.01, p)));
    near(f.fn(0, p), A * Math.sin(p.phi));
    for (const x of [.1, 1, 4]) {
      near(f.fn(x, p), A * Math.exp(-decay * x) * Math.sin(p.w * x + p.phi));
      assert.ok(Math.abs(f.fn(x, p)) <= Math.abs(A) * Math.exp(-decay * x) + 1e-14);
    }
  }
  for (const x of [0, 1, 10]) {
    near(f.fn(x, {A: 2, decay: 0, w: 3, phi: .5}), byId.sine.fn(x, {A: 2, w: 3, phi: .5}));
    near(f.fn(x, {A: 2, decay: .3, w: 0, phi: 0}), 0);
    near(f.fn(x, {A: 2, decay: .3, w: 0, phi: Math.PI / 2}), 2 * Math.exp(-.3 * x));
  }
});
test('bivariate Gaussian matches center, independent factors, and correlation orientation', () => {
  const f = byId.bivariate;
  const p = {muX: 2, muY: -3, sigmaX: .5, sigmaY: 2, rho: 0};
  near(f.fn(p.muX, p, p.muY), 1 / (2 * Math.PI * p.sigmaX * p.sigmaY));
  for (const x of [0, 2, 3]) for (const y of [-5, -3, 0]) {
    near(f.fn(x, p, y), byId.normal.fn(x, {mu: p.muX, sigma: p.sigmaX}) * byId.normal.fn(y, {mu: p.muY, sigma: p.sigmaY}));
  }
  near(f.fn(2, p), f.fn(2, p, 0));
  for (const rho of [-.8, .8]) {
    const q = {...p, rho};
    relativeNear(f.fn(q.muX, q, q.muY), 1 / (2 * Math.PI * q.sigmaX * q.sigmaY * Math.sqrt(1 - rho ** 2)));
    near(f.fn(q.muX + .3, q, q.muY + .7), f.fn(q.muX - .3, q, q.muY - .7));
    const sameSign = f.fn(q.muX + q.sigmaX, q, q.muY + q.sigmaY);
    const oppositeSign = f.fn(q.muX + q.sigmaX, q, q.muY - q.sigmaY);
    assert.ok(rho > 0 ? sameSign > oppositeSign : sameSign < oppositeSign);
  }
  const narrow = {...p, sigmaX: .0001, sigmaY: .0002, rho: .999};
  assert.ok(Number.isFinite(f.fn(narrow.muX, narrow, narrow.muY)));
});
test('bivariate Gaussian integrates to one over both dimensions', () => {
  const f = byId.bivariate;
  for (const rho of [-.8, 0, .8]) {
    const p = {muX: 2, muY: -3, sigmaX: .5, sigmaY: 2, rho};
    const n = 240, dx = 16 * p.sigmaX / n, dy = 16 * p.sigmaY / n;
    let total = 0;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const weight = (i === 0 || i === n ? .5 : 1) * (j === 0 || j === n ? .5 : 1);
      total += f.fn(p.muX - 8 * p.sigmaX + i * dx, p, p.muY - 8 * p.sigmaY + j * dy) * dx * dy * weight;
    }
    near(total, 1, 1e-8);
  }
});
test('new numeric controls reject invalid domains and accept valid out-of-slider values', () => {
  const {ui, setFunction, update, nodes} = adaptiveHarness;
  const cases = [
    ['mixture','w',[-.1,1.1],[0,.25,1]],
    ['mixture','sigma1',[0,-1],[.0001,100]], ['mixture','sigma2',[0,-1],[.0001,100]],
    ['beta','alpha',[0,-1],[.0001,10000]], ['beta','beta',[0,-1],[.0001,10000]],
    ['poisson','lambda',[-1],[0,.0001,10000]],
    ['damped','decay',[-1],[0,.0001,1000]],
    ['leakyrelu','alpha',[-.1,1.1],[0,.25,1]],
    ['bivariate','sigmaX',[0,-1],[.0001,100]], ['bivariate','sigmaY',[0,-1],[.0001,100]],
    ['bivariate','rho',[-1,1,-2,2],[-.999,0,.999]]
  ];
  for (const [id, key, invalid, valid] of cases) {
    setFunction(id);
    for (const value of [...invalid, NaN, Infinity, -Infinity]) {
      const previous = ui.values[key];
      update(key, value);
      assert.equal(ui.values[key], previous, `${id}.${key} rejects ${value}`);
      assert.equal(nodes.get('number-' + key)['aria-invalid'], 'true');
    }
    for (const value of valid) {
      update(key, value);
      assert.equal(ui.values[key], value, `${id}.${key} accepts ${value}`);
      assert.equal(nodes.get('number-' + key)['aria-invalid'], undefined);
      assert.ok(Number(nodes.get('range-' + key).min) <= value);
      assert.ok(Number(nodes.get('range-' + key).max) >= value);
    }
  }
  for (const id of ['absolute','reciprocal','sqrt','step','relu','leakyrelu']) {
    setFunction(id); update('h', 1000); assert.equal(ui.values.h, 1000);
  }
  setFunction('bivariate'); update('muX', 1000); update('muY', -1000);
  assert.equal(ui.values.muX, 1000); assert.equal(ui.values.muY, -1000);
});
test('new adaptive viewports remain finite for narrow, broad, shifted and degenerate inputs', () => {
  const {ui, setFunction, update} = adaptiveHarness;
  const cases = [
    ['absolute',{a:1000,h:1000,k:-1000}], ['reciprocal',{a:1000,h:1000,k:-1000}],
    ['sqrt',{a:1000,h:1000,k:-1000}], ['step',{h:1000,lo:-1000,hi:1000}],
    ['relu',{a:1000,h:1000}], ['leakyrelu',{a:-1000,h:1000,alpha:.01}],
    ['mixture',{w:.5,mu1:1000,sigma1:.0001,mu2:1000.001,sigma2:.0002}],
    ['mixture',{w:0,mu1:-1000,sigma1:1,mu2:1000,sigma2:100}],
    ['beta',{alpha:.1,beta:.1}], ['beta',{alpha:10000,beta:10000}],
    ['poisson',{lambda:0}], ['poisson',{lambda:10000}],
    ['damped',{A:100,decay:1000,w:1000,phi:0}], ['damped',{A:0,decay:0,w:0,phi:0}],
    ['bivariate',{muX:1000,muY:-1000,sigmaX:.0001,sigmaY:.0002,rho:.999}]
  ];
  for (const [id, params] of cases) {
    setFunction(id);
    for (const [key, value] of Object.entries(params)) { update(key, value); assert.equal(ui.values[key], value); }
    const r = ui.range(ui.current, ui.values);
    assert.ok(r && r.every(Number.isFinite) && r[0] < r[1] && r[2] < r[3], id + ' adaptive range');
    if ('h' in params) assert.ok(r[0] <= params.h && r[1] > params.h, id + ' contains translated feature');
    if (id === 'mixture') assert.ok(r[0] < params.mu2 && r[1] > params.mu2);
    if (id === 'beta') assert.ok(r[0] <= .5 && r[1] >= .5);
    if (id === 'poisson') assert.ok(r[0] <= params.lambda && r[1] > params.lambda);
    if (id === 'bivariate') {
      assert.ok(r[0] < params.muX && r[1] > params.muX);
      assert.ok(r[2] < params.muY && r[3] > params.muY);
    }
  }
});
function renderHarness(width = 900) {
  // A minimal SVG/DOM adapter executes the real initialization, selection, input
  // and drawing code without a browser or third-party testing dependencies.
  const ids = new Map(), nodes = [];
  function node(tag = 'div') {
    const n = {
      tag, children: [], attributes: {}, dataset: {}, style: {setProperty() {}}, value: '', textContent: '',
      appendChild(child) { this.children.push(child); return child; },
      replaceChildren(...children) { this.children = children; },
      setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'id') ids.set(String(value), this); },
      removeAttribute(key) { delete this.attributes[key]; },
      addEventListener() {}, getBoundingClientRect() { return {width, height: 434}; }
    };
    nodes.push(n); return n;
  }
  const document = {
    getElementById(id) { if (!ids.has(id)) ids.set(id, node(id === 'chart' ? 'svg' : 'div')); return ids.get(id); },
    createElement: node, createElementNS(namespace, tag) { return node(tag); },
    querySelectorAll(selector) { assert.equal(selector, '.function-btn'); return nodes.filter(n => n.className === 'function-btn'); }
  };
  const ui = vm.createContext({document, requestAnimationFrame() {return 1;}, ResizeObserver: class {observe() {}}});
  const insertion = script.lastIndexOf('buildMenu();selectFunction(');
  assert.ok(insertion > 0, 'find initialization after all implementation functions');
  const exported = 'globalThis.renderTest = {selectFunction, draw, updateParameter, viewRange, state:()=>({current, values})};\n';
  vm.runInContext(script.slice(0, insertion) + exported + script.slice(insertion), ui);
  const descendants = n => [n, ...n.children.flatMap(descendants)];
  const matching = predicate => descendants(ids.get('chart')).filter(predicate);
  return {
    ui: ui.renderTest, ids, matching,
    select(id, params = {}) {
      ui.renderTest.selectFunction(id);
      for (const [key, value] of Object.entries(params)) {
        const p = ui.renderTest.state().current.params.find(p => p.id === key);
        ui.renderTest.updateParameter(p, String(value), 'number');
      }
      ui.renderTest.draw();
    }
  };
}
test('all 23 functions initialize and draw without nonfinite SVG geometry', () => {
  const harness = renderHarness();
  assert.equal(harness.ids.get('function-select').children.length, 23);
  for (const f of catalog) {
    harness.select(f.id);
    assert.equal(harness.ids.get('parameters').children.length, f.params.length);
    assert.ok(harness.ids.get('chart').children.length > 3, f.id + ' draws axes and data');
    for (const n of harness.matching(() => true)) for (const value of Object.values(n.attributes)) {
      assert.doesNotMatch(value, /NaN|Infinity/, f.id + ' finite SVG attributes');
    }
  }
  harness.select('absolute', {a: 10, h: 1000});
  harness.select('normal'); harness.select('absolute');
  assert.equal(harness.ui.state().values.a, 10);
  assert.equal(harness.ui.state().values.h, 1000, 'selection restores each function’s parameters');
});
test('Poisson renders individual integer bars, preserves zero rate, and labels broad sampling', () => {
  const harness = renderHarness();
  for (const lambda of [0, 4, 10000]) {
    harness.select('poisson', {lambda});
    const bars = harness.matching(n => n.attributes.class === 'probability-bar');
    const state = harness.ui.state(), range = harness.ui.viewRange(state.current, state.values);
    assert.ok(bars.length > 0 && bars.length < 1000);
    for (const bar of bars) {
      const k = Number(bar.attributes['data-k']);
      assert.ok(Number.isSafeInteger(k) && k >= 0);
      near(Number(bar.attributes.height), byId.poisson.fn(k, {lambda}) / (range[3] - range[2]) * (434 - 24 - 49), 1e-9);
    }
    assert.equal(harness.matching(n => n.attributes.id === 'function-curve').length, 0);
    if (lambda === 0) assert.ok(Number(bars.find(n => n.attributes['data-k'] === '0').attributes.height) > 0);
    if (lambda === 10000) assert.match(harness.ids.get('plot-note').textContent, /未合并概率/);
  }
});
test('bivariate rendering uses genuine density ellipses and switches cleanly to 1D curves', () => {
  const harness = renderHarness();
  for (const rho of [-.8, 0, .8]) {
    const p = {muX: 2, muY: -3, sigmaX: .5, sigmaY: 2, rho};
    harness.select('bivariate', p);
    const contours = harness.matching(n => n.attributes.class === 'density-contour');
    assert.equal(contours.length, 3);
    assert.deepEqual(contours.map(n => Number(n.attributes['data-q'])).sort((a,b) => a-b), [1,4,9]);
    assert.equal(harness.matching(n => n.attributes.id === 'function-curve').length, 0);
    const box = harness.matching(n => n.tag === 'rect' && n.attributes.fill === 'none')[0].attributes;
    const range = harness.ui.viewRange(harness.ui.state().current, p);
    for (const contour of contours) {
      assert.ok(contour.attributes.d.endsWith('Z'));
      const coordinates = [...contour.attributes.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)];
      assert.ok(coordinates.length >= 100);
      for (const [, sx, sy] of coordinates) {
        const x = range[0] + (Number(sx) - Number(box.x)) / Number(box.width) * (range[1] - range[0]);
        const y = range[3] - (Number(sy) - Number(box.y)) / Number(box.height) * (range[3] - range[2]);
        const u = (x - p.muX) / p.sigmaX, v = (y - p.muY) / p.sigmaY;
        near(u*u + (v-rho*u)**2/(1-rho*rho), Number(contour.attributes['data-q']), .0002);
      }
    }
  }
  harness.select('damped');
  assert.equal(harness.matching(n => n.attributes.class === 'density-contour').length, 0);
  assert.equal(harness.matching(n => n.attributes.class === 'envelope').length, 2);
  assert.equal(harness.matching(n => n.attributes.id === 'function-curve').length, 1);
  harness.select('step');
  assert.equal(harness.matching(n => n.attributes.class === 'envelope').length, 0);
  assert.equal(harness.matching(n => n.tag === 'circle').length, 2);
  harness.select('beta', {alpha:.5,beta:.5});
  assert.match(harness.ids.get('plot-note').textContent, /无穷/);
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
console.log(`Function visualizer: ${count} test groups passed${failures ? `, ${failures} failed` : ''} (23 functions, 66 controls).`);
