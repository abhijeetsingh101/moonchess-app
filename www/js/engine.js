/* Pip's Chess Galaxy — chess rules engine, bot and mate solver.
   Squares 0..63, index = rank*8 + file (a1 = 0, h8 = 63). Pieces are 'wK','bP', etc. */
(function (root) {
  const FILES = 'abcdefgh';
  const sqName = i => FILES[i & 7] + ((i >> 3) + 1);
  const sqIdx = s => (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 8;
  const opp = c => (c === 'w' ? 'b' : 'w');
  const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  function parse(fen) {
    const [bd, turn, cas, ep, half, full] = fen.trim().split(/\s+/);
    const b = new Array(64).fill(null);
    let r = 7, f = 0;
    for (const ch of bd) {
      if (ch === '/') { r--; f = 0; continue; }
      if (/\d/.test(ch)) { f += +ch; continue; }
      const c = ch === ch.toUpperCase() ? 'w' : 'b';
      b[r * 8 + f] = c + ch.toUpperCase(); f++;
    }
    const c = cas || '-';
    return { b, turn: turn || 'w',
      castle: { wK: c.includes('K'), wQ: c.includes('Q'), bK: c.includes('k'), bQ: c.includes('q') },
      ep: ep && ep !== '-' ? sqIdx(ep) : null, half: +(half || 0), full: +(full || 1) };
  }
  function fen(p, short) {
    let s = '';
    for (let r = 7; r >= 0; r--) {
      let e = 0;
      for (let f = 0; f < 8; f++) {
        const x = p.b[r * 8 + f];
        if (!x) { e++; continue; }
        if (e) { s += e; e = 0; }
        s += x[0] === 'w' ? x[1] : x[1].toLowerCase();
      }
      if (e) s += e;
      if (r) s += '/';
    }
    const c = (p.castle.wK ? 'K' : '') + (p.castle.wQ ? 'Q' : '') + (p.castle.bK ? 'k' : '') + (p.castle.bQ ? 'q' : '');
    s += ' ' + p.turn + ' ' + (c || '-') + ' ' + (p.ep != null ? sqName(p.ep) : '-');
    return short ? s : s + ' ' + p.half + ' ' + p.full;
  }

  const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  const KG = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const RD = KG.slice(0, 4), BD = KG.slice(4);
  const on = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;

  function attacked(p, sq, by) {
    const f0 = sq & 7, r0 = sq >> 3, b = p.b;
    const pr = by === 'w' ? -1 : 1; // attacking pawn sits one rank "behind" the square
    for (const df of [-1, 1]) {
      const f = f0 + df, r = r0 + pr;
      if (on(f, r) && b[r * 8 + f] === by + 'P') return true;
    }
    for (const [df, dr] of KN) { const f = f0 + df, r = r0 + dr; if (on(f, r) && b[r * 8 + f] === by + 'N') return true; }
    for (const [df, dr] of KG) { const f = f0 + df, r = r0 + dr; if (on(f, r) && b[r * 8 + f] === by + 'K') return true; }
    for (const [dirs, kinds] of [[RD, 'RQ'], [BD, 'BQ']]) {
      for (const [df, dr] of dirs) {
        let f = f0 + df, r = r0 + dr;
        while (on(f, r)) {
          const x = b[r * 8 + f];
          if (x) { if (x[0] === by && kinds.includes(x[1])) return true; break; }
          f += df; r += dr;
        }
      }
    }
    return false;
  }
  const kingSq = (p, c) => p.b.indexOf(c + 'K');
  function inCheck(p, c) { const k = kingSq(p, c || p.turn); return k >= 0 && attacked(p, k, opp(c || p.turn)); }

  function pseudo(p, onlyFrom) {
    const out = [], b = p.b, me = p.turn, them = opp(me);
    const add = (from, to, extra) => out.push(Object.assign({ from, to, piece: b[from], cap: b[to] }, extra));
    for (let i = 0; i < 64; i++) {
      const x = b[i];
      if (!x || x[0] !== me) continue;
      if (onlyFrom != null && i !== onlyFrom) continue;
      const f0 = i & 7, r0 = i >> 3, t = x[1];
      if (t === 'P') {
        const d = me === 'w' ? 1 : -1, start = me === 'w' ? 1 : 6, last = me === 'w' ? 7 : 0;
        const push = (from, to, extra) => {
          if ((to >> 3) === last) for (const pr of 'QRBN') add(from, to, Object.assign({ promo: pr }, extra));
          else add(from, to, extra);
        };
        const one = (r0 + d) * 8 + f0;
        if (on(f0, r0 + d) && !b[one]) {
          push(i, one);
          const two = (r0 + 2 * d) * 8 + f0;
          if (r0 === start && !b[two]) add(i, two, { flag: 'double' });
        }
        for (const df of [-1, 1]) {
          const f = f0 + df, r = r0 + d;
          if (!on(f, r)) continue;
          const s = r * 8 + f;
          if (b[s] && b[s][0] === them) push(i, s);
          else if (p.ep === s) add(i, s, { flag: 'ep', cap: them + 'P' });
        }
        continue;
      }
      if (t === 'N' || t === 'K') {
        for (const [df, dr] of (t === 'N' ? KN : KG)) {
          const f = f0 + df, r = r0 + dr;
          if (!on(f, r)) continue;
          const s = r * 8 + f;
          if (!b[s] || b[s][0] === them) add(i, s);
        }
        if (t === 'K') {
          const home = me === 'w' ? 4 : 60;
          if (i === home && !attacked(p, home, them)) {
            if (p.castle[me + 'K'] && b[home + 3] === me + 'R' && !b[home + 1] && !b[home + 2] &&
              !attacked(p, home + 1, them) && !attacked(p, home + 2, them)) add(i, home + 2, { flag: 'castleK' });
            if (p.castle[me + 'Q'] && b[home - 4] === me + 'R' && !b[home - 1] && !b[home - 2] && !b[home - 3] &&
              !attacked(p, home - 1, them) && !attacked(p, home - 2, them)) add(i, home - 2, { flag: 'castleQ' });
          }
        }
        continue;
      }
      const dirs = t === 'R' ? RD : t === 'B' ? BD : KG;
      for (const [df, dr] of dirs) {
        let f = f0 + df, r = r0 + dr;
        while (on(f, r)) {
          const s = r * 8 + f;
          if (b[s]) { if (b[s][0] === them) add(i, s); break; }
          add(i, s); f += df; r += dr;
        }
      }
    }
    return out;
  }

  function make(p, m, keepTurn) {
    const b = p.b.slice(), me = m.piece[0];
    const castle = Object.assign({}, p.castle);
    b[m.to] = m.promo ? me + m.promo : m.piece;
    b[m.from] = null;
    if (m.flag === 'ep') b[m.to + (me === 'w' ? -8 : 8)] = null;
    if (m.flag === 'castleK') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = null; }
    if (m.flag === 'castleQ') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = null; }
    if (m.piece[1] === 'K') { castle[me + 'K'] = false; castle[me + 'Q'] = false; }
    for (const [s, k] of [[0, 'wQ'], [7, 'wK'], [56, 'bQ'], [63, 'bK']]) if (m.from === s || m.to === s) castle[k] = false;
    return {
      b, castle,
      turn: keepTurn ? p.turn : opp(p.turn),
      ep: m.flag === 'double' ? (m.from + m.to) / 2 : null,
      half: m.piece[1] === 'P' || m.cap ? 0 : p.half + 1,
      full: p.full + (me === 'b' ? 1 : 0)
    };
  }

  function legal(p, onlyFrom) {
    return pseudo(p, onlyFrom).filter(m => !inCheck(make(p, m), p.turn));
  }

  function insufficient(p) {
    const left = p.b.filter(x => x && x[1] !== 'K');
    if (!left.length) return true;
    if (left.length === 1 && 'NB'.includes(left[0][1])) return true;
    return false;
  }
  // history: array of short FENs of earlier positions (for repetition)
  function status(p, history) {
    const moves = legal(p);
    if (!moves.length) return inCheck(p) ? 'checkmate' : 'stalemate';
    if (p.half >= 100) return 'fifty';
    if (insufficient(p)) return 'insufficient';
    if (history) { const k = fen(p, true); if (history.filter(h => h === k).length >= 2) return 'repetition'; }
    return null;
  }

  function san(p, m) {
    let s;
    if (m.flag === 'castleK') s = 'O-O';
    else if (m.flag === 'castleQ') s = 'O-O-O';
    else {
      const t = m.piece[1];
      if (t === 'P') s = (m.cap ? FILES[m.from & 7] + 'x' : '') + sqName(m.to) + (m.promo ? '=' + m.promo : '');
      else {
        const twins = legal(p).filter(o => o.piece === m.piece && o.to === m.to && o.from !== m.from);
        let dis = '';
        if (twins.length) {
          const sameF = twins.some(o => (o.from & 7) === (m.from & 7));
          const sameR = twins.some(o => (o.from >> 3) === (m.from >> 3));
          dis = !sameF ? FILES[m.from & 7] : !sameR ? String((m.from >> 3) + 1) : sqName(m.from);
        }
        s = t + dis + (m.cap ? 'x' : '') + sqName(m.to);
      }
    }
    const n = make(p, m);
    if (inCheck(n)) s += legal(n).length ? '+' : '#';
    return s;
  }
  const uci = m => sqName(m.from) + sqName(m.to) + (m.promo ? m.promo.toLowerCase() : '');
  function fromUci(p, u) {
    return legal(p).find(m => uci(m) === u || (uci(m) === u + 'q')) || null;
  }

  // ---------- evaluation ----------
  const PST = {
    P: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, -20, -20, 10, 10, 5, 5, -5, -10, 0, 0, -10, -5, 5, 0, 0, 0, 20, 20, 0, 0, 0,
      5, 5, 10, 25, 25, 10, 5, 5, 10, 10, 20, 30, 30, 20, 10, 10, 50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0],
    N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 5, 5, 0, -20, -40, -30, 5, 10, 15, 15, 10, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30,
      -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 10, 15, 15, 10, 0, -30, -40, -20, 0, 0, 0, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 5, 0, 0, 0, 0, 5, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 0, 10, 10, 10, 10, 0, -10,
      -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    R: [0, 0, 0, 5, 5, 0, 0, 0, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 5, 10, 10, 10, 10, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 5, 0, 0, 0, 0, -10, -10, 5, 5, 5, 5, 5, 0, -10, 0, 0, 5, 5, 5, 5, 0, -5,
      -5, 0, 5, 5, 5, 5, 0, -5, -10, 0, 5, 5, 5, 5, 0, -10, -10, 0, 0, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    K: [20, 30, 10, 0, 0, 10, 30, 20, 20, 20, 0, 0, 0, 0, 20, 20, -10, -20, -20, -20, -20, -20, -20, -10, -20, -30, -30, -40, -40, -30, -30, -20,
      -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30],
    KE: [-50, -30, -30, -30, -30, -30, -30, -50, -30, -30, 0, 0, 0, 0, -30, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -20, -10, 0, 0, -10, -20, -30, -50, -40, -30, -20, -20, -30, -40, -50]
  };
  function evaluate(p) { // from side to move's perspective
    let s = 0, mat = 0;
    for (const x of p.b) if (x && x[1] !== 'K' && x[1] !== 'P') mat += VAL[x[1]];
    const endgame = mat <= 2600;
    for (let i = 0; i < 64; i++) {
      const x = p.b[i];
      if (!x) continue;
      const w = x[0] === 'w', idx = w ? i : (7 - (i >> 3)) * 8 + (i & 7);
      const tbl = x[1] === 'K' && endgame ? PST.KE : PST[x[1]];
      const v = VAL[x[1]] + tbl[idx];
      s += w ? v : -v;
    }
    return p.turn === 'w' ? s : -s;
  }
  const order = ms => ms.sort((a, b) => ((b.cap ? 10 * VAL[b.cap[1]] - VAL[b.piece[1]] : 0) + (b.promo ? 800 : 0)) -
    ((a.cap ? 10 * VAL[a.cap[1]] - VAL[a.piece[1]] : 0) + (a.promo ? 800 : 0)));
  const MATE = 100000;
  let nodes = 0;
  function quiesce(p, a, beta, d) {
    nodes++;
    const stand = evaluate(p);
    if (stand >= beta) return beta;
    if (stand > a) a = stand;
    if (d <= 0) return a;
    for (const m of order(legal(p).filter(m => m.cap || m.promo))) {
      const v = -quiesce(make(p, m), -beta, -a, d - 1);
      if (v >= beta) return beta;
      if (v > a) a = v;
    }
    return a;
  }
  function negamax(p, depth, a, beta, ply) {
    nodes++;
    const ms = legal(p);
    if (!ms.length) return inCheck(p) ? -MATE + ply : 0;
    if (p.half >= 100) return 0;
    if (depth <= 0) return quiesce(p, a, beta, 4);
    for (const m of order(ms)) {
      const v = -negamax(make(p, m), depth - 1, -beta, -a, ply + 1);
      if (v >= beta) return beta;
      if (v > a) a = v;
    }
    return a;
  }
  // score every root move at the given depth
  function scoreMoves(p, depth) {
    const ms = order(legal(p));
    return ms.map(m => ({ m, s: -negamax(make(p, m), depth - 1, -MATE - 1, MATE + 1, 1) }))
      .sort((x, y) => y.s - x.s);
  }
  function best(p, depth) { const r = scoreMoves(p, depth); return r.length ? r[0] : null; }

  const LEVELS = {
    sleepy: { depth: 1, noise: 220, random: 0.35 },
    cadet: { depth: 2, noise: 60, random: 0.06 },
    captain: { depth: 3, noise: 12, random: 0 }
  };
  function botMove(p, level, rnd) {
    rnd = rnd || Math.random;
    const L = LEVELS[level] || LEVELS.cadet;
    const ms = legal(p);
    if (!ms.length) return null;
    // always take a mate in one at every level
    for (const m of ms) { const n = make(p, m); if (inCheck(n) && !legal(n).length) return m; }
    if (rnd() < L.random) return ms[Math.floor(rnd() * ms.length)];
    const scored = scoreMoves(p, L.depth).map(x => ({ m: x.m, s: x.s + (rnd() * 2 - 1) * L.noise }));
    scored.sort((a, b) => b.s - a.s);
    return scored[0].m;
  }

  // ---------- mate solver ----------
  function isMate(p) { return inCheck(p) && !legal(p).length; }
  function mateIn(p, n) { // side to move can force mate in n moves
    for (const m of legal(p)) if (forces(make(p, m), n)) return true;
    return false;
  }
  function forces(after, n) { // after attacker's move: is it mate now or forced mate in n-1 more?
    if (isMate(after)) return true;
    if (n <= 1) return false;
    const replies = legal(after);
    if (!replies.length) return false; // stalemate
    return replies.every(r => mateIn(make(after, r), n - 1));
  }
  function mateMoves(p, n) { return legal(p).filter(m => forces(make(p, m), n)); }
  function bestDefence(after, n) { // pick the reply that delays mate the longest
    const replies = legal(after);
    let pick = replies[0], worst = -1;
    for (const r of replies) {
      const q = make(after, r);
      let k = 1; while (k <= n && !mateIn(q, k)) k++;
      if (k > worst) { worst = k; pick = r; }
    }
    return pick;
  }

  function perft(p, d) {
    if (d === 0) return 1;
    let n = 0;
    for (const m of legal(p)) n += perft(make(p, m), d - 1);
    return n;
  }

  const api = { START, parse, fen, legal, make, inCheck, status, san, uci, fromUci, sqName, sqIdx, opp,
    evaluate, best, scoreMoves, botMove, isMate, mateIn, mateMoves, bestDefence, attacked, perft, VAL,
    nodes: () => nodes };
  root.Chess = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
