/* UI controller: input, playback of the recorded search trace, summary, comparison and info pages. */
(function () {
  'use strict';
  const C = APP_CONFIG, S = Search, P = Puzzle;
  const $ = id => document.getElementById(id);
  const ARROW = { Up: '↑', Down: '↓', Left: '←', Right: '→' };
  const STACK_ALGOS = ['dfs', 'dls', 'iddls'];
  const enabled = C.enabledAlgorithms.filter(a => S.ALGORITHMS[a]);
  const mini = (s, cls) => '<div class="mini ' + (cls || '') + '">' + [...s].map(c => '<span class="' + (c === '0' ? 'b' : '') + '">' + (c === '0' ? '' : c) + '</span>').join('') + '</div>';

  /* ---------- navigation ---------- */
  function showPage() {
    const p = (location.hash || '#home').slice(1);
    const page = ['home', 'solver', 'compare', 'algorithms'].includes(p) ? p : 'home';
    document.querySelectorAll('.page').forEach(el => el.classList.toggle('active', el.id === 'page-' + page));
    document.querySelectorAll('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    if (page === 'compare') refreshCompareHeader();
    const nav = document.getElementById('nav'); if (nav.classList.contains('show')) nav.classList.remove('show');
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', showPage);

  /* ---------- home ---------- */
  $('homeCourse').textContent = C.courseName + ' · ' + C.courseCode;
  $('homeTitle').textContent = C.assignmentTitle;
  $('homeName').textContent = C.studentName; $('homeReg').textContent = C.registerNumber;
  $('footName').textContent = C.studentName + ' (' + C.registerNumber + ')';
  if (S.ALGORITHMS[C.assignedAlgorithm]) $('homeAssigned').textContent = 'Assigned algorithm: ' + S.ALGORITHMS[C.assignedAlgorithm].name;

  /* ---------- board ---------- */
  function makeBoard(el) {
    el.innerHTML = '<div class="bgs">' + '<div class="bg-cell"></div>'.repeat(9) + '</div>';
    const tiles = {};
    for (let t = 1; t <= 8; t++) { const d = document.createElement('div'); d.className = 'tile'; d.textContent = t; el.appendChild(d); tiles[t] = d; }
    return {
      set(s, goal) { for (let i = 0; i < 9; i++) { const t = +s[i]; if (!t) continue; const d = tiles[t]; d.style.setProperty('--r', (i / 3) | 0); d.style.setProperty('--c', i % 3); d.classList.toggle('in-place', goal && goal[i] === s[i]); } },
      dur(ms) { el.style.setProperty('--dur', ms + 'ms'); }
    };
  }
  const board = makeBoard($('board'));

  /* ---------- input grids ---------- */
  const initInputs = [], goalInputs = [];
  function buildGrid(el, arr, state, label) {
    for (let i = 0; i < 9; i++) {
      const inp = document.createElement('input');
      inp.maxLength = 1; inp.className = 'form-control cell-input'; inp.autocomplete = 'off'; inp.inputMode = 'numeric';
      inp.setAttribute('aria-label', label + ' cell ' + (i + 1));
      inp.addEventListener('focus', () => inp.select());
      inp.addEventListener('input', onEdit);
      arr.push(inp); el.appendChild(inp);
    }
    setGrid(arr, state);
  }
  const setGrid = (arr, s) => arr.forEach((inp, i) => inp.value = s[i] === '0' ? '_' : s[i]);
  function markInvalid(arr) {
    const vals = arr.map(i => { const v = i.value.trim(); return v === '' || v === '_' ? '0' : v; });
    arr.forEach((inp, i) => inp.classList.toggle('is-invalid', !/^[0-8]$/.test(vals[i]) || vals.filter(v => v === vals[i]).length > 1));
  }
  function getPuzzle() {
    const a = P.parseCells(initInputs.map(i => i.value)), b = P.parseCells(goalInputs.map(i => i.value)), errors = [];
    if (a.error) errors.push('Initial state: ' + a.error);
    if (b.error) errors.push('Goal state: ' + b.error);
    return { start: a.state, goal: b.state, errors, solvable: errors.length ? null : P.isSolvable(a.state, b.state) };
  }
  function showValidation() {
    markInvalid(initInputs); markInvalid(goalInputs);
    const p = getPuzzle(), box = $('validationMsg');
    if (p.errors.length) { box.className = 'alert alert-danger py-2 mt-2 mb-2 small'; box.innerHTML = p.errors.join('<br>'); }
    else if (!p.solvable) { box.className = 'alert alert-warning py-2 mt-2 mb-2 small'; box.textContent = 'Valid input, but this initial state can NOT reach the goal (inversion parity differs). Choose another state or use Generate Random Puzzle.'; }
    else { box.className = 'alert alert-success py-2 mt-2 mb-2 small'; box.textContent = 'Valid and solvable relative to the chosen goal.'; }
    if (!p.errors.length) { $('miniInit').innerHTML = mini(p.start, 'big'); $('miniGoal').innerHTML = mini(p.goal, 'big goal'); board.set(p.start, p.goal); }
    return p;
  }
  function onEdit() { resetAll(); showValidation(); }

  /* ---------- algorithm selection ---------- */
  enabled.forEach(a => { const o = document.createElement('option'); o.value = a; o.textContent = S.ALGORITHMS[a].name + (a === C.assignedAlgorithm ? '  ★ assigned' : ''); $('algoSelect').appendChild(o); });
  $('algoSelect').value = enabled.includes(C.assignedAlgorithm) ? C.assignedAlgorithm : enabled[0];
  $('nodeLimit').value = C.defaultNodeLimit;
  function syncParams() {
    const a = $('algoSelect').value;
    $('dlsWrap').style.display = a === 'dls' ? '' : 'none';
    $('iddlsWrap').style.display = a === 'iddls' ? '' : 'none';
    $('heurWrap').style.display = S.ALGORITHMS[a].informed ? '' : 'none';
    $('memoWrap').style.display = a === 'dls' || a === 'iddls' ? '' : 'none';
  }
  $('algoSelect').addEventListener('change', () => { resetAll(); syncParams(); });
  ['dlsLimit', 'iddlsMax', 'heuristic', 'nodeLimit', 'memoChk'].forEach(id => $(id).addEventListener('change', resetAll));
  const num = (id, def, min, max) => { const v = parseInt($(id).value, 10); return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def; };
  const readParams = () => ({ limit: num('dlsLimit', 10, 0, 60), maxDepth: num('iddlsMax', 40, 0, 60), heuristic: $('heuristic').value, memo: $('memoChk').checked, nodeLimit: num('nodeLimit', C.defaultNodeLimit, 100, 50000000) });

  /* ---------- playback state ---------- */
  let R = null; // { res, E, total, t, rs, playing, timer, start, goal }
  const SPEED_DELAY = [1200, 800, 550, 380, 260, 170, 100, 55, 25, 8];
  const delay = () => SPEED_DELAY[+$('speed').value - 1];
  const newRs = algo => ({ k: 0, fr: new Set(algo === 'iddls' ? [] : [0]), ex: [], L: null });
  function applyEv(rs, e) {
    if (e.reset) { rs.fr.clear(); rs.ex = []; rs.L = e.L; } else { rs.fr.delete(e.n); rs.ex.push(e.n); }
    for (const id of e.rm) rs.fr.delete(id);
    const order = STACK_ALGOS.includes(R.res.algo) ? e.ch.slice().reverse() : e.ch; // keep Set order == pop order
    for (const id of order) rs.fr.add(id);
    rs.k++;
  }
  function ensure(k) { if (k < R.rs.k) R.rs = newRs(R.res.algo); while (R.rs.k < k) applyEv(R.rs, R.res.events[R.rs.k]); }

  function stopTimer() { if (R) { R.playing = false; clearTimeout(R.timer); } }
  function resetAll() {
    stopTimer(); R = null;
    $('stepLabel').textContent = 'Not started'; $('boardCaption').textContent = 'Current state';
    $('curNode').textContent = '—'; $('parentNode').textContent = '—'; $('metrics').innerHTML = '';
    ['succList', 'frontList', 'expList', 'pathStrip'].forEach(id => $(id).textContent = '—');
    ['succNote', 'frontNote', 'expNote'].forEach(id => $(id).textContent = '');
    $('summary').innerHTML = '<span class="text-muted">Run an algorithm to see the summary.</span>';
    const p = getPuzzle(); if (!p.errors.length) board.set(p.start, p.goal);
    syncButtons();
  }

  /* ---------- rendering the current frame ---------- */
  function stat(k, v) { return '<div class="stat"><span>' + k + '</span><b>' + v + '</b></div>'; }
  function nodeItem(n, algo, label) {
    const inf = S.ALGORITHMS[algo].informed;
    return '<div class="chip">' + mini(n.s) + (label ? '<span>' + label + '</span>' : '') + '<span>g=' + n.g + (inf ? ' h=' + n.h + ' f=' + n.f : '') + '</span></div>';
  }
  function topFrontier(fr, algo, nodes, n) {
    if (algo === 'bfs') { const o = []; for (const id of fr) { o.push(id); if (o.length >= n) break; } return o; }
    if (STACK_ALGOS.includes(algo)) return Array.from(fr).slice(-n).reverse();
    const key = id => { const x = nodes[id]; return algo === 'astar' ? [x.f, x.h, id] : algo === 'ucs' ? [x.g, 0, id] : [x.h, x.g, id]; };
    const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2], best = [];
    for (const id of fr) {
      const k = key(id);
      if (best.length === n && cmp(k, best[n - 1].k) >= 0) continue;
      best.push({ id, k }); best.sort((x, y) => cmp(x.k, y.k)); if (best.length > n) best.pop();
    }
    return best.map(b => b.id);
  }
  function render() {
    const { res, E, t } = R, algo = res.algo, nodes = res.nodes, inf = S.ALGORITHMS[algo].informed;
    let state = R.start, ev = null;
    if (t >= 1 && t <= E) { ev = res.events[t - 1]; if (ev.n >= 0) state = nodes[ev.n].s; }
    else if (t > E) state = res.path[t - E - 1];
    board.set(state, R.goal);
    ensure(Math.min(t, E));
    const inSearch = t <= E;
    $('stepLabel').textContent = t === 0 ? 'Ready: step 0' : inSearch ? 'Search step ' + t + ' / ' + E + (R.playing && stride() > 1 ? '  (fast-forward ×' + stride() + ')' : '') : 'Solution move ' + (t - E - 1) + ' / ' + (res.path.length - 1);
    $('boardCaption').textContent = t === 0 ? 'Initial state' : inSearch ? (ev && ev.goal ? 'Goal node reached!' : 'Node being expanded') : (t - E - 1 === res.path.length - 1 ? 'Goal reached' : 'Solution path playback');
    // current / parent
    const pj = t > E ? t - E - 1 : -1;
    const cn = pj >= 0 ? nodes[res.pathIds[pj]] : (ev && ev.n >= 0 ? nodes[ev.n] : null);
    $('curNode').innerHTML = cn ? mini(cn.s, 'cur big') + (ev && ev.cut ? ' <span class="badge bg-warning text-dark">depth limit: not expanded</span>' : ev && ev.goal ? ' <span class="badge bg-success">goal</span>' : pj >= 0 ? ' <span class="badge bg-primary">solution step ' + pj + '</span>' : '') : '<span class="text-muted">' + (ev && ev.skip ? 'Iterations with depth limits 0–' + ev.L + ' were run (counted in the totals) but not animated: too many steps.' : ev && ev.reset ? 'New iteration: depth limit ' + ev.L : '—') + '</span>';
    $('parentNode').innerHTML = cn && cn.p >= 0 ? mini(nodes[cn.p].s, 'big') + ' <span class="small text-muted">via blank ' + ARROW[cn.mv] + ' ' + cn.mv + '</span>' : '<span class="text-muted">' + (cn ? '— (root)' : '—') + '</span>';
    const last = t >= E ? res.events[E - 1] : ev;
    let m = stat('Nodes generated', (t === 0 ? 0 : (t > E ? res.generated : ev.G)).toLocaleString()) + stat('Nodes expanded', (t === 0 ? 0 : (t > E ? res.expanded : ev.X)).toLocaleString());
    m += stat('Current depth', cn ? cn.d : 0) + stat('Path cost g(n)', cn ? cn.g : 0);
    if (inf) m += stat('Heuristic h(n)', cn ? cn.h : '—') + stat('Evaluation f(n)', cn ? cn.f : '—');
    if (algo === 'iddls' || algo === 'dls') m += stat(algo === 'dls' ? 'Depth limit' : 'Current depth limit', R.rs.L != null ? R.rs.L : (algo === 'dls' ? res.limitUsed : '—'));
    $('metrics').innerHTML = m;
    // successors
    if (ev && ev.n >= 0) {
      const kids = ev.ch.map(id => nodeItem(nodes[id], algo, ARROW[nodes[id].mv] + ' ' + nodes[id].mv)).join('');
      $('succList').innerHTML = ev.goal ? '<span class="text-success">Goal reached: no expansion needed.</span>' : ev.cut ? '<span class="text-warning">Cutoff: depth limit reached, successors not generated.</span>' : (kids || '<span class="text-muted">none queued</span>');
      $('succNote').textContent = ev.goal || ev.cut ? '' : '(' + ev.ch.length + ' queued' + (ev.dup ? ', ' + ev.dup + ' duplicate' + (ev.dup > 1 ? 's' : '') + ' skipped' : '') + (ev.rm.length ? ', ' + ev.rm.length + ' replaced by cheaper path' : '') + ')';
    } else { $('succList').innerHTML = '<span class="text-muted">—</span>'; $('succNote').textContent = ''; }
    // frontier / explored
    const fr = R.rs.fr, items = topFrontier(fr, algo, nodes, 8);
    $('frontNote').textContent = '(' + fr.size + ' nodes; next to be removed first' + (fr.size > 8 ? ', showing 8' : '') + ')';
    $('frontList').innerHTML = items.length ? items.map(id => nodeItem(nodes[id], algo)).join('') : '<span class="text-muted">empty</span>';
    const ex = R.rs.ex, shown = ex.slice(-8);
    $('expNote').textContent = '(' + ex.length + ' nodes' + (algo === 'iddls' ? ' in this iteration' : '') + (ex.length > 8 ? ', showing latest 8' : '') + ')';
    $('expList').innerHTML = shown.length ? shown.map(id => nodeItem(nodes[id], algo)).join('') : '<span class="text-muted">empty</span>';
    // summary & path
    if (t >= E) renderSummary(res); else $('summary').innerHTML = '<span class="text-muted">Search in progress… summary appears when the search ends.</span>';
    renderPath(res, t > E ? t - E - 1 : -1, t >= E);
    syncButtons();
  }
  const STATUS = { found: ['success', 'Solution Found'], failure: ['danger', 'Solution Not Found (space exhausted)'], cutoff: ['warning', 'Not Found within depth limit (CUTOFF)'], limit: ['secondary', 'Stopped: node limit reached'] };
  function renderSummary(res) {
    const [cls, label] = STATUS[res.status];
    $('summary').innerHTML = '<span class="badge bg-' + cls + ' badge-status mb-2">' + label + '</span><div class="small text-muted mb-2">' + res.message + '</div>' +
      stat('Algorithm', S.ALGORITHMS[res.algo].short + (S.ALGORITHMS[res.algo].informed ? ' (' + (res.params.heuristic === 'misplaced' ? 'Misplaced Tiles' : 'Manhattan') + ')' : res.algo === 'dls' ? ' (limit ' + res.limitUsed + ')' : '')) +
      stat('Total number of moves', res.status === 'found' ? res.moves.length : '—') + stat('Path cost', res.cost != null ? res.cost : '—') +
      stat('Total nodes generated', res.generated.toLocaleString()) + stat('Total nodes expanded', res.expanded.toLocaleString()) +
      stat('Maximum search depth', res.maxDepth) + (res.algo === 'iddls' ? stat('IDDLS iterations', res.iterations) : '') +
      stat('Execution time', res.timeMs.toFixed(2) + ' ms') + stat('Memory (approx.)', '≈ ' + res.memKB.toLocaleString() + ' KB (' + res.peakNodes.toLocaleString() + ' nodes peak)');
  }
  function renderPath(res, active, show) {
    const el = $('pathStrip');
    if (!show || res.status !== 'found') { el.innerHTML = show ? '<span class="text-muted">No solution path.</span>' : '<span class="text-muted">—</span>'; return; }
    const MAX = 120; let h = '';
    res.path.slice(0, MAX).forEach((s, i) => { h += '<div class="step ' + (i === active ? 'active' : '') + '"><b>Step ' + i + '</b>' + mini(s) + '<span>' + (i ? ARROW[res.moves[i - 1]] + ' ' + res.moves[i - 1] : 'start') + '</span></div>'; });
    if (res.path.length > MAX) h += '<span class="text-muted small">… ' + (res.path.length - MAX) + ' more steps (use Next Step / Jump controls to view them on the board)</span>';
    el.innerHTML = h;
    if (active >= 0) { const a = el.querySelector('.step.active'); if (a) el.scrollLeft = a.offsetLeft - 40; }
  }

  /* ---------- run & controls ---------- */
  function syncButtons() {
    const has = !!R, playing = has && R.playing;
    $('btnPause').disabled = !playing; $('btnResume').disabled = !has || playing || R.t >= R.total;
    $('btnNext').disabled = !has || R.t >= R.total; $('btnPrev').disabled = !has || R.t <= 0;
    $('btnSkip').disabled = !has || R.t > R.E; $('btnReset').disabled = !has;
  }
  const stride = () => !R ? 1 : R.t < R.E ? Math.max(1, Math.ceil(R.E / 250)) : Math.max(1, Math.ceil((R.total - R.E) / 150));
  function tick() {
    if (!R || !R.playing) return;
    if (R.t >= R.total) { R.playing = false; syncButtons(); return; }
    R.t = Math.min(R.t < R.E ? R.E : R.total, R.t + stride()); board.dur(Math.min(300, Math.round(delay() * 0.8))); render();
    if (R.t >= R.total) { R.playing = false; syncButtons(); return; }
    R.timer = setTimeout(tick, delay());
  }
  function play() { if (!R || R.t >= R.total) return; clearTimeout(R.timer); R.playing = true; syncButtons(); R.timer = setTimeout(tick, delay()); }
  function pause() { stopTimer(); syncButtons(); }
  function step(d) { if (!R) return; pause(); const t = R.t + d; if (t < 0 || t > R.total) return; R.t = t; board.dur(250); render(); }

  $('btnRun').addEventListener('click', () => {
    const p = showValidation();
    if (p.errors.length) return;
    if (!p.solvable) { alert('This puzzle is unsolvable for the chosen goal. Change the states or generate a random solvable puzzle.'); return; }
    resetAll(); $('btnRun').disabled = true; $('stepLabel').textContent = 'Searching…';
    setTimeout(() => {
      try {
        const algo = $('algoSelect').value, params = readParams();
        const res = S.runSearch(algo, p.start, p.goal, params);
        const E = res.events.length;
        R = { res, E, total: E + (res.status === 'found' ? res.path.length : 0), t: 0, rs: newRs(algo), playing: false, timer: null, start: p.start, goal: p.goal };
        render(); play();
      } catch (err) { alert('Search error: ' + err.message); }
      $('btnRun').disabled = false;
    }, 30);
  });
  $('btnPause').addEventListener('click', pause);
  $('btnResume').addEventListener('click', play);
  $('btnNext').addEventListener('click', () => step(1));
  $('btnPrev').addEventListener('click', () => step(-1));
  $('btnSkip').addEventListener('click', () => { if (!R) return; pause(); R.t = Math.min(R.total, R.E + 1); board.dur(250); render(); });
  $('btnReset').addEventListener('click', () => { resetAll(); showValidation(); });
  $('speed').addEventListener('input', () => { $('speedLbl').textContent = $('speed').value + ' / 10'; });
  $('speedLbl').textContent = $('speed').value + ' / 10';
  $('btnRandom').addEventListener('click', () => {
    const g = P.parseCells(goalInputs.map(i => i.value));
    if (g.error) { showValidation(); return; }
    setGrid(initInputs, P.randomSolvable(g.state)); onEdit();
  });
  $('btnSample').addEventListener('click', () => { setGrid(initInputs, '283164705'); setGrid(goalInputs, '123804765'); onEdit(); });
  $('btnStdGoal').addEventListener('click', () => { setGrid(goalInputs, P.STD_GOAL); onEdit(); });

  /* ---------- comparison ---------- */
  function refreshCompareHeader() {
    const p = getPuzzle();
    $('cmpInit').innerHTML = p.start ? mini(p.start, 'big') : '<i class="text-danger">invalid</i>';
    $('cmpGoal').innerHTML = p.goal ? mini(p.goal, 'big goal') : '<i class="text-danger">invalid</i>';
  }
  const CMP_STATUS = { found: ['Yes', 'success'], failure: ['No (failure)', 'danger'], cutoff: ['No (cutoff)', 'warning'], limit: ['No (node limit)', 'secondary'] };
  $('btnCompare').addEventListener('click', () => {
    const p = getPuzzle(), st = $('cmpStatus');
    if (p.errors.length) { st.textContent = p.errors[0]; return; }
    if (!p.solvable) { st.textContent = 'This puzzle is unsolvable for the chosen goal. Fix it on the Solver page.'; return; }
    const prm = readParams(), jobs = [];
    enabled.forEach(a => { if (S.ALGORITHMS[a].informed) ['manhattan', 'misplaced'].forEach(h => jobs.push([a, h])); else jobs.push([a, null]); });
    const tb = $('cmpTable').querySelector('tbody'); tb.innerHTML = ''; $('btnCompare').disabled = true;
    const rows = []; let i = 0;
    (function next() {
      if (i >= jobs.length) {
        const best = Math.min(...rows.filter(r => r.res.status === 'found').map(r => r.res.cost));
        rows.forEach(r => { if (r.res.status === 'found' && r.res.cost === best) r.tr.classList.add('best'); });
        st.textContent = 'Done. ' + (isFinite(best) ? 'Shortest solution: ' + best + ' moves.' : 'No algorithm found a solution.'); $('btnCompare').disabled = false; return;
      }
      const [a, h] = jobs[i++]; st.textContent = 'Running ' + S.ALGORITHMS[a].short + (h ? ' (' + h + ')' : '') + '…';
      setTimeout(() => {
        const res = S.runSearch(a, p.start, p.goal, { ...prm, heuristic: h || prm.heuristic, trace: false });
        const [lab, cls] = CMP_STATUS[res.status], tr = document.createElement('tr');
        const name = S.ALGORITHMS[a].short + (h ? ' (' + (h === 'manhattan' ? 'Manhattan' : 'Misplaced') + ')' : a === 'dls' ? ' (limit ' + prm.limit + ')' : a === 'iddls' ? ' (max ' + prm.maxDepth + ')' : '');
        tr.innerHTML = '<td><b>' + name + '</b></td><td><span class="badge bg-' + cls + '">' + lab + '</span></td><td>' + (res.cost != null ? res.cost : '–') + '</td><td>' + res.generated.toLocaleString() + '</td><td>' + res.expanded.toLocaleString() + '</td><td>' + res.maxDepth + '</td><td>' + res.timeMs.toFixed(2) + '</td><td>≈ ' + res.memKB.toLocaleString() + ' KB</td>';
        tb.appendChild(tr); rows.push({ res, tr }); next();
      }, 20);
    })();
  });

  /* ---------- algorithm info page ---------- */
  (function buildInfo() {
    const acc = $('algoAccordion'); let html = '';
    enabled.forEach((a, i) => {
      const d = ALGO_INFO[a], ul = arr => '<ul class="mb-2">' + arr.map(x => '<li>' + x + '</li>').join('') + '</ul>';
      html += '<div class="accordion-item"><h2 class="accordion-header"><button class="accordion-button ' + (i ? 'collapsed' : '') + '" type="button" data-bs-toggle="collapse" data-bs-target="#ai-' + a + '">' + S.ALGORITHMS[a].name + (a === C.assignedAlgorithm ? ' &nbsp;<span class="badge bg-primary">assigned</span>' : '') + '</button></h2>' +
        '<div id="ai-' + a + '" class="accordion-collapse collapse ' + (i ? '' : 'show') + '" data-bs-parent="#algoAccordion"><div class="accordion-body">' +
        '<p><b>Description.</b> ' + d.description + '</p><p><b>Working principle.</b> ' + d.principle + '</p>' +
        '<div class="row"><div class="col-md-6"><b>Advantages</b>' + ul(d.advantages) + '</div><div class="col-md-6"><b>Limitations</b>' + ul(d.limitations) + '</div></div>' +
        '<div class="table-responsive"><table class="table table-sm mb-0"><tr><th>Time complexity</th><td>' + d.time + '</td><th>Space complexity</th><td>' + d.space + '</td></tr><tr><th>Completeness</th><td>' + d.complete + '</td><th>Optimality</th><td>' + d.optimal + '</td></tr></table></div></div></div></div>';
    });
    acc.innerHTML = html;
    $('heurInfo').innerHTML = Object.values(HEURISTIC_INFO).map(h => '<p><b>' + h.name + '.</b> ' + h.text + '</p>').join('') + '<p class="small text-muted mb-0">b = branching factor (at most 3 here after removing the reverse move), d = depth of the shallowest solution, m = maximum depth, l = depth limit.</p>';
  })();

  /* ---------- init ---------- */
  buildGrid($('initGrid'), initInputs, '283164705', 'Initial');
  buildGrid($('goalGrid'), goalInputs, '123804765', 'Goal');
  syncParams(); showValidation(); syncButtons(); showPage();
})();
