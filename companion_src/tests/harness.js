/* Test harness: run companion_src/*.js in a Node vm context with browser stubs,
   exactly like the browser does (one vm.Script per file, shared global context,
   load order 00..05) so top-level `typeof X` TDZ behaviour matches. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..');

function makeStubEl() {
  const el = {
    innerHTML: '', textContent: '', value: '', style: {}, dataset: {}, attributes: [],
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    firstChild: { textContent: '' },
    appendChild(){}, removeChild(){}, setAttribute(){}, removeAttribute(){},
    addEventListener(){}, replaceWith(){}, querySelector(){ return makeStubEl(); },
    querySelectorAll(){ return []; }, getContext(){ return null; },
  };
  return el;
}

function createEnv(opts = {}) {
  const storage = new Map(Object.entries(opts.storage || {}));
  const localStorage = {
    getItem: k => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k),
    key: i => Array.from(storage.keys())[i],
    get length() { return storage.size; },
  };
  /* Render code does `$('[data-tab=x]').innerHTML = ...` with no null guard, so
     hand out a stable stub per selector rather than null — the renders then run
     end-to-end (which is what we want to exercise) without a real DOM. */
  const els = new Map();
  const elFor = sel => { if (!els.has(sel)) els.set(sel, makeStubEl()); return els.get(sel); };
  const document = {
    getElementById: id => elFor('#' + id),
    querySelector: sel => elFor(sel),
    querySelectorAll: () => [],
    createElement: () => makeStubEl(),
    addEventListener: () => {},
    head: makeStubEl(), body: makeStubEl(),
    scripts: [], activeElement: null,
    /* 01_*.js self-starts init() unless the document is still loading; we want the
       modules defined but init() never run (it needs a real DOM). */
    readyState: 'loading',
  };
  const sandbox = {
    console, localStorage, document,
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval,
    requestAnimationFrame: () => 0,
    fetch: opts.fetch || (() => Promise.reject(new Error('offline'))),
    Promise, JSON, Math, Date, Number, String, Object, Array, Set, Map, RegExp, Error, isNaN, parseInt, parseFloat,
    encodeURIComponent, decodeURIComponent, TextEncoder, TextDecoder,
    navigator: { onLine: true, userAgent: 'node' },
    location: { href: 'https://example.test/', origin: 'https://example.test' },
    matchMedia: () => ({ matches: false }),
    confirm: () => true, alert: () => {},
    scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    innerWidth: 400, innerHeight: 800,
    Notification: { permission: 'default' },
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  const ctx = vm.createContext(sandbox);

  const files = ['00_fbbc01a0.js', '01_fa4c6c09.js', '02_94e98c84.js', '03_7897e180.js', '04_0ce30e21.js', '05_8b5b9238.js'];
  for (const f of files) {
    if (f.startsWith('00_')) continue; // loader/bootstrap, needs a real DOM
    const code = fs.readFileSync(path.join(SRC, f), 'utf8');
    new vm.Script(code, { filename: f }).runInContext(ctx);
  }
  /* `const`/`let` top-level decls live in the context's lexical scope, not on the
     global object — reach them by evaluating in the same context (as the app does). */
  const evalIn = expr => vm.runInContext(expr, ctx);
  return { ctx, storage, localStorage, evalIn };
}

/* ---- tiny assert lib ---- */
let pass = 0, fail = 0;
const failures = [];
function t(name, fn) {
  try { fn(); console.log('  ✓ ' + name); pass++; }
  catch (e) { console.log('  ✗ ' + name + '\n      ' + e.message); fail++; failures.push(name); }
}
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error((msg ? msg + ': ' : '') + 'expected ' + b + ', got ' + a);
}
function ok(v, msg) { if (!v) throw new Error(msg || 'expected truthy, got ' + JSON.stringify(v)); }
function done() {
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if (fail) { console.log('FAILED: ' + failures.join(', ')); process.exit(1); }
}
module.exports = { createEnv, t, eq, ok, done };
