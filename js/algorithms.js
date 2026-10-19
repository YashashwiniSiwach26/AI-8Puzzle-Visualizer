/* Search algorithms written from scratch. Every run optionally records a trace (events)
   that the UI replays; nothing is precomputed or hardcoded.
   Unit step cost = 1. "Expanded" = nodes removed from the frontier and examined (goal test + expansion).
   "Generated" = every successor created, including ones discarded as duplicates. */
(function (root) {
  'use strict';
  const P = (typeof require === 'function' && typeof module !== 'undefined') ? require('./puzzle.js') : root.Puzzle;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  const ALGORITHMS = {
    bfs:   { name: 'Breadth First Search (BFS)', short: 'BFS', informed: false },
    dfs:   { name: 'Depth First Search (DFS)', short: 'DFS', informed: false },
    dls:   { name: 'Depth Limited Search (DLS)', short: 'DLS', informed: false },
    iddls: { name: 'Iterative Deepening DLS (IDDLS)', short: 'IDDLS', informed: false },
    ucs:   { name: 'Uniform Cost Search (UCS)', short: 'UCS', informed: false },
    gbfs:  { name: 'Greedy Best First Search (GBFS)', short: 'GBFS', informed: true },
    astar: { name: 'A* Search', short: 'A*', informed: true }
  };

  // Binary min-heap; entries are [k1, k2, k3, id]; ties broken by creation order (k3).
  const less = (x, y) => x[0] !== y[0] ? x[0] < y[0] : x[1] !== y[1] ? x[1] < y[1] : x[2] < y[2];
  class Heap {
    constructor() { this.a = []; }
    get size() { return this.a.length; }
    push(x) {
      const a = this.a; a.push(x); let i = a.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (less(a[i], a[p])) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break; }
    }
    pop() {
      const a = this.a, top = a[0], last = a.pop();
      if (a.length) {
        a[0] = last; let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1; let m = i;
          if (l < a.length && less(a[l], a[m])) m = l;
          if (r < a.length && less(a[r], a[m])) m = r;
          if (m === i) break;
          [a[i], a[m]] = [a[m], a[i]]; i = m;
        }
      }
      return top;
    }
  }

  function runSearch(algo, start, goal, o) {
    o = o || {};
    if (!ALGORITHMS[algo]) throw new Error('Unknown algorithm: ' + algo);
    if (!P.validate(start).ok || !P.validate(goal).ok) throw new Error('Invalid start or goal state');
    const t0 = now();
    const trace = o.trace !== false;
    let nodeLimit = o.nodeLimit || 300000;
    if (trace && algo !== 'iddls') nodeLimit = Math.min(nodeLimit, 500000); // keep the animation trace a sane size
    const informed = ALGORITHMS[algo].informed;
    const H = informed ? P.makeHeuristic(o.heuristic || 'manhattan', goal) : null;
    const nodes = [], events = [];
    let generated = 0, expanded = 0, maxDepth = 0, peak = 0, status = 'failure', goalId = -1, iterations = 0;

    const mk = (s, p, mv) => {
      const g = p < 0 ? 0 : nodes[p].g + 1, h = H ? H(s) : 0;
      nodes.push({ s, p, g, d: g, h, f: g + h, mv, dead: false });
      if (g > maxDepth) maxDepth = g;
      return nodes.length - 1;
    };
    const rec = e => { if (trace) { e.G = generated; e.X = expanded; events.push(e); } };

    /* ---- BFS / DFS / UCS / GBFS / A*: graph search with frontier + closed set ---- */
    function generic() {
      const root = mk(start, -1, null);
      const inF = new Map([[start, root]]), closed = new Set();
      const queue = [], stack = [], heap = new Heap(); let qh = 0;
      const add = id => {
        const n = nodes[id];
        if (algo === 'bfs') queue.push(id);
        else if (algo === 'dfs') stack.push(id);
        else if (algo === 'astar') heap.push([n.f, n.h, id, id]);
        else if (algo === 'ucs') heap.push([n.g, 0, id, id]);
        else heap.push([n.h, n.g, id, id]); // gbfs
      };
      const next = () => {
        if (algo === 'bfs') { while (qh < queue.length) { const id = queue[qh++]; if (!nodes[id].dead) return id; } return -1; }
        if (algo === 'dfs') { while (stack.length) { const id = stack.pop(); if (!nodes[id].dead) return id; } return -1; }
        while (heap.size) { const id = heap.pop()[3]; if (!nodes[id].dead) return id; }
        return -1;
      };
      add(root);
      for (;;) {
        const id = next();
        if (id < 0) return 'failure';
        const n = nodes[id];
        inF.delete(n.s); closed.add(n.s); expanded++;
        peak = Math.max(peak, inF.size + closed.size + 1);
        if (n.s === goal) { goalId = id; rec({ n: id, goal: true, ch: [], rm: [], dup: 0 }); return 'found'; }
        const ch = [], rm = []; let dup = 0;
        for (const sc of P.neighbors(n.s)) {
          generated++;
          if (closed.has(sc.state)) { dup++; continue; }
          const ex = inF.get(sc.state);
          if (ex !== undefined) {
            if ((algo === 'ucs' || algo === 'astar') && n.g + 1 < nodes[ex].g) { nodes[ex].dead = true; rm.push(ex); }
            else { dup++; continue; }
          }
          const c = mk(sc.state, id, sc.move); inF.set(sc.state, c); ch.push(c);
        }
        if (algo === 'dfs') for (let i = ch.length - 1; i >= 0; i--) add(ch[i]); // first move explored first
        else for (const c of ch) add(c);
        rec({ n: id, ch, rm, dup });
        if (expanded >= nodeLimit) return 'limit';
      }
    }

    /* ---- One depth-limited pass. Returns 'found' | 'cutoff' | 'failure' | 'limit'.
       'cutoff' = the limit stopped some branch (a deeper solution may exist);
       'failure' = the space below the limit was fully searched with no cutoff (proven no solution).
       Per-state best-depth memo prunes repeated states without losing completeness within the limit. ---- */
    function dlsPass(limit, withReset) {
      if (o.memo === false) return dlsTree(limit, withReset);
      const root = mk(start, -1, null);
      if (withReset) rec({ n: -1, reset: true, L: limit, ch: [root], rm: [], dup: 0 });
      const seen = new Map([[start, root]]), stack = [root]; let cutoff = false;
      while (stack.length) {
        const id = stack.pop(), n = nodes[id];
        if (n.dead) continue;
        expanded++;
        peak = Math.max(peak, seen.size + stack.length);
        if (n.s === goal) { goalId = id; rec({ n: id, goal: true, ch: [], rm: [], dup: 0 }); return 'found'; }
        if (n.d >= limit) { cutoff = true; rec({ n: id, cut: true, ch: [], rm: [], dup: 0 }); }
        else {
          const ch = [], rm = []; let dup = 0;
          for (const sc of P.neighbors(n.s)) {
            generated++;
            const prev = seen.get(sc.state);
            if (prev !== undefined && nodes[prev].d <= n.d + 1) { dup++; continue; }
            if (prev !== undefined) { nodes[prev].dead = true; rm.push(prev); }
            const c = mk(sc.state, id, sc.move); seen.set(sc.state, c); ch.push(c);
          }
          for (let i = ch.length - 1; i >= 0; i--) stack.push(ch[i]);
          rec({ n: id, ch, rm, dup });
        }
        if (expanded >= nodeLimit) return 'limit';
      }
      return cutoff ? 'cutoff' : 'failure';
    }


    /* ---- Textbook depth-limited search (tree search). Only cycles along the CURRENT path are avoided
       (a state is never repeated among its own ancestors); no global visited set. This is the classic
       DLS/IDDLS definition. Cost: shallow states are re-expanded many times, so it needs more nodes. ---- */
    function dlsTree(limit, withReset) {
      const root = mk(start, -1, null);
      if (withReset) rec({ n: -1, reset: true, L: limit, ch: [root], rm: [], dup: 0 });
      const stack = [root]; let cutoff = false;
      while (stack.length) {
        const id = stack.pop(), n = nodes[id];
        expanded++;
        peak = Math.max(peak, stack.length + n.d + 1);
        if (n.s === goal) { goalId = id; rec({ n: id, goal: true, ch: [], rm: [], dup: 0 }); return 'found'; }
        if (n.d >= limit) { cutoff = true; rec({ n: id, cut: true, ch: [], rm: [], dup: 0 }); }
        else {
          const ch = []; let dup = 0;
          for (const sc of P.neighbors(n.s)) {
            generated++;
            let cyc = false;
            for (let a = id; a >= 0; a = nodes[a].p) if (nodes[a].s === sc.state) { cyc = true; break; }
            if (cyc) { dup++; continue; }
            ch.push(mk(sc.state, id, sc.move));
          }
          for (let i = ch.length - 1; i >= 0; i--) stack.push(ch[i]);
          rec({ n: id, ch, rm: [], dup });
        }
        if (expanded >= nodeLimit) return 'limit';
      }
      return cutoff ? 'cutoff' : 'failure';
    }

    let limitUsed = null;
    if (algo === 'dls') {
      limitUsed = Math.max(0, o.limit != null ? o.limit : 10);
      status = dlsPass(limitUsed, false);
    } else if (algo === 'iddls') {
      const maxD = o.maxDepth != null ? o.maxDepth : 50;
      status = 'cutoff';
      // Memory control: finished passes are moved out of `events`; if the retained trace grows past
      // traceCap, the OLDEST passes are dropped (their nodes freed) and replaced by one marker event.
      // Counters (generated/expanded/iterations) always cover every pass; only the animation is trimmed.
      const passes = [], traceCap = o.traceCap || 120000; let kept = 0, marker = null;
      for (let L = 0; L <= maxD; L++) {
        iterations++; limitUsed = L;
        const evS = events.length, ndS = nodes.length;
        status = dlsPass(L, true);
        if (status !== 'cutoff') break;
        if (!trace) { nodes.length = ndS; continue; }
        const ev = events.splice(evS);
        passes.push({ L, ev, ndS, ndE: nodes.length, G: generated, X: expanded }); kept += ev.length;
        while (kept > traceCap && passes.length) {
          const ps = passes.shift(); kept -= ps.ev.length;
          for (let i = ps.ndS; i < ps.ndE; i++) nodes[i] = null;
          marker = { n: -1, reset: true, skip: true, L: ps.L, ch: [], rm: [], dup: 0, G: ps.G, X: ps.X };
        }
      }
      if (trace) {
        const tail = events.splice(0), head = marker ? [marker] : [];
        for (const ps of passes) for (const e of ps.ev) head.push(e);
        for (const e of tail) head.push(e);
        events.push(...head.slice(0, 0)); for (const e of head) events.push(e);
      }
    } else status = generic();

    const path = [], moves = [], pathIds = [];
    if (goalId >= 0) {
      for (let i = goalId; i >= 0; i = nodes[i].p) { pathIds.push(i); path.push(nodes[i].s); if (nodes[i].mv) moves.push(nodes[i].mv); }
      path.reverse(); moves.reverse(); pathIds.reverse();
    }
    const msgs = {
      found: 'Solution found.',
      failure: 'No solution: the search space was exhausted (failure).',
      cutoff: 'No solution within the depth limit (cutoff). A deeper solution may still exist; this is NOT proof of unsolvability.',
      limit: 'Stopped: node limit reached. Result is inconclusive. ' + (algo === 'iddls' || algo === 'dls' ? (o.memo === false ? 'Tip: enable repeated-state pruning, or raise the node limit.' : 'Tip: raise the node limit.') : '')
    };
    return {
      algo, status, message: msgs[status], path, pathIds, moves, cost: status === 'found' ? moves.length : null,
      generated, expanded, maxDepth, iterations, limitUsed, params: o,
      timeMs: now() - t0, peakNodes: peak, memKB: Math.max(1, Math.round(peak * 64 / 1024)), // ~64 bytes per stored node (estimate)
      events, nodes
    };
  }

  const api = { ALGORITHMS, runSearch };
  root.Search = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
