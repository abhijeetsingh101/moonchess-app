/* MoonChess — particle starfield, bursts and synthesized sounds. */
window.FX = (function () {
  const cv = document.getElementById('space'), cx = cv.getContext('2d');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let enabled = true, W = 0, H = 0, bg = [], ps = [];
  // effect particles draw on a second canvas in front of the page, so they show over the board
  const top = document.createElement('canvas'), tx = top.getContext('2d');
  top.setAttribute('aria-hidden', 'true');
  top.style.cssText = 'position:fixed;inset:0;z-index:55;pointer-events:none';
  document.body.appendChild(top);
  const ptr = { x: -999, y: -999 };
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    top.width = W * dpr; top.height = H * dpr; top.style.width = W + 'px'; top.style.height = H + 'px';
    tx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(160, W * H / 9000));
    bg = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, z: .3 + Math.random(),
      vx: (Math.random() - .5) * .15, vy: (Math.random() - .5) * .15, t: Math.random() * 6 }));
  }
  size();
  addEventListener('resize', size);
  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { ptr.x = e.clientX; ptr.y = e.clientY; } });
  document.addEventListener('pointerleave', () => { ptr.x = ptr.y = -999; });
  const live = () => enabled && !RM;

  function burst(x, y, cols, n, sp, ring) {
    if (!live()) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = sp * (.3 + Math.random());
      ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, d: .012 + Math.random() * .02, r: 1 + Math.random() * 2.5, c: cols[i % cols.length] });
    }
    if (ring) ps.push({ x, y, ring: 1, rad: 4, life: 1, d: .025, c: cols[0] });
  }
  function trail(a, b, col) {
    if (!live()) return;
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      ps.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, vx: (Math.random() - .5) * .6, vy: (Math.random() - .5) * .6,
        life: .6 + t * .4, d: .03, r: 1.6, c: col || '#3ef2ff' });
    }
  }
  // captured piece breaks apart: sample the glyph's pixels and fling them outward
  const off = document.createElement('canvas'), ox = off.getContext('2d', { willReadFrequently: true });
  function shatter(x, y, size, glyph, cols) {
    if (!live()) return;
    const s = Math.max(24, Math.ceil(size));
    off.width = off.height = s;
    ox.clearRect(0, 0, s, s);
    ox.font = (s * .82) + 'px "Noto Sans Symbols 2","Segoe UI Symbol",serif';
    ox.textAlign = 'center'; ox.textBaseline = 'middle'; ox.fillStyle = '#fff';
    ox.fillText(glyph + '\uFE0E', s / 2, s / 2);
    let data; try { data = ox.getImageData(0, 0, s, s).data; } catch (e) { data = null; }
    const step = Math.max(2, Math.round(s / 24));
    let n = 0;
    if (data) for (let py = 0; py < s; py += step) for (let px = 0; px < s; px += step) {
      if (data[(py * s + px) * 4 + 3] < 120) continue;
      const dx = px - s / 2, dy = py - s / 2, d = Math.hypot(dx, dy) || 1, v = 1.5 + Math.random() * 4.5;
      ps.push({ x: x + dx, y: y + dy, vx: dx / d * v + (Math.random() - .5) * 1.5, vy: dy / d * v + (Math.random() - .5) * 1.5 - 1.2,
        life: 1, d: .009 + Math.random() * .012, r: step * (.45 + Math.random() * .35), c: cols[n++ % cols.length] });
    }
    burst(x, y, cols, n ? 26 : 60, 7, 1);
    ps.push({ x, y, ring: 1, rad: 2, life: 1, d: .04, c: '#ffffff' });
    setTimeout(() => { if (live()) ps.push({ x, y, ring: 1, rad: 6, life: .8, d: .02, c: cols[0] }); }, 120);
  }
  function party(el) {
    if (!live()) return;
    const r = el ? el.getBoundingClientRect() : { left: 0, top: 0, width: W, height: H };
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    burst(x, y, ['#3ef2ff', '#ff4fd8', '#ffd84a', '#ffffff', '#8a5cff'], 220, 9, 1);
    setTimeout(() => burst(x, y, ['#ffd84a', '#ffffff'], 90, 6, 1), 250);
  }
  (function tick() {
    cx.clearRect(0, 0, W, H);
    for (const p of bg) {
      p.t += .02;
      if (live()) {
        p.x += p.vx * p.z; p.y += p.vy * p.z - .05 * p.z;
        const dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy;
        if (d2 < 14000) { const f = (1 - d2 / 14000) * .9, d = Math.sqrt(d2 + 1); p.x += dx / d * f; p.y += dy / d * f; }
      }
      if (p.y < -5) p.y = H + 5; if (p.y > H + 5) p.y = -5; if (p.x < -5) p.x = W + 5; if (p.x > W + 5) p.x = -5;
      cx.globalAlpha = (.35 + .35 * Math.sin(p.t)) * p.z;
      cx.fillStyle = p.z > 1 ? '#bff9ff' : '#9aa8ff';
      cx.beginPath(); cx.arc(p.x, p.y, p.z * 1.2, 0, 7); cx.fill();
    }
    if (live() && ptr.x > -999) {
      cx.lineWidth = .6;
      for (const p of bg) {
        const d = Math.hypot(p.x - ptr.x, p.y - ptr.y);
        if (d < 160) { cx.globalAlpha = (1 - d / 160) * .5; cx.strokeStyle = '#3ef2ff'; cx.beginPath(); cx.moveTo(p.x, p.y); cx.lineTo(ptr.x, ptr.y); cx.stroke(); }
      }
    }
    cx.globalAlpha = 1;
    tx.clearRect(0, 0, W, H);
    tx.globalCompositeOperation = 'lighter';
    ps = ps.filter(p => (p.life -= p.d) > 0);
    for (const p of ps) {
      tx.globalAlpha = p.life;
      if (p.ring) { p.rad += 6; tx.strokeStyle = p.c; tx.lineWidth = 2; tx.beginPath(); tx.arc(p.x, p.y, p.rad, 0, 7); tx.stroke(); continue; }
      p.x += p.vx; p.y += p.vy; p.vx *= .96; p.vy *= .96; p.vy += .03;
      tx.fillStyle = p.c; tx.beginPath(); tx.arc(p.x, p.y, p.r, 0, 7); tx.fill();
    }
    tx.globalCompositeOperation = 'source-over'; tx.globalAlpha = 1;
    requestAnimationFrame(tick);
  })();

  // ---------- sound (synthesized, no files) ----------
  let ac = null, muted = false;
  function ctx() {
    if (muted) return null;
    try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) { ac = null; }
    return ac;
  }
  function tone(freq, dur, type, vol, delay, slide) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .12, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .05);
  }
  const SFX = {
    move: () => { tone(520, .09, 'triangle', .1); tone(780, .07, 'sine', .05, .03); },
    capture: () => { tone(300, .18, 'sawtooth', .07, 0, 120); tone(900, .1, 'square', .04, .02, 400); },
    star: () => { [880, 1175, 1568].forEach((f, i) => tone(f, .16, 'sine', .08, i * .06)); },
    check: () => { tone(660, .12, 'square', .06); tone(660, .12, 'square', .06, .15); },
    wrong: () => { tone(220, .22, 'triangle', .1, 0, 150); },
    win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .28, 'triangle', .09, i * .09)); },
    lose: () => { [392, 330, 262].forEach((f, i) => tone(f, .3, 'triangle', .08, i * .14)); },
    click: () => tone(1200, .04, 'sine', .04),
    badge: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .2, 'sine', .08, i * .08)); }
  };
  function sfx(name) { try { SFX[name] && SFX[name](); } catch (e) { } }

  return { burst, trail, shatter, party, sfx, setFx: v => { enabled = v; if (!v) ps = []; }, setMute: v => { muted = v; }, reduced: RM };
})();
