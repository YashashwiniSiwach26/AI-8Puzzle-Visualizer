/* Headless smoke test: executes the real js/app.js against a stub DOM and drives the controls.
   It verifies the UI logic runs without exceptions; it does NOT test visual rendering (open index.html for that). */
const fs = require('fs'), vm = require('vm'), path = require('path');
const els = {}, timers = [];
function stub(id) {
  const handlers = {};
  const e = { id, value: '', textContent: '', _html: '', disabled: false, style: { setProperty() {}, display: '' }, dataset: {}, children: [], scrollLeft: 0, offsetLeft: 0,
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    addEventListener(ev, fn) { handlers[ev] = fn; }, click() { handlers.click && handlers.click(); }, fire(ev) { handlers[ev] && handlers[ev](); },
    appendChild(c) { e.children.push(c); return c; }, setAttribute() {}, select() {}, querySelector() { return stub('qs'); }, querySelectorAll() { return []; } };
  Object.defineProperty(e, 'innerHTML', { get() { return e._html; }, set(v) { e._html = v; } });
  return e;
}
const get = id => els[id] || (els[id] = stub(id));
const ctx = { console, performance, alert: m => { ctx.alerts.push(m); }, alerts: [], location: { hash: '#solver' },
  document: { getElementById: get, createElement: () => stub('new'), querySelectorAll: () => [] },
  setTimeout: (fn, ms) => { timers.push(fn); return timers.length; }, clearTimeout: () => {}, scrollTo() {} };
ctx.window = ctx; ctx.window.addEventListener = () => {}; ctx.window.scrollTo = () => {};
vm.createContext(ctx);
for (const f of ['config', 'puzzle', 'algorithms', 'info', 'app']) vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/' + f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
function drain(max) { let n = 0; while (timers.length && n++ < (max || 2000000)) timers.shift()(); }
let fails = 0; const check = (n, c) => { console.log((c ? '  PASS  ' : '  FAIL  ') + n); if (!c) fails++; };

// fix puzzle: the app already loaded the example
const ENABLED = vm.runInContext('APP_CONFIG.enabledAlgorithms', ctx);
for (const a of ENABLED) {
  timers.length = 0; get('algoSelect').value = a; get('dlsLimit').value = '8'; get('speed').value = '10'; get('memoChk').checked = true;
  get('btnRun').click(); drain();
  const sum = get('summary').innerHTML;
  const expectFound = a !== 'dls' || true;
  check(a + ': Run plays to the end and shows a summary', /Total nodes expanded/.test(sum) && /Execution time/.test(sum) && /Memory/.test(sum));
  check(a + ': solution path strip rendered when found', !/Solution Found/.test(sum) || /Step 0/.test(get('pathStrip').innerHTML));
  check(a + ': frontier/explored/successor panels populated', get('frontList').innerHTML.length > 0 && get('expList').innerHTML.length > 0);
}
// controls
timers.length = 0; get('algoSelect').value = ENABLED[0]; get('speed').value = '5'; get('memoChk').checked = true; get('btnRun').click();
timers.shift()();                       // finish the search (30 ms setTimeout)
check('Run starts playback', get('btnPause').disabled === false);
get('btnPause').click(); check('Pause disables Pause, enables Resume', get('btnPause').disabled && !get('btnResume').disabled);
const lbl0 = get('stepLabel').textContent;
get('btnNext').click(); const lbl1 = get('stepLabel').textContent;
get('btnNext').click(); get('btnPrev').click();
check('Next Step advances, Previous returns', lbl0 !== lbl1 && get('stepLabel').textContent === lbl1);
get('btnResume').click(); drain(); check('Resume plays to the end', /Solution move/.test(get('stepLabel').textContent));
get('btnReset').click(); check('Reset clears results', /Run an algorithm/.test(get('summary').innerHTML) && get('stepLabel').textContent === 'Not started');
// validation
const init = []; // find input stubs via grid children
const grid = get('initGrid').children; grid[0].value = '2'; grid[1].value = '2'; grid[1].fire('input');
check('duplicate tile is rejected', /Initial state/.test(get('validationMsg').innerHTML));
get('btnRun').click(); drain(); check('Run is blocked on invalid input', !/Total nodes/.test(get('summary').innerHTML));
get('btnSample').click();
const g = get('initGrid').children; ['1','2','3','4','5','6','8','7','_'].forEach((v, i) => g[i].value = v); g[0].fire('input');
const gg = get('goalGrid').children; ['1','2','3','4','5','6','7','8','_'].forEach((v, i) => gg[i].value = v); gg[0].fire('input');
check('unsolvable state is flagged', /can NOT reach/.test(get('validationMsg').textContent));
ctx.alerts.length = 0; get('btnRun').click(); check('Run is blocked on unsolvable state', ctx.alerts.length === 1);
get('btnRandom').click(); check('Random puzzle is valid & solvable', /Valid and solvable/.test(get('validationMsg').textContent));
// comparison
get('btnSample').click(); timers.length = 0; get('btnCompare').click(); drain();
const rows = get('cmpTable').querySelector('tbody'); 
check('Comparison button runs without error', /Done/.test(get('cmpStatus').textContent));
console.log('\n' + (fails ? fails + ' FAILED' : 'UI smoke test: all checks passed'));
process.exit(fails ? 1 : 0);
