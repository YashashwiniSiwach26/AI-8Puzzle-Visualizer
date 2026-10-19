/* Run with:  node tests/run-tests.js   (no dependencies) */
const P = require('../js/puzzle.js');
const S = require('../js/algorithms.js');
const GOAL = P.STD_GOAL;
let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('  PASS  ' + name); } catch (e) { fail++; console.log('  FAIL  ' + name + '\n        ' + e.message); } };
const eq = (a, b, m) => { if (a !== b) throw new Error((m || 'expected') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assertion failed'); };
function validPath(res, start, goal) {
  let s = start;
  for (const m of res.moves) { s = P.applyMove(s, m); ok(s !== null, 'illegal move ' + m); }
  eq(s, goal, 'path does not end at goal');
  eq(res.path[0], start, 'path start'); eq(res.path[res.path.length - 1], goal, 'path end');
  eq(res.path.length, res.moves.length + 1, 'path/moves length');
}
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
function walk(goal, n) { let s = goal, prev = null; for (let i = 0; i < n; i++) { const c = P.neighbors(s).filter(x => x.state !== prev); prev = s; s = c[Math.floor(rnd() * c.length)].state; } return s; }
const ALL = ['bfs', 'dfs', 'dls', 'iddls', 'ucs', 'gbfs', 'astar'];

console.log('Input validation');
t('accepts a valid state', () => ok(P.validate('283164705').ok));
t('rejects duplicate tiles', () => ok(!P.validate('223164705').ok));
t('rejects missing blank', () => ok(!P.validate('283164755').ok));
t('rejects wrong length', () => ok(!P.validate('12345678').ok));
t('rejects non-digits / 9', () => { ok(!P.validate('12345678x').ok); ok(!P.validate('923456780').ok); });
t('parseCells maps _ and empty to blank', () => eq(P.parseCells(['1','2','3','4','5','6','7','8','_']).state, GOAL));
t('parseCells rejects "9" and "a"', () => { ok(P.parseCells(['9','2','3','4','5','6','7','8','_']).error); ok(P.parseCells(['a','2','3','4','5','6','7','8','_']).error); });

console.log('Solvability');
t('standard goal is solvable from itself', () => ok(P.isSolvable(GOAL, GOAL)));
t('swapped 7/8 is unsolvable vs standard goal', () => ok(!P.isSolvable('123456870', GOAL)));
t('assignment example is solvable', () => ok(P.isSolvable('283164705', '123804765')));
t('solvability is relative to the goal (custom goal)', () => { ok(!P.isSolvable('123456780', '123456870')); ok(P.isSolvable('123456870', '123456870')); ok(P.isSolvable('123456870', '213456780')); });
t('50 random puzzles are solvable & not already solved', () => { for (let i = 0; i < 50; i++) { const s = P.randomSolvable(GOAL, rnd); ok(P.isSolvable(s, GOAL) && s !== GOAL); } });
t('random puzzles respect a custom goal', () => { const g = '123804765'; for (let i = 0; i < 20; i++) ok(P.isSolvable(P.randomSolvable(g, rnd), g)); });

console.log('Heuristics (blank excluded, custom goals)');
t('goal -> 0 for both', () => { eq(P.makeHeuristic('misplaced', GOAL)(GOAL), 0); eq(P.makeHeuristic('manhattan', GOAL)(GOAL), 0); });
t('one move away -> 1 for both', () => { eq(P.makeHeuristic('misplaced', GOAL)('123456708'), 1); eq(P.makeHeuristic('manhattan', GOAL)('123456708'), 1); });
t('assignment example: misplaced=4 (tiles 2,8,1,6), manhattan=5', () => { eq(P.makeHeuristic('misplaced', '123804765')('283164705'), 4); eq(P.makeHeuristic('manhattan', '123804765')('283164705'), 5); });
t('manhattan on swapped 1<->3 row = 4', () => eq(P.makeHeuristic('manhattan', GOAL)('321456780'), 4));
t('heuristic uses the custom goal', () => eq(P.makeHeuristic('manhattan', '123804765')('123804765'), 0));

console.log('Trivial cases (all 7 algorithms)');
for (const a of ALL) {
  t(a + ': already solved -> 0 moves', () => { const r = S.runSearch(a, GOAL, GOAL, { limit: 0 }); eq(r.status, 'found'); eq(r.moves.length, 0); validPath(r, GOAL, GOAL); });
  t(a + ': one move -> 1 move', () => { const s = '123456708'; const r = S.runSearch(a, s, GOAL, { limit: 1 }); eq(r.status, 'found'); eq(r.cost, 1); validPath(r, s, GOAL); });
}

console.log('Correctness & optimality on the assignment example (optimal = 5)');
const EX = '283164705', EG = '123804765';
for (const a of ALL) t(a + ' finds a valid path', () => { const r = S.runSearch(a, EX, EG, { limit: 30 }); eq(r.status, 'found'); validPath(r, EX, EG); });
for (const [a, h] of [['bfs'], ['ucs'], ['iddls'], ['astar', 'manhattan'], ['astar', 'misplaced']])
  t(a + (h ? ' (' + h + ')' : '') + ' is optimal (5 moves)', () => eq(S.runSearch(a, EX, EG, { heuristic: h }).cost, 5));
t('DLS with limit 5 finds it; limit 12 finds a valid (maybe longer) path', () => { eq(S.runSearch('dls', EX, EG, { limit: 5 }).status, 'found'); const r = S.runSearch('dls', EX, EG, { limit: 12 }); eq(r.status, 'found'); validPath(r, EX, EG); });

console.log('Depth limit: cutoff vs failure');
t('DLS limit 4 < optimal 5 -> cutoff (not failure)', () => eq(S.runSearch('dls', EX, EG, { limit: 4 }).status, 'cutoff'));
t('DLS limit 0, start != goal -> cutoff', () => eq(S.runSearch('dls', EX, EG, { limit: 0 }).status, 'cutoff'));
t('DLS cutoff result has no path and null cost', () => { const r = S.runSearch('dls', EX, EG, { limit: 3 }); eq(r.path.length, 0); eq(r.cost, null); });
t('IDDLS with max depth 3 -> cutoff; depth 5 -> found', () => { eq(S.runSearch('iddls', EX, EG, { maxDepth: 3 }).status, 'cutoff'); eq(S.runSearch('iddls', EX, EG, { maxDepth: 5 }).status, 'found'); });
t('IDDLS iterates limits 0..5 for an optimal-5 puzzle', () => { const r = S.runSearch('iddls', EX, EG); eq(r.iterations, 6); eq(r.limitUsed, 5); });

console.log('Unsolvable / node limit');
const BAD = '123456870';
t('BFS on unsolvable state exhausts all 181,440 reachable states -> failure', () => { const r = S.runSearch('bfs', BAD, GOAL, { trace: false, nodeLimit: 1e6 }); eq(r.status, 'failure'); eq(r.expanded, 181440); });
t('A* on unsolvable state -> failure', () => eq(S.runSearch('astar', BAD, GOAL, { trace: false, nodeLimit: 1e6 }).status, 'failure'));
t('node limit gives status "limit", not failure', () => eq(S.runSearch('bfs', BAD, GOAL, { trace: false, nodeLimit: 100 }).status, 'limit'));

console.log('Optimality cross-check on random solvable puzzles (BFS == UCS == A*)');
t('12 random puzzles: BFS, UCS, A*(manh), A*(misp) agree and paths valid', () => {
  for (let i = 0; i < 12; i++) {
    const s = P.randomSolvable(GOAL, rnd), o = { trace: false, nodeLimit: 1e6 };
    const b = S.runSearch('bfs', s, GOAL, o), u = S.runSearch('ucs', s, GOAL, o);
    const am = S.runSearch('astar', s, GOAL, { ...o, heuristic: 'manhattan' }), ap = S.runSearch('astar', s, GOAL, { ...o, heuristic: 'misplaced' });
    for (const r of [b, u, am, ap]) { eq(r.status, 'found'); validPath(r, s, GOAL); }
    eq(u.cost, b.cost, 'UCS vs BFS ' + s); eq(am.cost, b.cost, 'A*manh vs BFS ' + s); eq(ap.cost, b.cost, 'A*misp vs BFS ' + s);
    ok(am.expanded <= ap.expanded * 1.5 + 5, 'manhattan should not be far worse than misplaced');
  }
});
t('IDDLS matches BFS on 10 puzzles within 14 random moves of a custom goal', () => {
  for (let i = 0; i < 10; i++) {
    const g = '123804765', s = walk(g, 14), b = S.runSearch('bfs', s, g, { trace: false }), d = S.runSearch('iddls', s, g, { trace: false });
    eq(d.status, 'found'); eq(d.cost, b.cost, 'IDDLS vs BFS ' + s); validPath(d, s, g);
  }
});
t('DFS and GBFS return valid (not necessarily optimal) paths on 8 random puzzles', () => {
  for (let i = 0; i < 8; i++) { const s = P.randomSolvable(GOAL, rnd); for (const a of ['dfs', 'gbfs']) { const r = S.runSearch(a, s, GOAL, { trace: false, nodeLimit: 1e6 }); eq(r.status, 'found'); validPath(r, s, GOAL); } }
});
t('custom goal: all optimal algorithms agree', () => {
  const g = '876543210'.replace('0', '0'), s = P.randomSolvable(g, rnd);
  const c = ['bfs', 'ucs', 'astar'].map(a => S.runSearch(a, s, g, { trace: false }).cost); eq(c[0], c[1]); eq(c[0], c[2]);
});

console.log('Statistics sanity');
t('stats are real & consistent', () => {
  const r = S.runSearch('astar', '283164705', '123804765');
  ok(r.generated >= r.expanded && r.expanded > 0 && r.maxDepth >= r.cost && r.timeMs >= 0 && r.memKB >= 1);
  eq(r.events.length, r.expanded, 'one trace event per expanded node'); ok(r.events[r.events.length - 1].goal, 'last event is goal');
});
t('A* with Manhattan expands fewer nodes than BFS on the example', () => ok(S.runSearch('astar', EX, EG).expanded < S.runSearch('bfs', EX, EG).expanded));
t('trace:false records no events', () => eq(S.runSearch('bfs', EX, EG, { trace: false }).events.length, 0));


console.log('IDDLS: textbook mode, large puzzles, trimmed trace');
t('textbook IDDLS (memo:false) matches BFS on 10 shallow puzzles', () => {
  for (let i = 0; i < 10; i++) { const s = walk(GOAL, 12), b = S.runSearch('bfs', s, GOAL, { trace: false }), d = S.runSearch('iddls', s, GOAL, { trace: false, memo: false });
    eq(d.status, 'found'); eq(d.cost, b.cost, 'textbook IDDLS vs BFS ' + s); validPath(d, s, GOAL); }
});
t('textbook DLS: limit below optimal -> cutoff, at optimal -> found', () => { eq(S.runSearch('dls', EX, EG, { limit: 4, memo: false }).status, 'cutoff'); eq(S.runSearch('dls', EX, EG, { limit: 5, memo: false }).status, 'found'); });
t('textbook IDDLS never repeats a state on its own path', () => { const r = S.runSearch('iddls', EX, EG, { memo: false }); eq(new Set(r.path).size, r.path.length); });
t('IDDLS (pruned) solves the 31-move puzzle 867254301 optimally with default-size limit', () => {
  const r = S.runSearch('iddls', '867254301', GOAL, { trace: false, nodeLimit: 8000000, maxDepth: 50 }); eq(r.status, 'found'); eq(r.cost, 31); validPath(r, '867254301', GOAL);
});
t('IDDLS (pruned) solves 15 random puzzles of ANY depth and matches BFS', () => {
  for (let i = 0; i < 15; i++) { const s = P.randomSolvable(GOAL, rnd), b = S.runSearch('bfs', s, GOAL, { trace: false }), d = S.runSearch('iddls', s, GOAL, { trace: false, nodeLimit: 8000000 });
    eq(d.status, 'found', s); eq(d.cost, b.cost, 'IDDLS vs BFS ' + s); validPath(d, s, GOAL); }
});
t('trimmed trace stays replayable (no freed node referenced) and keeps true totals', () => {
  const s = '806547231', full = S.runSearch('iddls', s, GOAL, { trace: false, nodeLimit: 8000000 }), r = S.runSearch('iddls', s, GOAL, { trace: true, nodeLimit: 8000000, traceCap: 20000 });
  eq(r.status, 'found'); eq(r.cost, 27); eq(r.expanded, full.expanded, 'totals unaffected by trimming'); ok(r.events[0].skip, 'first event is the skipped-iterations marker');
  ok(r.events.length < r.expanded / 4, 'trace was trimmed');
  const fr = new Set(); for (const e of r.events) { if (e.reset) fr.clear(); else fr.delete(e.n); for (const id of e.rm) fr.delete(id); for (const id of e.ch) fr.add(id); if (e.n >= 0) ok(r.nodes[e.n], 'expanded node freed'); for (const id of fr) ok(r.nodes[id], 'frontier references freed node'); if (fr.size > 200) fr.clear(); }
  ok(r.pathIds.every(i => r.nodes[i]) && r.pathIds.length === r.path.length, 'pathIds valid');
});
t('pathIds line up with path states', () => { const r = S.runSearch('astar', EX, EG); eq(r.pathIds.map(i => r.nodes[i].s).join(), r.path.join()); });

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
