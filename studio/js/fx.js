// Ambient particles, celebration bursts, sound and haptics.
// Everything here is decorative and backs off for reduced motion / hidden tabs.

const TAU = Math.PI * 2;
let canvas, ctx, raf = 0, particles = [], bursts = [];
let cfg = { style: 'motes', density: 1, motion: 'full', sprite: null, accent: '#7fcfbd', accent2: '#d7b7c7', rare: '#d8c08a' };
let spriteImg = null;
let dpr = 1, W = 0, H = 0, last = 0;

const prefersReduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
export const motionLevel = () => (prefersReduced() && cfg.motion === 'full' ? 'calm' : cfg.motion);

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function spawn(initial = false) {
  const s = cfg.style === 'sprite' && !spriteImg ? 'motes' : cfg.style;
  const base = { x: Math.random() * W, y: initial ? Math.random() * H : s === 'bubbles' || s === 'embers' ? H + 20 : s === 'petals' || s === 'snow' ? -20 : Math.random() * H, t: Math.random() * 1000, life: 1 };
  const col = Math.random() < 0.72 ? cfg.accent : cfg.accent2;
  switch (s) {
    case 'bubbles': return { ...base, r: 2 + Math.random() * 6, vx: 0, vy: -(12 + Math.random() * 22), col, s };
    case 'embers': return { ...base, r: 1 + Math.random() * 2.2, vx: (Math.random() - 0.5) * 8, vy: -(10 + Math.random() * 18), col, s };
    case 'petals': return { ...base, r: 4 + Math.random() * 4, vx: 6 + Math.random() * 10, vy: 14 + Math.random() * 14, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 1.6, col: cfg.accent2, s };
    case 'snow': return { ...base, r: 1 + Math.random() * 2.5, vx: (Math.random() - 0.5) * 6, vy: 10 + Math.random() * 16, col: '#ffffff', s };
    case 'sparkles': return { ...base, r: 1.5 + Math.random() * 2.5, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, col, s };
    case 'sprite': return { ...base, r: 3 + Math.random() * 5, vx: (Math.random() - 0.5) * 10, vy: -(4 + Math.random() * 10), rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 0.6, s };
    default: return { ...base, r: 0.8 + Math.random() * 2, vx: (Math.random() - 0.5) * 5, vy: -(2 + Math.random() * 6), col, s: 'motes' };
  }
}

function targetCount() {
  if (cfg.style === 'none' || motionLevel() === 'off') return 0;
  const area = (W * H) / (390 * 844);
  return Math.round(Math.min(70, 34 * area * cfg.density * (motionLevel() === 'calm' ? 0.45 : 1)));
}

function drawParticle(p) {
  const tw = 0.55 + 0.45 * Math.sin(p.t * 1.7);
  ctx.globalAlpha = Math.max(0, Math.min(1, p.life)) * (p.s === 'snow' ? 0.7 : 0.75) * tw;
  switch (p.s) {
    case 'bubbles':
      ctx.strokeStyle = p.col; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke();
      ctx.globalAlpha *= 0.5; ctx.beginPath(); ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
      break;
    case 'petals':
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
      ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.45, 0, 0, TAU); ctx.fill(); ctx.restore();
      break;
    case 'sparkles': {
      ctx.fillStyle = p.col; const r = p.r * (0.6 + tw);
      ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 2); ctx.lineTo(p.x + r * 0.5, p.y); ctx.lineTo(p.x, p.y + r * 2); ctx.lineTo(p.x - r * 0.5, p.y); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(p.x - r * 2, p.y); ctx.lineTo(p.x, p.y + r * 0.5); ctx.lineTo(p.x + r * 2, p.y); ctx.lineTo(p.x, p.y - r * 0.5); ctx.closePath(); ctx.fill();
      break;
    }
    case 'sprite':
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.drawImage(spriteImg, -p.r, -p.r, p.r * 2, p.r * 2); ctx.restore();
      break;
    default: {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, p.col); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, TAU); ctx.fill();
    }
  }
}

