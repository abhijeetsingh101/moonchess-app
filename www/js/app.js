/* MoonChess — app: state, board, missions, games, puzzles, profile. */
{
const K = window.CONTENT, C = window.Chess;
const GLYPH = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
const PNAME = { K: 'king', Q: 'queen', R: 'rook', B: 'bishop', N: 'knight', P: 'pawn' };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- save state ---------------- */
const DEF = { v: 1, xp: 0, done: {}, puzzles: {}, daily: {}, days: [], bestStreak: 0, wins: { sleepy: 0, cadet: 0, captain: 0 },
  games: 0, theme: 'nebula', skin: 'classic', sound: true, fx: true, badges: {}, rank: 0,
  prefs: { bot: 'sleepy', color: 'w' } };
const clone = o => JSON.parse(JSON.stringify(o));
function merge(s) { const d = clone(DEF); if (!s || typeof s !== 'object') return d;
  for (const k in d) if (k in s) d[k] = (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) ? Object.assign(d[k], s[k]) : s[k];
  return d; }
let S = clone(DEF);
try { S = merge(JSON.parse(localStorage.getItem('pipgalaxy'))); } catch (e) { }
function store() { try { localStorage.setItem('pipgalaxy', JSON.stringify(S)); } catch (e) { } }

const pad = n => String(n).padStart(2, '0');
const dayStr = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => dayStr(new Date());
function streak() {
  const set = new Set(S.days), d = new Date();
  if (!set.has(dayStr(d))) d.setDate(d.getDate() - 1);
  let n = 0; while (set.has(dayStr(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function recordDay() {
  const t = today();
  if (!S.days.includes(t)) { S.days.push(t); if (S.days.length > 400) S.days = S.days.slice(-400); }
  S.bestStreak = Math.max(S.bestStreak, streak());
}
const rankIdx = xp => { let i = 0; K.ranks.forEach((r, j) => { if (xp >= r.xp) i = j; }); return i; };
function rankInfo() {
  const i = rankIdx(S.xp), r = K.ranks[i], nx = K.ranks[i + 1];
  return { i, name: r.name, next: nx, pct: nx ? Math.round((S.xp - r.xp) / (nx.xp - r.xp) * 100) : 100 };
}
function addXp(n) { S.xp += n; }

/* toasts */
const tq = []; let tbusy = false;
function toast(t, d) { tq.push([t, d]); if (!tbusy) nextToast(); }
function nextToast() {
  const x = tq.shift(); if (!x) { tbusy = false; return; }
  tbusy = true; $('toastT').textContent = x[0]; $('toastD').textContent = x[1];
  $('toast').classList.add('on'); FX.sfx('badge');
  setTimeout(() => { $('toast').classList.remove('on'); setTimeout(nextToast, 400); }, 2800);
}
function afterProgress() {
  recordDay();
  for (const b of K.badges) if (!S.badges[b.id] && b.test(S)) { S.badges[b.id] = today(); toast('Badge unlocked: ' + b.name, b.desc); }
  const ri = rankIdx(S.xp);
  if (ri > S.rank) { S.rank = ri; const th = K.themes.find(t => t.need === K.ranks[ri].name);
    toast('Rank up! You are now ' + K.ranks[ri].name, th ? 'New board unlocked: ' + th.name : 'Keep going, cadet!'); }
  store(); hud();
}
function hud() { $('hudStreak').textContent = streak(); $('hudXp').textContent = S.xp; }

/* cosmetics */
function applyLook() {
  const t = K.themes.find(x => x.id === S.theme) || K.themes[0], k = K.skins.find(x => x.id === S.skin) || K.skins[0];
  const st = document.documentElement.style;
  st.setProperty('--sl', t.l); st.setProperty('--sl2', t.l2); st.setProperty('--sd', t.d); st.setProperty('--sd2', t.d2); st.setProperty('--glow', t.glow);
  st.setProperty('--pb', k.body); st.setProperty('--pt', k.trim); st.setProperty('--pe', k.eye);
  FX.setFx(S.fx); FX.setMute(!S.sound);
}
const themeOpen = t => rankIdx(S.xp) >= K.ranks.findIndex(r => r.name === t.need);
const skinOpen = k => !k.need || !!S.badges[k.need];

/* ---------------- bot thinking (worker with fallback) ---------------- */
let worker = null, wid = 0; const waits = {};
function local(task, d) {
  const p = C.parse(d.fen);
  if (task === 'best') { const r = C.best(p, d.depth || 2); return { uci: r ? C.uci(r.m) : null }; }
  if (task === 'scores') return { scores: C.scoreMoves(p, d.depth || 2).map(x => [C.uci(x.m), x.s]) };
  const m = C.botMove(p, d.level); return { uci: m ? C.uci(m) : null };
}
try {
  worker = new Worker('js/bot-worker.js');
  worker.onmessage = e => { const f = waits[e.data.id]; if (f) { delete waits[e.data.id]; f.res(e.data); } };
  worker.onerror = () => { worker = null; for (const id in waits) { const f = waits[id]; delete waits[id]; f.res(local(f.task, f.d)); } };
} catch (e) { worker = null; }
function think(task, d) {
  return new Promise(res => {
    if (worker) {
      const id = ++wid; waits[id] = { res, task, d };
      setTimeout(() => { if (waits[id]) { delete waits[id]; res(local(task, d)); } }, 12000);
      worker.postMessage(Object.assign({ id, task }, d));
    } else setTimeout(() => res(local(task, d)), 30);
  });
}

/* ---------------- modal ---------------- */
function modal(html, wire) {
  const m = $('modal');
  m.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="box glass">${html}</div></div>`;
  const close = () => { m.innerHTML = ''; };
  wire && wire(m, close);
  const f = m.querySelector('button'); f && f.focus();
  return close;
}
function ask(title, text, yes, no) {
  return new Promise(res => modal(`<svg class="pipm" viewBox="0 0 100 124" aria-hidden="true"><use href="#pip"/></svg><h3>${esc(title)}</h3><p>${esc(text)}</p>
    <div class="btns"><button class="btn" data-a="1">${esc(yes)}</button><button class="btn alt" data-a="0">${esc(no)}</button></div>`,
    (m, close) => m.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { close(); res(b.dataset.a === '1'); })));
}
function promoPick(color) {
  return new Promise(res => modal(`<h3>Power-up!</h3><p>What should your pawn become?</p>
    <div class="promo">${'QRBN'.split('').map(t => `<button class="glass" data-t="${t}" aria-label="${PNAME[t]}" style="${color === 'b' ? 'color:#ff9be9' : ''}">${GLYPH[t]}</button>`).join('')}</div>`,
    (m, close) => m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { close(); res(b.dataset.t); })));
}

/* ---------------- board ---------------- */
class Board {
  constructor(el, onMove) {
    Object.assign(this, { el, onMove, pos: null, flip: false, sel: null, mine: 'w', locked: false, stars: new Set(), last: null, hint: [], drag: null });
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('pointermove', e => this.mv(e));
    el.addEventListener('pointerup', e => this.up(e));
    el.addEventListener('pointercancel', () => this.cancel());
    el.addEventListener('click', e => { if (e.detail === 0) { const b = e.target.closest('.sq'); if (b) this.tap(+b.dataset.i); } });
  }
  set(pos, o) { Object.assign(this, o || {}); this.pos = pos; this.sel = null; this.render(); }
  can() { return !this.locked && this.pos && this.pos.turn === this.mine; }
  own(i) { const x = this.pos.b[i]; return !!x && x[0] === this.mine; }
  from(i) { return i == null ? [] : C.legal(this.pos, i); }
  tap(i) {
    if (!this.can()) return;
    if (this.sel != null) { const ms = this.from(this.sel).filter(m => m.to === i); if (ms.length) return this.choose(ms); }
    if (this.own(i) && i !== this.sel) { this.sel = i; FX.sfx('click'); } else this.sel = null;
    this.render();
    if (this.sel != null) { const b = this.el.querySelector('.sq.can'); b && b.focus(); }
  }
  async choose(ms) {
    let m = ms[0];
    if (ms.length > 1) { this.locked = true; const t = await promoPick(this.mine); this.locked = false; m = ms.find(x => x.promo === t) || ms[0]; }
    this.sel = null; this.onMove(m);
  }
  down(e) {
    const b = e.target.closest('.sq'); if (!b || !this.can()) return;
    const i = +b.dataset.i;
    if (this.sel != null && this.from(this.sel).some(m => m.to === i)) { e.preventDefault(); return this.tap(i); }
    if (this.own(i)) {
      const was = this.sel === i; this.sel = i; this.render();
      this.drag = { i, x: e.clientX, y: e.clientY, g: null, was };
      try { this.el.setPointerCapture(e.pointerId); } catch (er) { }
      e.preventDefault();
    } else if (this.sel != null) { this.sel = null; this.render(); }
  }
  mv(e) {
    const d = this.drag; if (!d) return;
    if (!d.g && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
      d.g = document.createElement('div'); d.g.className = 'ghost' + (this.mine === 'b' ? ' b' : '');
      d.g.textContent = GLYPH[this.pos.b[d.i][1]];
      d.g.style.fontSize = (this.el.clientWidth / 8 * .9) + 'px';
      document.body.appendChild(d.g);
      const pc = this.el.querySelector(`[data-i="${d.i}"] .pc`); pc && pc.classList.add('dragging');
    }
    if (d.g) {
      d.g.style.left = e.clientX + 'px'; d.g.style.top = e.clientY + 'px';
      const t = this.at(e.clientX, e.clientY);
      this.el.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
      if (t != null) { const s = this.el.querySelector(`[data-i="${t}"]`); s && s.classList.contains('can') && s.classList.add('over'); }
    }
  }
  up(e) {
    const d = this.drag; this.drag = null; if (!d) return;
    if (d.g) {
      d.g.remove();
      const t = this.at(e.clientX, e.clientY), ms = t == null ? [] : this.from(d.i).filter(m => m.to === t);
      if (ms.length) return this.choose(ms);
      this.render(); return;
    }
    if (d.was) { this.sel = null; this.render(); }
    else FX.sfx('click');
  }
  cancel() { if (this.drag && this.drag.g) this.drag.g.remove(); this.drag = null; this.render(); }
  at(x, y) {
    const r = this.el.getBoundingClientRect();
    if (x < r.left || y < r.top || x >= r.right || y >= r.bottom) return null;
    let f = Math.floor((x - r.left) / r.width * 8), rr = 7 - Math.floor((y - r.top) / r.height * 8);
    if (this.flip) { f = 7 - f; rr = 7 - rr; }
    return rr * 8 + f;
  }
  render() {
    const p = this.pos; if (!p) return;
    const tg = this.from(this.sel), ts = new Set(tg.map(m => m.to));
    const chk = C.inCheck(p) ? p.b.indexOf(p.turn + 'K') : -1;
    const canNow = this.can();
    let h = '';
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const r = this.flip ? row : 7 - row, f = this.flip ? 7 - col : col, i = r * 8 + f, x = p.b[i];
      const cls = ['sq'];
      if ((r + f) % 2 === 0) cls.push('d');
      if (ts.has(i)) { cls.push('can'); if (x || tg.some(m => m.to === i && m.flag === 'ep')) cls.push('hit'); }
      if (i === this.sel) cls.push('sel');
      if (this.last && (i === this.last[0] || i === this.last[1])) cls.push('last');
      if (i === chk) cls.push('chk');
      if (this.hint.includes(i)) cls.push('hint');
      const mine = x && x[0] === this.mine && canNow;
      if (mine) cls.push('own');
      let inner = '';
      if (col === 0) inner += `<span class="c r">${r + 1}</span>`;
      if (row === 7) inner += `<span class="c f">${'abcdefgh'[f]}</span>`;
      if (x) inner += `<span class="pc ${x[0]}" data-t="${x[1]}">${GLYPH[x[1]]}</span>`;
      else if (this.stars.has(i)) inner += '<svg class="star" aria-hidden="true"><use href="#star"/></svg>';
      const lab = C.sqName(i) + (x ? ', ' + (x[0] === 'w' ? 'white ' : 'black ') + PNAME[x[1]] : this.stars.has(i) ? ', star' : '') + (ts.has(i) ? ', move here' : '');
      h += `<button type="button" class="${cls.join(' ')}" data-i="${i}" aria-label="${lab}"${ts.has(i) || mine ? '' : ' tabindex="-1"'}>${inner}</button>`;
    }
    this.el.innerHTML = h;
  }
  center(i) { const b = this.el.querySelector(`[data-i="${i}"]`); if (!b) return { x: innerWidth / 2, y: innerHeight / 2 };
    const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  fx(m, star) {
    const a = this.center(m.from), b = this.center(m.to);
    FX.trail(a, b, m.piece[0] === 'w' ? '#3ef2ff' : '#ff4fd8');
    if (m.cap) {
      const c = m.flag === 'ep' ? this.center(m.to + (m.piece[0] === 'w' ? -8 : 8)) : b;
      FX.shatter(c.x, c.y, this.el.clientWidth / 8, GLYPH[m.cap[1]], m.cap[0] === 'w' ? ['#3ef2ff', '#eaffff', '#ffffff'] : ['#ff4fd8', '#ff9be9', '#ffffff']);
      FX.sfx('capture');
    }
    else if (star) { FX.burst(b.x, b.y, ['#ffd84a', '#fff3b0', '#3ef2ff'], 40, 4.5, 1); FX.sfx('star'); }
    else { FX.burst(b.x, b.y, ['#3ef2ff', '#bff9ff'], 14, 2.2); FX.sfx('move'); }
  }
  shake(i) { const b = this.el.querySelector(`[data-i="${i}"]`); b && b.classList.add('oops'); FX.sfx('wrong'); }
}

/* ---------------- helpers for content ---------------- */
const ALL = K.allMissions();
const chapterOf = id => K.chapters.find(c => c.missions.some(m => m.id === id));
function unlocked(m) {
  const ch = chapterOf(m.id), ci = K.chapters.indexOf(ch), mi = ch.missions.indexOf(m);
  if (ci > 0 && !K.chapters[ci - 1].missions.every(x => S.done[x.id] > 0)) return false;
  return mi === 0 || S.done[ch.missions[mi - 1].id] > 0;
}
const nextMission = () => ALL.find(m => !S.done[m.id] && unlocked(m)) || null;
function iconOf(m) {
  if (m.type === 'stars') return GLYPH[m.piece];
  return { goal: '♚', quiz: '♟', tactic: '♞', mate: '♛' }[m.type];
}
function dailyPuzzle() {
  const d = new Date(), n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
  return K.puzzles[n % K.puzzles.length];
}
function mini(fen) {
  const p = C.parse(fen); let h = '';
  const flip = p.turn === 'b';
  for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
    const r = flip ? row : 7 - row, f = flip ? 7 - col : col, x = p.b[r * 8 + f];
    h += `<i class="${(r + f) % 2 === 0 ? 'd' : ''}">${x ? `<span class="${x[0]}" data-t="${x[1]}">${GLYPH[x[1]]}</span>` : ''}</i>`;
  }
  return `<div class="mini" aria-hidden="true">${h}</div>`;
}
const stars3 = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const pipSvg = cls => `<svg class="${cls || ''}" viewBox="0 0 100 124" aria-hidden="true"><use href="#pip"/></svg>`;
const bar = pct => `<div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`;

/* Pip's face: '' (normal), 'happy' or 'oops'; ms = how long before going back to normal */
function mood(m, ms) {
  document.querySelectorAll('.pip').forEach(el => {
    el.dataset.mood = m || ''; clearTimeout(el._t);
    if (ms) el._t = setTimeout(() => { el.dataset.mood = ''; }, ms);
  });
}
if (FX.reduced) document.querySelectorAll('#pip animate, #pip animateTransform').forEach(x => x.remove());

/* ---------------- views ---------------- */
const VIEWS = ['home', 'learn', 'mission', 'play', 'puzzles', 'me'];
function route() {
  let v = location.hash.slice(1) || 'home';
  if (!VIEWS.includes(v)) v = 'home';
  if (v === 'mission' && !T) v = 'learn';
  if (v !== 'play') document.body.classList.remove('ingame');
  document.querySelectorAll('.view').forEach(x => x.classList.remove('on'));
  $(v === 'mission' ? 'v-train' : 'v-' + v).classList.add('on');
  const navV = v === 'mission' ? (T && T.kind === 'mission' ? 'learn' : 'puzzles') : v;
  document.querySelectorAll('[data-v]').forEach(a => a.classList.toggle('on', a.dataset.v === navV));
  ({ home: vHome, learn: vLearn, play: vPlay, puzzles: vPuzzles, me: vMe, mission: () => { } })[v]();
  scrollTo({ top: 0 });
}
function go(v) { if (location.hash === '#' + v) route(); else location.hash = v; }

function vHome() {
  const r = rankInfo(), nm = nextMission(), dp = dailyPuzzle(), dDone = !!S.daily[today()];
  const doneN = ALL.filter(m => S.done[m.id]).length, bN = Object.keys(S.badges).length;
  const st = streak(), first = !S.days.length;
  $('v-home').innerHTML = `
  <div class="hero glass">${pipSvg('pipbig')}
    <div><h2>${first ? 'Welcome to MoonChess!' : 'Welcome back, cadet!'}</h2>
    <p class="muted" style="margin:0">${first ? 'I\'m Pip, your MoonChess co-pilot. We\'ll learn one tiny mission at a time. No rush, no pressure.' : st > 1 ? `You\'re on a ${st}-day streak. Keep the engines running!` : 'Ready for today\'s training? Every mission makes you stronger.'}</p>
    <div class="rankrow"><span class="rank">${r.name.toUpperCase()}</span>${bar(r.pct)}<span class="muted" style="font-size:14px">${r.next ? `${S.xp} / ${r.next.xp} XP to ${r.next.name}` : S.xp + ' XP · top rank!'}</span></div>
    <div class="btns">${nm ? `<button class="btn" id="hCont">${doneN ? 'Continue' : 'Start'}: ${esc(nm.name)} →</button>` : '<button class="btn" id="hPlay2">All missions done! Play a game →</button>'}
    <a class="btn alt" href="#play">Play the bots</a></div></div></div>
  <div class="homegrid">
    <div class="card glass"><div class="row" style="justify-content:space-between"><h3>Daily puzzle</h3><span class="tag ${dDone ? 'ok' : ''}">${dDone ? 'Solved' : '+50 XP'}</span></div>
      ${mini(dp.fen)}<p class="muted" style="margin:0">${esc(dp.tag)} · ${dp.fen.split(' ')[1] === 'w' ? 'White' : 'Black'} to move · mate in ${dp.n}</p>
      <div class="btns"><button class="btn small" id="hDaily">${dDone ? 'Solve again' : 'Solve it'}</button></div></div>
    <div class="card glass"><h3>Your training</h3>
      ${K.chapters.map(c => { const d = c.missions.filter(m => S.done[m.id]).length; return `<div><div class="row" style="justify-content:space-between;font-size:15px"><span>${esc(c.name)}</span><span class="muted">${d}/${c.missions.length}</span></div>${bar(Math.round(d / c.missions.length * 100))}</div>`; }).join('')}
      <div class="btns"><a class="btn small alt" href="#learn">All missions</a></div></div>
    <div class="card glass"><h3>Achievements</h3>
      <p class="muted" style="margin:0">${bN} of ${K.badges.length} badges · best streak ${S.bestStreak} day${S.bestStreak === 1 ? '' : 's'}</p>
      <div class="row">${K.badges.filter(b => S.badges[b.id]).slice(-4).map(b => `<svg width="42" height="42" aria-label="${esc(b.name)}"><use href="#medal"/></svg>`).join('') || '<span class="muted">Finish your first mission to earn a badge!</span>'}</div>
      <p class="muted" style="margin:0">Wins: Sleepy ${S.wins.sleepy} · Cadet ${S.wins.cadet} · Captain ${S.wins.captain}</p>
      <div class="btns"><a class="btn small alt" href="#me">See profile</a></div></div>
  </div>`;
  const hc = $('hCont'); hc && (hc.onclick = () => openMission(nm));
  const hp = $('hPlay2'); hp && (hp.onclick = () => go('play'));
  $('hDaily').onclick = () => openPuzzle(dp, true);
}

function vLearn() {
  const nm = nextMission();
  $('v-learn').innerHTML = `<h2 class="title">Training missions</h2><p class="lede">Five chapters take you from "how does a knight move?" to your first checkmates. Finish a mission to unlock the next one.</p>` +
    K.chapters.map(c => {
      const d = c.missions.filter(m => S.done[m.id]).length;
      return `<div class="chapter"><header><h3>${esc(c.name)}</h3><span class="count">${esc(c.blurb)} · ${d}/${c.missions.length} done</span></header>
      <div class="mgrid">${c.missions.map(m => {
        const u = unlocked(m), s = S.done[m.id] || 0;
        return `<button class="mission glass card click${u ? '' : ' lock'}${nm === m ? ' next' : ''}" data-m="${m.id}" ${u ? '' : 'disabled'}>
          <span class="g">${iconOf(m)}</span><span><b>${esc(m.name)}</b><small>${u ? (s ? `<span class="st">${stars3(s)}</span>` : esc(m.sub)) : 'Locked'}</small></span></button>`;
      }).join('')}</div></div>`;
    }).join('');
  $('v-learn').querySelectorAll('[data-m]').forEach(b => b.onclick = () => openMission(ALL.find(m => m.id === b.dataset.m)));
}

function vPuzzles() {
  const dp = dailyPuzzle(), dDone = !!S.daily[today()];
  const n = Object.keys(S.puzzles).length;
  $('v-puzzles').innerHTML = `<h2 class="title">Puzzles</h2><p class="lede">Find the checkmate! A new daily puzzle lands every day. Solved ${n} of ${K.puzzles.length}.</p>
  <div class="daily glass">${mini(dp.fen)}<div><span class="tag ${dDone ? 'ok' : ''}">${dDone ? 'Solved today' : 'Daily puzzle · +50 XP bonus'}</span>
    <h3 style="margin:10px 0 4px;font-size:26px">${esc(dp.tag)}</h3><p class="muted" style="margin:0 0 14px">${dp.fen.split(' ')[1] === 'w' ? 'White' : 'Black'} to move. Find checkmate in ${dp.n}.</p>
    <button class="btn" id="pDaily">${dDone ? 'Solve again' : 'Solve today\'s puzzle'}</button></div></div>
  <div class="pgrid">${K.puzzles.map(p => `<button class="pz glass card click${S.puzzles[p.id] ? ' solved' : ''}" data-p="${p.id}">
    <b>${esc(p.name)}</b><small>${esc(p.tag)}</small><span class="tag ${S.puzzles[p.id] ? 'ok' : ''}">${S.puzzles[p.id] ? 'Solved' : 'Mate in ' + p.n}</span></button>`).join('')}</div>`;
  $('pDaily').onclick = () => openPuzzle(dp, true);
  $('v-puzzles').querySelectorAll('[data-p]').forEach(b => b.onclick = () => openPuzzle(K.puzzles.find(p => p.id === b.dataset.p), false));
}

function vMe() {
  const r = rankInfo(), starsN = ALL.reduce((a, m) => a + (S.done[m.id] || 0), 0);
  let code = ''; try { code = btoa(unescape(encodeURIComponent(JSON.stringify(S)))); } catch (e) { }
  $('v-me').innerHTML = `
  <div class="hero glass" style="margin-bottom:22px">${pipSvg('pipbig')}<div><h2>Cadet profile</h2>
    <div class="rankrow"><span class="rank">${r.name.toUpperCase()}</span>${bar(r.pct)}<span class="muted" style="font-size:14px">${r.next ? `${r.next.xp - S.xp} XP to ${r.next.name}` : 'Top rank reached!'}</span></div>
    <p class="muted" style="margin:0">Ranks: ${K.ranks.map(x => x.name).join(' → ')}</p></div></div>
  <div class="statgrid">
    ${[[S.xp, 'Total XP'], [ALL.filter(m => S.done[m.id]).length + '/' + ALL.length, 'Missions done'], [starsN + '/' + ALL.length * 3, 'Mission stars'],
      [Object.keys(S.puzzles).length + '/' + K.puzzles.length, 'Puzzles solved'], [S.games, 'Games played'], [S.wins.sleepy + S.wins.cadet + S.wins.captain, 'Games won'],
      [streak(), 'Day streak'], [S.bestStreak, 'Best streak']].map(([v, l]) => `<div class="stat glass"><b>${v}</b><small>${l}</small></div>`).join('')}
  </div>
  <h3 style="margin-bottom:10px">Badges</h3>
  <div class="badges">${K.badges.map(b => `<div class="badge glass${S.badges[b.id] ? '' : ' off'}"><svg aria-hidden="true"><use href="#medal"/></svg><div><b>${esc(b.name)}</b><small>${esc(b.desc)}</small></div></div>`).join('')}</div>
  <h3 style="margin-bottom:10px">Board themes</h3>
  <div class="cos">${K.themes.map(t => { const o = themeOpen(t); return `<button class="co glass${S.theme === t.id ? ' on' : ''}" data-th="${t.id}" ${o ? '' : 'disabled'}>
    <span class="swatch"><i style="background:${t.l}"></i><i style="background:${t.d}"></i><i style="background:${t.l}"></i><i style="background:${t.d}"></i></span>
    <b>${esc(t.name)}</b><small>${o ? (S.theme === t.id ? 'In use' : 'Tap to use') : 'Reach ' + t.need}</small></button>`; }).join('')}</div>
  <h3 style="margin-bottom:10px">Pip's outfits</h3>
  <div class="cos">${K.skins.map(k => { const o = skinOpen(k), b = K.badges.find(x => x.id === k.need); return `<button class="co glass${S.skin === k.id ? ' on' : ''}" data-sk="${k.id}" ${o ? '' : 'disabled'}>
    <svg viewBox="0 0 100 124" style="--pb:${k.body};--pt:${k.trim};--pe:${k.eye}" aria-hidden="true"><use href="#pip"/></svg>
    <b>${esc(k.name)}</b><small>${o ? (S.skin === k.id ? 'Wearing' : 'Tap to wear') : 'Badge: ' + esc(b.name)}</small></button>`; }).join('')}</div>
  <h3 style="margin-bottom:10px">Settings</h3>
  <div class="set glass">
    <div class="toggle"><span>Sound effects</span><button class="sw" role="switch" aria-checked="${S.sound}" id="sSound" aria-label="Sound effects"></button></div>
    <div class="toggle"><span>Particle effects${FX.reduced ? ' <small class="muted">(off: your device asks for reduced motion)</small>' : ''}</span><button class="sw" role="switch" aria-checked="${S.fx}" id="sFx" aria-label="Particle effects"></button></div>
    <div><b>Backup code</b><p class="muted" style="margin:4px 0 8px;font-size:15px">Progress is saved in this browser. Copy this code to move it to another device or browser.</p>
      <textarea id="sCode" readonly aria-label="Your backup code">${esc(code)}</textarea>
      <div class="btns" style="margin-top:8px"><button class="btn small alt" id="sCopy">Copy code</button></div></div>
    <div><b>Restore from a code</b><textarea id="sIn" placeholder="Paste a backup code here" aria-label="Paste a backup code"></textarea>
      <div class="btns" style="margin-top:8px"><button class="btn small alt" id="sLoad">Restore progress</button><span class="muted" id="sMsg"></span></div></div>
    <div class="btns"><button class="btn small alt" id="sReset" style="border-color:#ff3b5c">Reset all progress</button></div>
  </div>`;
  const V = $('v-me');
  V.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { S.theme = b.dataset.th; store(); applyLook(); vMe(); });
  V.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { S.skin = b.dataset.sk; store(); applyLook(); vMe(); });
  $('sSound').onclick = () => { S.sound = !S.sound; store(); applyLook(); FX.sfx('click'); vMe(); };
  $('sFx').onclick = () => { S.fx = !S.fx; store(); applyLook(); vMe(); };
  $('sCopy').onclick = async () => { try { await navigator.clipboard.writeText(code); $('sCopy').textContent = 'Copied!'; } catch (e) { $('sCode').select(); $('sCopy').textContent = 'Select and copy the text above'; } };
  $('sLoad').onclick = () => {
    try { const d = JSON.parse(decodeURIComponent(escape(atob($('sIn').value.trim())))); if (!d || d.v !== 1) throw 0;
      S = merge(d); store(); applyLook(); hud(); vMe(); toast('Progress restored', 'Welcome back, cadet!');
    } catch (e) { $('sMsg').textContent = 'That code didn\'t work. Check you copied all of it.'; }
  };
  $('sReset').onclick = async () => { if (await ask('Reset everything?', 'All XP, stars, badges and stats will be erased from this browser.', 'Yes, reset', 'Keep my progress')) {
    S = clone(DEF); store(); applyLook(); hud(); vMe(); } };
}

/* ---------------- trainer: missions & puzzles ---------------- */
let T = null;
const tb = new Board($('tBoard'), m => tMove(m));
function openMission(m) { if (!m) return; T = { kind: 'mission', item: m }; tStart(); go('mission'); }
function openPuzzle(p, daily) {
  T = { kind: daily ? 'daily' : 'puzzle', item: Object.assign({ type: 'mate', say: `${p.fen.split(' ')[1] === 'w' ? 'White' : 'Black'} to move. Find checkmate in ${p.n}!${p.n > 1 ? ' I\'ll play the other side\'s best defence.' : ''}`, fact: 'Puzzle tip: look at every check first. Checks are the most forcing moves.' }, p) };
  tStart(); go('mission');
}
function tStart() {
  const it = T.item;
  Object.assign(T, { moves: 0, tries: T.tries || 0, hinted: T.hinted || false, over: false, hintStep: 0, n: it.n || 1 });
  let pos, o = { last: null, hint: [], stars: new Set(), locked: false };
  if (it.type === 'stars') {
    pos = { b: new Array(64).fill(null), turn: 'w', castle: { wK: false, wQ: false, bK: false, bQ: false }, ep: null, half: 0, full: 1 };
    pos.b[C.sqIdx(it.at)] = 'w' + it.piece;
    (it.enemies || []).forEach(([t, s]) => pos.b[C.sqIdx(s)] = 'b' + t);
    o.stars = new Set((it.stars || []).map(C.sqIdx));
    o.mine = 'w'; o.flip = false;
  } else {
    pos = C.parse(it.fen); o.mine = pos.turn; o.flip = pos.turn === 'b';
    if (it.type === 'quiz') o.locked = true;
  }
  T.pos = pos; mood('');
  tb.set(pos, o);
  const ch = T.kind === 'mission' ? chapterOf(it.id) : null;
  $('tCrumb').textContent = ch ? ch.name + ' · mission ' + (ch.missions.indexOf(it) + 1) + ' of ' + ch.missions.length : T.kind === 'daily' ? 'Daily puzzle' : it.tag;
  $('tTitle').textContent = it.name; $('tSay').textContent = it.say; $('tFact').textContent = it.fact ? 'Data log: ' + it.fact : '';
  $('tWin').hidden = true; $('tNext').hidden = true; $('tHint').hidden = it.type === 'quiz'; $('tReset').hidden = false;
  $('tOpts').innerHTML = it.type === 'quiz' ? it.opts.map((x, i) => { const m = C.fromUci(pos, x.u);
    return `<button class="opt glass" data-o="${i}"><b>${esc(C.san(pos, m))}</b><span>${esc(PNAME[m.piece[1]][0].toUpperCase() + PNAME[m.piece[1]].slice(1))} to ${m.flag && m.flag.startsWith('castle') ? 'castle' : C.sqName(m.to)}</span></button>`; }).join('') : '';
  $('tOpts').querySelectorAll('[data-o]').forEach(b => b.onclick = () => tQuiz(+b.dataset.o, b));
  tStats();
}
function tStats() {
  const it = T.item; let h = `<div class="chip glass">Moves <span>${T.moves}</span></div>`;
  if (it.type === 'stars') {
    if (it.stars) h += `<div class="chip glass">Stars <span>${it.stars.length - tb.stars.size}/${it.stars.length}</span></div>`;
    else h += `<div class="chip glass">Captures <span>${it.enemies.length - T.pos.b.filter(x => x && x[0] === 'b').length}/${it.enemies.length}</span></div>`;
    h += `<div class="chip glass">Target <span>${it.par} moves</span></div>`;
  } else if (it.type === 'mate') h += `<div class="chip glass">Goal <span>mate in ${it.n}</span></div>`;
  h += `<div class="chip glass">XP <span>${S.xp}</span></div>`;
  $('tStats').innerHTML = h;
}
function tWrong(msg, sq) {
  T.tries++; tb.locked = true; mood('oops');
  if (sq != null) tb.shake(sq); else FX.sfx('wrong');
  $('tSay').textContent = msg;
  setTimeout(() => { if (T) { const keep = { tries: T.tries, hinted: T.hinted }; tStart(); Object.assign(T, keep); $('tSay').textContent = msg + ' Try again!'; } }, 1500);
}
function tMove(m) {
  const it = T.item, p = T.pos;
  if (it.type === 'stars') {
    const star = tb.stars.has(m.to), after = C.make(p, m, true);
    tb.fx(m, star); tb.stars.delete(m.to); T.moves++; T.pos = after;
    if (m.promo) $('tSay').textContent = 'Power up! Your pawn reached the far side and became a ' + PNAME[m.promo] + '! Now finish the mission.';
    tb.set(after, { last: [m.from, m.to], hint: [] }); tStats();
    const done = it.stars ? tb.stars.size === 0 : !after.b.some(x => x && x[0] === 'b');
    if (done) { const r = T.moves <= it.par ? 3 : T.moves <= it.par + 2 ? 2 : 1;
      tWin(Math.min(r, T.hinted ? 2 : 3), (it.stars ? 'You collected every star!' : 'You captured them all!') + ` ${T.moves} moves` + (T.moves <= it.par ? '. Perfect!' : ` (try ${it.par} for 3 stars).`)); }
    return;
  }
  const after = C.make(p, m);
  tb.fx(m); T.moves++;
  const show = () => { T.pos = after; tb.set(after, { last: [m.from, m.to], hint: [] }); tStats(); };
  if (it.type === 'goal') {
    const ok = { any: () => true, castle: () => /castle/.test(m.flag || ''), ep: () => m.flag === 'ep', promo: () => !!m.promo }[it.goal]();
    show();
    if (ok) return tWin(rate(), it.win);
    return tWrong(it.wrong || 'Not quite.', m.to);
  }
  if (it.type === 'tactic') {
    show();
    if (C.uci(m) === it.sol) return tWin(rate(), it.win);
    return tWrong('Hmm, that doesn\'t win anything. Look for a move that attacks something big.', m.to);
  }
  if (it.type === 'mate') {
    const good = C.mateMoves(p, T.n).some(x => C.uci(x) === C.uci(m));
    show();
    if (C.isMate(after)) return tWin(rate(), 'Checkmate! The king is attacked and has nowhere to go.');
    if (good) {
      if (C.inCheck(after)) FX.sfx('check');
      tb.locked = true; $('tSay').textContent = 'Great move! Now the other side replies...';
      setTimeout(() => {
        const r = C.bestDefence(after, T.n - 1), a2 = C.make(after, r);
        tb.fx(r); T.pos = a2; T.n--;
        tb.set(a2, { last: [r.from, r.to], locked: false }); tStats();
        $('tSay').textContent = `They played ${C.san(after, r)}. Now finish it: checkmate in ${T.n}!`;
      }, 700);
      return;
    }
    const st = C.status(after);
    return tWrong(st === 'stalemate' ? 'Oh no, that\'s stalemate: no check and no legal moves. That\'s only a draw!' :
      C.inCheck(after) ? 'Check! But the king can still escape or block.' : 'Not checkmate. The king can still breathe.', m.to);
  }
}
function tQuiz(i, btn) {
  if (T.over) return;
  const it = T.item, o = it.opts[i];
  if (o.ok) {
    btn.classList.add('ok'); const m = C.fromUci(T.pos, o.u), after = C.make(T.pos, m);
    tb.fx(m); T.pos = after; tb.set(after, { last: [m.from, m.to] });
    tWin(rate(), o.why);
  } else { btn.classList.add('no'); btn.disabled = true; T.tries++; FX.sfx('wrong'); mood('oops', 1400); $('tSay').textContent = o.why + ' Try another one!'; }
}
const rate = () => Math.min(T.hinted ? 2 : 3, T.tries === 0 ? 3 : T.tries === 1 ? 2 : 1);
function tWin(r, msg) {
  T.over = true; tb.locked = true; tb.render(); mood('happy');
  const it = T.item; let xp = 0;
  if (T.kind === 'mission') { const prev = S.done[it.id] || 0; if (r > prev) { xp = (r - prev) * 10; S.done[it.id] = r; } }
  else {
    if (!S.puzzles[it.id]) { S.puzzles[it.id] = 1; xp += 25; }
    if (T.kind === 'daily' && !S.daily[today()]) { S.daily[today()] = it.id; xp += 50; }
  }
  addXp(xp);
  $('tRate').textContent = stars3(r);
  $('tWinText').textContent = msg + (xp ? ` +${xp} XP` : '');
  $('tWin').hidden = false; $('tReset').hidden = false; $('tHint').hidden = true;
  const nx = tNext();
  $('tNext').hidden = !nx; $('tNext').textContent = nx ? nx.label : '';
  if (T.kind === 'mission' && !nextMission()) $('tSay').textContent = 'You finished every mission, cadet! You know all the rules now. Go challenge the bots!';
  else $('tSay').textContent = ['Amazing work!', 'Stellar!', 'You\'re a natural!', 'Mission complete!'][Math.floor(Math.random() * 4)];
  FX.party($('tBoard')); FX.sfx('win');
  tStats(); afterProgress();
}
function tNext() {
  if (T.kind === 'mission') { const i = ALL.indexOf(T.item), n = ALL[i + 1];
    if (n && unlocked(n)) return { label: 'Next: ' + n.name + ' →', go: () => openMission(n) };
    return { label: 'Play a real game →', go: () => go('play') }; }
  const i = K.puzzles.findIndex(p => p.id === T.item.id);
  const n = K.puzzles.slice(i + 1).concat(K.puzzles.slice(0, i)).find(p => !S.puzzles[p.id]);
  return n ? { label: 'Next puzzle →', go: () => openPuzzle(n, false) } : { label: 'All puzzles done! Back →', go: () => go('puzzles') };
}
$('tNext').onclick = () => { const n = tNext(); n && n.go(); };
$('tReset').onclick = () => { T.tries = T.tries || 0; tStart(); };
$('tBack').onclick = () => go(T && T.kind === 'mission' ? 'learn' : 'puzzles');
$('tHint').onclick = () => {
  if (!T || T.over) return;
  const it = T.item, p = T.pos; T.hinted = true;
  let m = null;
  if (it.type === 'stars') {
    const ms = C.legal(p).filter(x => tb.stars.has(x.to) || (x.cap));
    if (ms.length) { tb.set(p, { hint: [ms[0].to] }); $('tSay').textContent = 'Psst! You can reach the glowing square in one move.'; }
    else { tb.set(p, { hint: [] }); $('tSay').textContent = 'Nothing is one move away yet. Move closer first, then grab it!'; }
    return;
  }
  if (it.type === 'goal') m = C.legal(p).find(x => ({ any: () => true, castle: () => /castle/.test(x.flag || ''), ep: () => x.flag === 'ep', promo: () => !!x.promo }[it.goal]()));
  if (it.type === 'tactic') m = C.fromUci(p, it.sol);
  if (it.type === 'mate') m = C.mateMoves(p, T.n)[0];
  if (!m) return;
  T.hintStep++;
  tb.set(p, { hint: T.hintStep > 1 ? [m.from, m.to] : [m.from] });
  $('tSay').textContent = T.hintStep > 1 ? `Move your ${PNAME[m.piece[1]]} to the glowing square!` : `Try moving the glowing ${PNAME[m.piece[1]]}. Tap Hint again for more help.`;
};

/* ---------------- play vs bot / friend ---------------- */
let G = null;
const PIECE_SET = { P: 8, N: 2, B: 2, R: 2, Q: 1 };
function vPlay() {
  if (G && !G.closed) return renderGame();
  document.body.classList.remove('ingame');
  const pr = S.prefs;
  $('v-play').innerHTML = `<div class="setup"><h2 class="title">Play a game</h2><p class="lede">Pick an opponent. Start with Sleepy Bot: it makes lots of mistakes, so you can practise winning.</p>
  <div class="bots">${K.bots.map(b => `<button class="bot glass${pr.bot === b.id ? ' on' : ''}" data-b="${b.id}" style="color:${b.color}"><svg aria-hidden="true"><use href="#botface"/></svg>
    <b style="color:#fff">${esc(b.name)}</b><small>${esc(b.desc)}</small><span class="tag">Win: +${b.xp} XP · Won ${S.wins[b.id]}</span></button>`).join('')}
    <button class="bot glass${pr.bot === 'friend' ? ' on' : ''}" data-b="friend" style="color:#6dffc4">${pipSvg()}<b style="color:#fff">A friend</b><small>Two players on one device. Take turns moving.</small><span class="tag ok">Pass and play</span></button></div>
  <div class="row"><span>Your colour</span><div class="seg glass" role="group" aria-label="Your colour">${[['w', 'White'], ['r', 'Random'], ['b', 'Black']].map(([v, l]) => `<button data-c="${v}" class="${pr.color === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
  <div class="btns"><button class="btn" id="pGo">Launch game →</button></div></div>`;
  const V = $('v-play');
  V.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { S.prefs.bot = b.dataset.b; store(); vPlay(); });
  V.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { S.prefs.color = b.dataset.c; store(); vPlay(); });
  $('pGo').onclick = startGame;
}
function startGame() {
  const pr = S.prefs, friend = pr.bot === 'friend';
  const mine = pr.color === 'r' ? (Math.random() < .5 ? 'w' : 'b') : pr.color;
  const pos = C.parse(C.START);
  G = { friend, bot: pr.bot, mine: friend ? 'w' : mine, pos, hist: [], keys: [C.fen(pos, true)], over: false, closed: false, busy: false, flip: !friend && mine === 'b' };
  renderGame(true); scrollTo({ top: 0 });
  if (!friend && G.mine !== pos.turn) botTurn();
  else say(friend ? 'White moves first. Pass the device after each move!' : 'You move first. Tip: start by moving a centre pawn, like e4 or d4!');
}
function renderGame(fresh) {
  const bot = K.bots.find(b => b.id === G.bot);
  document.body.classList.add('ingame');
  $('v-play').innerHTML = `<div class="arena">
    <div class="atop glass">
      <button class="aexit" id="gExit" aria-label="Leave the game screen (your game is kept)">←</button>
      <div class="opp" style="color:${G.friend ? '#6dffc4' : bot.color}">${G.friend ? pipSvg() : '<svg aria-hidden="true"><use href="#botface"/></svg>'}
        <div><b style="color:#fff">${G.friend ? 'Friend match' : esc(bot.name)}</b><small id="gStatus"></small></div></div>
      <div class="acaps"><div class="caps w" id="gCapW" title="Pieces captured by White"></div><div class="caps" id="gCapB" title="Pieces captured by Black"></div></div>
    </div>
    <div class="aboard"><div class="boardbox glass"><div class="board" id="gBoard" aria-label="Chess board"></div></div></div>
    <div class="moves glass" id="gMoves" aria-label="Move list"></div>
    <div class="abot">
      <div class="pip aline glass">${pipSvg()}<p id="gSay" aria-live="polite"></p></div>
      <div class="abtns"><button class="btn alt small" id="gHint">Hint</button><button class="btn alt small" id="gUndo">Undo</button><button class="btn alt small" id="gFlip">Flip</button><button class="btn alt small" id="gEnd">Resign</button></div>
    </div></div>`;
  G.board = new Board($('gBoard'), m => playerMove(m));
  G.board.set(G.pos, { mine: G.friend ? G.pos.turn : G.mine, flip: G.flip, last: G.hist.length ? [G.hist.at(-1).m.from, G.hist.at(-1).m.to] : null, locked: G.over || G.busy });
  $('gHint').onclick = gHint; $('gUndo').onclick = gUndo;
  $('gExit').onclick = () => go('home');
  $('gFlip').onclick = () => { G.flip = !G.flip; G.board.set(G.pos, { flip: G.flip }); };
  $('gEnd').onclick = async () => { if (G.over) { G.closed = true; return vPlay(); }
    if (await ask('Resign this game?', 'No worries, every game teaches you something.', 'Yes, resign', 'Keep playing')) endGame('resign'); };
  gSide();
  if (!fresh && G.sayText) $('gSay').textContent = G.sayText;
}
function say(t) { G.sayText = t; const e = $('gSay'); if (e) e.textContent = t; }
function gSide() {
  const st = $('gStatus'); if (!st) return;
  const turnW = G.pos.turn === 'w';
  if (G.over) st.textContent = 'Game over';
  else if (G.busy) { st.textContent = 'Thinking'; st.className = 'thinking'; return; }
  else st.textContent = G.friend ? (turnW ? 'White to move' : 'Black to move') : G.pos.turn === G.mine ? 'Your move' : 'Waiting';
  st.className = '';
  const count = c => { const o = { P: 0, N: 0, B: 0, R: 0, Q: 0 }; G.pos.b.forEach(x => { if (x && x[0] === c && x[1] !== 'K') o[x[1]]++; }); return o; };
  const lost = c => { const n = count(c); return 'QRBNP'.split('').map(t => GLYPH[t].repeat(Math.max(0, PIECE_SET[t] - n[t]))).join(''); };
  $('gCapW').textContent = lost('b'); $('gCapB').textContent = lost('w');
  $('gMoves').innerHTML = G.hist.reduce((a, h, i) => a + (i % 2 === 0 ? `<span>${i / 2 + 1}.</span>` : '') + `<span>${esc(h.san)}</span>`, '');
  $('gMoves').scrollTop = 1e6;
  $('gEnd').textContent = G.over ? 'New game' : 'Resign';
  $('gHint').disabled = G.over || G.busy; $('gUndo').disabled = !G.hist.length || G.busy;
}
function playerMove(m) {
  if (G.over || G.busy) return;
  apply(m, true);
  if (!G.over && !G.friend) botTurn();
}
function apply(m, byPlayer) {
  const san = C.san(G.pos, m), after = C.make(G.pos, m);
  G.hist.push({ pos: G.pos, m, san }); G.keys.push(C.fen(after, true));
  G.pos = after;
  G.board.fx(m);
  if (C.inCheck(after)) FX.sfx('check');
  G.board.set(after, { last: [m.from, m.to], hint: [], mine: G.friend ? after.turn : G.mine });
  const st = C.status(after, G.keys.slice(0, -1));
  if (st) return endGame(st);
  if (!G.friend) { if (byPlayer && (m.cap || C.inCheck(after))) mood('happy', 1500); else if (!byPlayer && (m.cap || C.inCheck(after))) mood('oops', 1500); }
  if (G.friend) say((after.turn === 'w' ? 'White' : 'Black') + (C.inCheck(after) ? ' is in check! Get the king to safety.' : ' to move.'));
  else if (byPlayer) say(m.cap ? ['Nice capture!', 'Got one! Great eye.', 'Zap! Piece captured.'][G.hist.length % 3] : C.inCheck(after) ? 'Check! The bot has to save its king.' : ['Good move. Let\'s see what the bot does.', 'Keep your pieces protected!', 'Try to bring out a new piece each move.', 'Look for checks, captures and threats!'][G.hist.length % 4]);
  else say(C.inCheck(after) ? 'Your king is in check! Move it, block, or capture the attacker.' : m.cap ? `Ouch, they took your ${PNAME[m.cap[1]]}. Can you take something back?` : `The bot played ${san}. Your turn!`);
  gSide();
}
async function botTurn() {
  G.busy = true; G.board.locked = true; gSide();
  const g = G, t0 = Date.now();
  const r = await think('move', { fen: C.fen(G.pos), level: G.bot });
  await new Promise(res => setTimeout(res, Math.max(0, 550 - (Date.now() - t0))));
  if (g !== G || G.over) return;
  G.busy = false;
  const m = r.uci && C.fromUci(G.pos, r.uci);
  if (!m) return;
  G.board.locked = false;
  apply(m, false);
}
async function gHint() {
  if (G.over || G.busy) return;
  G.busy = true; gSide();
  const r = await think('best', { fen: C.fen(G.pos), depth: 2 });
  G.busy = false; gSide();
  const m = r.uci && C.fromUci(G.pos, r.uci); if (!m) return;
  G.board.set(G.pos, { hint: [m.from, m.to] });
  say(`Pip suggests: move your ${PNAME[m.piece[1]]} from ${C.sqName(m.from)} to ${C.sqName(m.to)}${m.cap ? ', capturing a ' + PNAME[m.cap[1]] : ''}.`);
}
function gUndo() {
  if (!G.hist.length || G.busy) return;
  let n = 1;
  if (!G.friend) { n = G.hist.at(-1).m.piece[0] === G.mine ? 1 : 2; if (n > G.hist.length) n = G.hist.length; }
  let h; for (let i = 0; i < n; i++) { h = G.hist.pop(); G.keys.pop(); }
  G.pos = h.pos; G.over = false;
  const l = G.hist.at(-1);
  G.board.set(G.pos, { last: l ? [l.m.from, l.m.to] : null, hint: [], locked: false, mine: G.friend ? G.pos.turn : G.mine });
  say('Rewound! Take your time and pick a new move.'); gSide(); mood('');
  if (!G.friend && G.pos.turn !== G.mine) botTurn();
}
function endGame(st) {
  G.over = true; G.board.locked = true; G.board.render();
  const loserTurn = G.pos.turn;
  let title, text, xp = 0, win = false, draw = false;
  if (st === 'checkmate' || st === 'resign') {
    const winner = st === 'resign' ? C.opp(G.mine) : C.opp(loserTurn);
    if (G.friend) { title = (winner === 'w' ? 'White' : 'Black') + ' wins!'; text = st === 'resign' ? 'Resigned. Good game, both of you!' : 'Checkmate! What a game.'; xp = 20; }
    else if (winner === G.mine) { win = true; const b = K.bots.find(x => x.id === G.bot); xp = b.xp; title = 'You win!'; text = `Checkmate! You beat ${b.name}. Incredible flying, cadet!`; S.wins[G.bot]++; }
    else { title = 'Good fight!'; text = st === 'resign' ? 'You resigned this one. Every game is practice.' : 'The bot found checkmate this time. Try Undo to see what happened, or play again!'; xp = 10; }
  } else {
    draw = true; xp = 20; title = 'It\'s a draw!';
    text = { stalemate: 'Stalemate: no legal moves, but not in check.', fifty: '50 moves without a capture or pawn move.', insufficient: 'Not enough pieces left to checkmate.', repetition: 'The same position happened three times.' }[st];
  }
  S.games++; addXp(xp);
  if (win || (G.friend && st === 'checkmate')) { FX.party($('gBoard')); FX.sfx('win'); } else FX.sfx(draw ? 'move' : 'lose');
  say(text); gSide(); afterProgress();
  const face = win || G.friend || draw ? 'happy' : 'oops'; mood(face);
  modal(`${pipSvg('pipm ' + face)}<h3>${esc(title)}</h3><p>${esc(text)}</p><p class="muted" style="margin:0">+${xp} XP</p>
    <div class="btns"><button class="btn" data-a="again">Play again</button><button class="btn alt" data-a="look">Look at the board</button></div>`,
    (m, close) => m.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { close(); if (b.dataset.a === 'again') startGame(); }));
}

/* ---------------- centre the piece glyphs ----------------
   Text glyphs don't sit in the middle of their box, so measure each one's drawn shape
   and shift it so the ink is exactly centred in its square. */
const FONT = '"Noto Sans Symbols 2","Segoe UI Symbol",serif';
function centrePieces() {
  try {
    const cx = document.createElement('canvas').getContext('2d');
    cx.font = '200px ' + FONT; cx.textBaseline = 'alphabetic'; cx.textAlign = 'left';
    let css = '';
    for (const t in GLYPH) {
      const m = cx.measureText(GLYPH[t]);
      if (m.fontBoundingBoxAscent == null) return;
      const dx = m.width / 2 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
      const dy = -((m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 + (m.actualBoundingBoxDescent - m.actualBoundingBoxAscent) / 2);
      css += `[data-t="${t}"]{display:inline-block;transform:translate(${(dx / 200).toFixed(4)}em,${(dy / 200).toFixed(4)}em)}`;
    }
    let st = document.getElementById('pcCentre');
    if (!st) { st = document.createElement('style'); st.id = 'pcCentre'; document.head.appendChild(st); }
    st.textContent = css;
  } catch (e) { }
}
centrePieces();
try { document.fonts.load('40px ' + FONT, '♚♟').then(centrePieces, () => { }); document.fonts.ready.then(centrePieces); } catch (e) { }

/* ---------------- boot ---------------- */
addEventListener('hashchange', route);
applyLook(); hud(); route();
}
