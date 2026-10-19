/* Puzzle model: states are 9-char strings, row-major, '0' = blank. */
(function (root) {
  'use strict';
  const STD_GOAL = '123456780';
  const DIRS = [['Up', -1, 0], ['Down', 1, 0], ['Left', 0, -1], ['Right', 0, 1]]; // direction the BLANK moves

  function validate(s) {
    if (typeof s !== 'string' || s.length !== 9) return { ok: false, error: 'A state needs exactly 9 cells.' };
    if (!/^[0-8]{9}$/.test(s)) return { ok: false, error: 'Use only the digits 0-8 (0 or _ = blank).' };
    const miss = [], dup = [];
    for (let d = 0; d <= 8; d++) {
      const n = s.split(String(d)).length - 1;
      if (n === 0) miss.push(d === 0 ? '_' : d);
      if (n > 1) dup.push(d === 0 ? '_' : d);
    }
    if (miss.length || dup.length)
      return { ok: false, error: 'Each of 1-8 and the blank must appear exactly once.' +
        (dup.length ? ' Repeated: ' + dup.join(', ') + '.' : '') + (miss.length ? ' Missing: ' + miss.join(', ') + '.' : '') };
    return { ok: true };
  }
  function parseCells(cells) {
    let s = '';
    for (const raw of cells) {
      const c = String(raw).trim();
      if (c === '' || c === '_' || c === '0') s += '0';
      else if (/^[1-8]$/.test(c)) s += c;
      else return { error: 'Invalid cell "' + c + '". Use 1-8, or _ / empty for the blank.' };
    }
    const v = validate(s);
    return v.ok ? { state: s } : { error: v.error };
  }
  function inversions(s) {
    let n = 0;
    for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++)
      if (s[i] !== '0' && s[j] !== '0' && s[i] > s[j]) n++;
    return n;
  }
  // 3x3 (odd width): reachable iff inversion parity of start equals parity of goal.
  function isSolvable(start, goal) {
    if (!validate(start).ok || !validate(goal).ok) return false;
    return inversions(start) % 2 === inversions(goal) % 2;
  }
  function neighbors(s) {
    const z = s.indexOf('0'), r = (z / 3) | 0, c = z % 3, out = [];
    for (const [name, dr, dc] of DIRS) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr > 2 || nc < 0 || nc > 2) continue;
      const t = nr * 3 + nc, a = s.split('');
      a[z] = a[t]; a[t] = '0';
      out.push({ state: a.join(''), move: name, tile: s[t] });
    }
    return out;
  }
  function applyMove(s, move) {
    const m = neighbors(s).find(x => x.move === move);
    return m ? m.state : null;
  }
  // Heuristics never count the blank. Work for any goal.
  function makeHeuristic(name, goal) {
    const pos = [];
    for (let i = 0; i < 9; i++) pos[+goal[i]] = i;
    if (name === 'misplaced') return s => { let n = 0; for (let i = 0; i < 9; i++) if (s[i] !== '0' && s[i] !== goal[i]) n++; return n; };
    return s => {
      let d = 0;
      for (let i = 0; i < 9; i++) {
        const t = +s[i]; if (!t) continue;
        const j = pos[t];
        d += Math.abs(((i / 3) | 0) - ((j / 3) | 0)) + Math.abs((i % 3) - (j % 3));
      }
      return d;
    };
  }
  function randomSolvable(goal, rnd) {
    rnd = rnd || Math.random;
    let s;
    do {
      const a = '012345678'.split('');
      for (let i = 8; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      s = a.join('');
    } while (s === goal || !isSolvable(s, goal));
    return s;
  }
  const api = { STD_GOAL, validate, parseCells, inversions, isSolvable, neighbors, applyMove, makeHeuristic, randomSolvable };
  root.Puzzle = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