function frame(now) {
  raf = 0;
  const dt = Math.min(0.05, (now - (last || now)) / 1000);
  last = now;
  ctx.clearRect(0, 0, W, H);
  const want = targetCount();
  while (particles.length < want) particles.push(spawn(particles.length < want * 0.9 && !particles.started));
  particles.started = true;
  if (particles.length > want) particles.length = want;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.t += dt; p.x += (p.vx + Math.sin(p.t * 0.8) * 6) * dt; p.y += p.vy * dt;
    if (p.rot != null) p.rot += p.vr * dt;
    if (p.s === 'sparkles' || p.s === 'motes') p.life = Math.min(1, p.life + dt);
    if (p.y < -30 || p.y > H + 30 || p.x < -30 || p.x > W + 30) particles[i] = spawn();
    drawParticle(p);
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.t += dt;
    if (b.t > b.dur) { bursts.splice(i, 1); continue; }
    for (const q of b.parts) {
      q.vx *= 0.985; q.vy = q.vy * 0.985 + 90 * dt;
      q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      ctx.globalAlpha = Math.max(0, 1 - b.t / b.dur);
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.col;
      if (q.shape === 'star') { ctx.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? q.r * 0.4 : q.r; ctx.lineTo(Math.cos((k * Math.PI) / 4) * r, Math.sin((k * Math.PI) / 4) * r); } ctx.closePath(); ctx.fill(); }
      else if (q.shape === 'sprite' && spriteImg) ctx.drawImage(spriteImg, -q.r, -q.r, q.r * 2, q.r * 2);
      else ctx.fillRect(-q.r, -q.r * 0.5, q.r * 2, q.r);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  if ((particles.length || bursts.length) && !document.hidden) raf = requestAnimationFrame(frame);
}

function kick() { if (!raf && !document.hidden && (targetCount() || bursts.length)) { last = 0; raf = requestAnimationFrame(frame); } }

export function initFx(el) {
  canvas = el;
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', () => { resize(); kick(); }, { passive: true });
  document.addEventListener('visibilitychange', kick);
  window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => configureFx({}));
}

export function configureFx(next) {
  cfg = { ...cfg, ...next };
  particles = [];
  document.documentElement.dataset.motion = motionLevel();
  if (cfg.sprite) {
    const img = new Image();
    img.onload = () => { spriteImg = img; particles = []; kick(); };
    img.src = cfg.sprite;
  } else spriteImg = null;
  if (!targetCount()) { ctx?.clearRect(0, 0, W, H); }
  kick();
}

/** Celebration burst from an element (correct answers, rare finds, lore). */
export function burst(el, { kind = 'correct' } = {}) {
  if (motionLevel() === 'off' || !canvas) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const n = motionLevel() === 'calm' ? 10 : kind === 'rare' || kind === 'lore' ? 46 : 26;
  const cols = kind === 'rare' ? [cfg.rare, '#ffffff', cfg.rare] : [cfg.accent, cfg.accent2, '#ffffff'];
  const parts = Array.from({ length: n }, () => {
    const a = Math.random() * TAU, sp = 90 + Math.random() * (kind === 'correct' ? 170 : 260);
    return { x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, r: 2 + Math.random() * 3.5, rot: Math.random() * TAU, vr: (Math.random() - 0.5) * 10,
      col: cols[Math.floor(Math.random() * cols.length)], shape: spriteImg && Math.random() < 0.35 ? 'sprite' : Math.random() < 0.5 ? 'star' : 'rect' };
  });
  bursts.push({ parts, t: 0, dur: kind === 'correct' ? 1.1 : 1.6 });
  kick();
}

// ---------------------------------------------------------------- sound + haptics
let audio;
export function tone(kind, enabled) {
  if (!enabled) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const notes = { tap: [520], correct: [523, 659, 784], wrong: [392, 330], rare: [659, 784, 988, 1319], lore: [440, 554, 659, 880] }[kind] || [520];
    notes.forEach((f, i) => {
      const o = audio.createOscillator(), g = audio.createGain();
      const t0 = audio.currentTime + i * 0.075;
      o.type = kind === 'wrong' ? 'triangle' : 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.035, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
      o.connect(g); g.connect(audio.destination);
      o.start(t0); o.stop(t0 + 0.24);
    });
  } catch { /* audio unavailable */ }
}
export function buzz(pattern, enabled) { if (enabled) try { navigator.vibrate?.(pattern); } catch {} }
