import { Game, validateContentPack, localDateKey, canonicalId, slug } from './engine.js';
import { packs, settings as settingsStore, progress as progressStore, storageEstimate, requestPersistence } from './db.js';
import { PRESETS, presetById, presetRecord, applyVisual, normalizeTheme, importVisualZip, buildVisualRecord, exportVisualZip, extractPalette, colorsFromPalette, allSlots, FONT_STACKS } from './theme.js';
import { initFx, configureFx, burst, tone, buzz, motionLevel } from './fx.js';
import { buildSpriteCookBrief, briefZip, placeholderPack, buildForgePrompt, FORGE_SYSTEM, generateWithClaude, describeApiError } from './forge.js';
import { readZip } from './zip.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/** Tiny element builder. Text is always set via textContent, never innerHTML. */
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

// Built-in art packs are plain files on the site (the Tideglass kit lives in ../assets).
const BUILTIN_LOOKS = [
  { id: 'builtin:tideglass', url: 'packs/tideglass/theme.json', baseUrl: '../assets/tideglass/' },
];

const BUILTIN_STORIES = [
  { id: 'rook-courtship', url: 'packs/rook-courtship.json' },
  { id: 'moth-lantern', url: 'packs/moth-lantern.json' },
];

let settings = settingsStore.load();
let pack = null;          // active, validated content pack
let game = null;
let visual = null;        // active visual record
let applied = { images: {}, art: {}, sounds: {} };
let sfxReady = false; // no sound until the first offering is on screen
let current = null;       // offering on screen
let answered = false;
let codexFilter = 'All';
let draft = null;         // customise pane working copy
let lastBrief = null;
let refFile = null;
let refPalette = [];
let pendingImport = null;
let deferredInstall = null;
const loreQueue = [];

// ================================================================ loading

async function fetchJson(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }

async function listStories() {
  const installed = (await packs.list('content').catch(() => [])).map((r) => ({ id: r.id, pack: r.pack, installed: true, installedAt: r.installedAt }));
  const out = [];
  for (const b of BUILTIN_STORIES) if (!installed.some((i) => i.id === b.id)) out.push({ ...b, builtin: true });
  return [...out, ...installed.sort((a, b) => a.installedAt - b.installedAt)];
}

async function loadStory(id) {
  let raw = null;
  const rec = await packs.get('content', id).catch(() => null);
  if (rec) raw = rec.pack;
  else { const b = BUILTIN_STORIES.find((s) => s.id === id) || BUILTIN_STORIES[0]; raw = await fetchJson(b.url); }
  const v = validateContentPack(raw);
  if (!v.ok) throw new Error(v.errors.join('\n'));
  return v.pack;
}

async function setStory(id, { silent = false } = {}) {
  try { pack = await loadStory(id); }
  catch (e) { console.error(e); if (id !== BUILTIN_STORIES[0].id) return setStory(BUILTIN_STORIES[0].id, { silent }); throw e; }
  settings.content = pack.id; settingsStore.save(settings);
  game = new Game(pack, progressStore.load(pack.id), settings);
  codexFilter = 'All';
  renderChrome();
  renderAll();
  const today = localDateKey();
  if (!game.dailyAnswer(today)) openDaily(); else nextOffering();
  if (!silent) toast(`Now playing: ${pack.title}`);
}

const builtinCache = new Map();
async function builtinLook(def) {
  if (!builtinCache.has(def.id)) {
    builtinCache.set(def.id, fetchJson(def.url).then((json) => ({ id: def.id, kind: 'visual', builtin: true, art: true, baseUrl: def.baseUrl, theme: normalizeTheme({ ...json, id: def.id }), files: {} })).catch((e) => { builtinCache.delete(def.id); throw e; }));
  }
  return builtinCache.get(def.id);
}

async function listLooks() {
  const installed = await packs.list('visual').catch(() => []);
  const builtins = (await Promise.all(BUILTIN_LOOKS.map((d) => builtinLook(d).catch(() => null)))).filter(Boolean);
  return [...builtins, ...PRESETS.map(presetRecord), ...installed.sort((a, b) => a.installedAt - b.installedAt)];
}

async function setLook(id, { silent = false } = {}) {
  const preset = presetById(id);
  const builtin = BUILTIN_LOOKS.find((d) => d.id === id);
  let rec = preset ? presetRecord(preset) : builtin ? await builtinLook(builtin).catch(() => null) : await packs.get('visual', id).catch(() => null);
  if (!rec) rec = presetRecord(PRESETS[0]);
  rec.theme = normalizeTheme(rec.theme, presetById(rec.theme.basePreset) || PRESETS[0]);
  visual = rec;
  settings.visual = rec.id; settingsStore.save(settings);
  await applyLook(rec.theme, rec.files, rec.baseUrl);
  draft = null;
  if (!silent) toast(`Wearing: ${rec.theme.name}`);
}

async function applyLook(theme, files, baseUrl = visual?.baseUrl) {
  applied = await applyVisual({ theme, files, baseUrl });
  const particles = theme.motion.particles === 'sprite' && !applied.images.particle ? 'motes' : theme.motion.particles;
  configureFx({ style: particles, density: theme.motion.density, motion: settings.motion, sprite: applied.images.particle || null, accent: theme.colors.accent, accent2: theme.colors.accent2, rare: theme.colors.rare });
  savePaint();
  renderArt();
}

function savePaint() {
  const st = document.documentElement.style;
  const vars = {};
  for (const p of [...st]) if (p.startsWith('--c-') || p.endsWith('-rgb') || p === '--radius' || p.startsWith('--font-')) vars[p] = st.getPropertyValue(p);
  try { localStorage.setItem('codexStudio:paint', JSON.stringify({ vars, scheme: document.documentElement.dataset.scheme })); } catch {}
}

// ================================================================ chrome + art

function renderChrome() {
  document.title = pack.title;
  $('#eyebrow').textContent = pack.eyebrow;
  $('#title').textContent = pack.title;
  $('#subtitle').textContent = pack.subtitle;
  $('#dailyKicker').textContent = pack.labels.daily;
  $('#question').textContent = pack.labels.question;
  $('#codexTitle').textContent = pack.labels.codexTitle;
  $('#loreTitle').textContent = pack.labels.loreTitle;
  $('#loreIntro').textContent = pack.labels.loreIntro;
  const sp = pack.special;
  $('#specialNav').classList.toggle('hidden', !sp);
  document.documentElement.style.setProperty('--nav-count', sp ? 5 : 4);
  if (sp) {
    $('#specialNavLabel').textContent = sp.tab;
    $('#specialTitle').textContent = sp.title;
    $('#specialIntro').textContent = sp.intro;
  }
  const names = pack.companions.map((c) => c.name);
  $('#companionLabel').textContent = names.length ? `Allow offerings from ${names.length > 1 ? `${names.slice(0, -1).join(', ')} & ${names.at(-1)}` : names[0]}` : 'Companions (this story has none)';
  $('#companionToggle').disabled = !names.length;
  if (!pack.special && currentView() === 'special') go('play');
  requestAnimationFrame(moveIndicator);
}

function renderArt() {
  for (const [id, slot] of [['#decorCanopy', 'canopy'], ['#decorPendantL', 'pendantLeft'], ['#decorPendantR', 'pendantRight'], ['#decorCharm', 'headerCharm'],
    ['#sideDropL', 'sideDrop'], ['#sideDropR', 'sideDrop'], ['#sideSwagL', 'sideSwag'], ['#sideSwagR', 'sideSwag'], ['#cardGarland', 'cardGarland']]) {
    const img = $(id);
    const src = applied.images[slot];
    img.hidden = !src;
    if (src) img.src = src; else img.removeAttribute('src');
  }
  $('#app').classList.toggle('has-canopy', !!applied.images.canopy);
  const nb = $('#newBtn');
  if (!nb.dataset.svg) nb.dataset.svg = nb.innerHTML;
  const nbArt = applied.images.newButton || applied.images.navPlay;
  if (nbArt) nb.replaceChildren(h('img', { src: nbArt, alt: '' }));
  else nb.innerHTML = nb.dataset.svg; // our own static markup
  const crest = $('#crest');
  crest.replaceChildren(applied.images.crest ? h('img', { src: applied.images.crest, alt: '' }) : h('span', { text: '✦' }));
  for (const el of $$('.nav-ico[data-slot]')) {
    const src = applied.images[el.dataset.slot];
    if (!el.dataset.svg) el.dataset.svg = el.innerHTML;
    if (src) el.replaceChildren(h('img', { src, alt: '' }));
    else el.innerHTML = el.dataset.svg; // our own static markup
  }
  if (current && pack) { renderOfferingArt(current); renderChoices(); if (answered) markChoices(); }
  if (pack) renderAll();
}

// ================================================================ routing

const VIEWS = ['play', 'codex', 'lore', 'special', 'studio'];
const currentView = () => document.body.dataset.view || 'play';

function go(view, pane) {
  const hash = view === 'play' ? '' : `#${view}${pane ? `/${pane}` : ''}`;
  if (location.hash !== hash) history.pushState(null, '', hash || location.pathname + location.search);
  route();
}

function route() {
  let [view, pane] = location.hash.replace('#', '').split('/');
  if (!VIEWS.includes(view) || (view === 'special' && !pack?.special)) view = 'play';
  const changed = document.body.dataset.view !== view;
  document.body.dataset.view = view;
  for (const s of $$('.view')) s.classList.toggle('hidden', s.dataset.view !== view);
  for (const b of $$('.nav-btn')) { const on = b.dataset.view === view; b.classList.toggle('active', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); }
  if (view === 'studio') showPane(pane || document.body.dataset.pane || 'looks');
  if (changed) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  moveIndicator();
}

function moveIndicator() {
  const nav = $('#nav'), ind = $('.nav-indicator'), btn = $('.nav-btn.active');
  if (!btn || btn.offsetParent === null) return;
  ind.style.width = `${btn.offsetWidth}px`;
  ind.style.transform = `translateX(${btn.offsetLeft - 8}px)`;
  nav.style.setProperty('--x', btn.offsetLeft);
}

function showPane(name) {
  document.body.dataset.pane = name;
  for (const b of $$('#studioTabs [role="tab"]')) b.setAttribute('aria-selected', String(b.dataset.pane === name));
  for (const p of $$('.pane')) p.classList.toggle('hidden', p.dataset.pane !== name);
  $(`#studioTabs [data-pane="${name}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
  if (name === 'looks') renderPacks();
  if (name === 'customise') renderCustomise();
  if (name === 'settings') renderSettings();
}

// ================================================================ play

function offeringArt(o) { return applied.art[canonicalId(o.id)] || null; }

function renderOfferingArt(o) {
  const src = offeringArt(o);
  $('#glyph').replaceChildren(src ? h('img', { src, alt: '' }) : o.glyph);
  $('#stage').classList.toggle('has-art', !!src);
  const giver = $('#giverLine');
  giver.replaceChildren();
  if (o.giver) {
    const portrait = applied.images[`companion-${slug(o.giver)}`];
    if (portrait) giver.append(h('img', { src: portrait, alt: '' }));
    giver.append(`Presented by ${o.giver}`);
  }
  giver.classList.toggle('hidden', !o.giver);
  const colIcon = applied.images[`collection-${slug(o.collection)}`];
  $('#collectionLabel').replaceChildren(...(colIcon ? [h('img', { src: colIcon, alt: '' })] : []), o.collection || '');
}

function renderChoices() {
  const wrap = $('#choices');
  wrap.replaceChildren(...pack.intents.map((it) => {
    const icon = applied.images[`intent-${it.id}`];
    const art = applied.images[`choice-${it.id}`];
    return h('button', { class: `choice${art ? ' has-art' : ''}`, type: 'button', 'data-intent': it.id, style: art ? `--choice-art:url("${art}");--choice-slice:var(--slice-choice-${it.id});--choice-w:var(--slice-choice-${it.id}-w)` : null, onclick: () => choose(it.id) },
      icon ? h('img', { class: 'choice-ico', src: icon, alt: '' }) : null,
      h('span', { class: 'choice-txt' }, h('strong', { text: it.label }), it.blurb ? h('span', { text: it.blurb }) : null));
  }));
}

// A look's own sound effects, fetched once and played from memory (iPhone Safari won't play
// audio streamed from the service worker cache, but a blob URL works online and offline).
// Looks without a sound fall back to the built-in tones.
const sfxCache = new Map();
function playSfx(kind, fallback) {
  if (!settings.sound || !sfxReady) return;
  const src = applied.sounds?.[kind];
  if (!src) { if (fallback) tone(fallback, true); return; }
  if (!sfxCache.has(src)) sfxCache.set(src, fetch(src).then((r) => (r.ok ? r.blob() : Promise.reject())).then((b) => { const a = new Audio(URL.createObjectURL(b)); a.volume = 0.6; return a; }));
  sfxCache.get(src).then((a) => { a.currentTime = 0; return a.play(); }).catch(() => sfxCache.delete(src));
}

function setOffering(o, { daily = false } = {}) {
  current = o; answered = false;
  renderOfferingArt(o);
  $('#offeringName').textContent = o.name;
  $('#offeringDesc').textContent = o.desc;
  $('#sourceLabel').textContent = daily ? pack.labels.daily : o.giver ? `Offering from ${o.giver}` : o.rare ? 'Rare offering' : o.procedural ? 'Procedurally generated offering' : 'Handcrafted offering';
  $('#rareBadge').classList.toggle('hidden', !o.rare);
  const status = $('#statusBadge'); status.textContent = pack.labels.unread; status.classList.remove('good');
  $('#reveal').classList.add('hidden');
  $('#unlockBox').classList.add('hidden');
  renderChoices();
  const stage = $('#stage');
  stage.classList.remove('enter', 'hit', 'miss');
  stage.classList.toggle('rare', !!o.rare);
  void stage.offsetWidth; // restart animations
  stage.classList.add('enter');
  const ch = $('#choices'); ch.classList.remove('enter'); void ch.offsetWidth; ch.classList.add('enter');
  if (o.rare) { setTimeout(() => burst($('#glyph'), { kind: 'rare' }), 450); if (!applied.sounds?.appear) tone('rare', settings.sound); }
  const prior = daily ? game.dailyAnswer() : null;
  if (!(prior && prior.id === o.id)) playSfx('appear');
  if (prior && prior.id === o.id) reveal(prior.intent, { replay: true });
  if (currentView() !== 'play') go('play');
  if (window.scrollY > 120) $('#offeringCard').scrollIntoView({ behavior: motionLevel() === 'off' ? 'auto' : 'smooth', block: 'start' });
}

function nextOffering() { setOffering(game.next()); }

function openDaily() {
  const o = game.daily();
  progressStore.save(pack.id, game.p);
  setOffering(o, { daily: true });
  updateDaily();
}

function choose(intent) {
  if (answered || !current) return;
  const res = game.answer(current, intent);
  progressStore.save(pack.id, game.p);
  reveal(intent, { res });
  renderAll();
}

function markChoices(picked) {
  for (const b of $$('.choice')) {
    b.disabled = true;
    b.classList.toggle('picked', picked != null && b.dataset.intent === picked);
    b.classList.toggle('truth', b.dataset.intent === current.intent);
  }
}

function reveal(intent, { replay = false, res = null } = {}) {
  answered = true;
  const hit = intent === current.intent;
  const it = game.intents[current.intent];
  const status = $('#statusBadge');
  status.textContent = hit ? pack.labels.correctBadge : pack.labels.wrongBadge;
  status.classList.toggle('good', hit);
  $('#verdict').textContent = (replay ? 'Already opened today. ' : '') + (hit ? pack.labels.correctVerdict : pack.labels.wrongVerdict);
  $('#explanation').textContent = `Actual meaning: ${it.label}. ${current.why || it.why}`;
  $('#giverSays').textContent = current.line || '';
  $('#reveal').classList.remove('hidden');
  $('#nextBtn').textContent = 'Next offering';
  markChoices(intent);
  if (replay) return;

  const stage = $('#stage');
  stage.classList.remove('enter', 'hit', 'miss'); void stage.offsetWidth;
  stage.classList.add(hit ? 'hit' : 'miss');
  const picked = $(`.choice[data-intent="${CSS.escape(intent)}"]`);
  if (hit) { burst(picked || stage, { kind: current.rare ? 'rare' : 'correct' }); playSfx('reveal', 'correct'); buzz([12, 40, 18], settings.haptics); }
  else { playSfx('reveal', 'wrong'); buzz(30, settings.haptics); }

  const bits = [];
  if (current.rare && res?.isNew) bits.push('✦ Rare find added to the Codex.');
  if (game.p.streak >= 3 && hit) bits.push(`🔥 ${game.p.streak} in a row.`);
  for (const l of res?.unlocked || []) bits.push(`Secret lore unlocked: ${l.title}`);
  if (bits.length) { const box = $('#unlockBox'); box.replaceChildren(...bits.flatMap((b, i) => (i ? [h('br'), b] : [b]))); box.classList.remove('hidden'); }
  if (res?.unlocked?.length) { loreQueue.push(...res.unlocked); setTimeout(showNextLore, 900); }
  updateDaily();
}

function showNextLore() {
  const dlg = $('#loreSheet');
  if (dlg.open || !loreQueue.length) return;
  const l = loreQueue.shift();
  $('#loreSheetTitle').textContent = l.title;
  $('#loreSheetBody').textContent = l.body;
  const seal = $('#loreSeal'); seal.style.animation = 'none'; void seal.offsetWidth; seal.style.animation = '';
  dlg.showModal();
  tone('lore', settings.sound); buzz([20, 60, 20, 60, 40], settings.haptics);
  setTimeout(() => burst(seal, { kind: 'lore' }), 250);
}

let dailyTimer = 0;
function updateDaily() {
  clearTimeout(dailyTimer);
  if (!game) return;
  const opened = !!game.dailyAnswer();
  const banner = $('#dailyBanner');
  banner.classList.toggle('waiting', !opened);
  $('#dailyTitle').textContent = opened ? "Today's offering has been opened." : 'Something is waiting for you.';
  if (opened) {
    const now = new Date(); const next = new Date(now); next.setHours(24, 0, 0, 0);
    const mins = Math.max(1, Math.round((next - now) / 60000));
    $('#dailySub').textContent = `The next one arrives in ${mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`}.`;
    dailyTimer = setTimeout(updateDaily, 60000); // also flips the banner back once midnight passes
  } else $('#dailySub').textContent = 'One offering is waiting for this calendar day.';
  $('#dailyBtn').textContent = opened ? 'Revisit' : 'Open it';
}

function renderStats() {
  const s = game.stats();
  for (const el of $$('[data-stat]')) {
    const v = String(s[el.dataset.stat] ?? 0);
    if (el.textContent !== v) { el.textContent = v; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }
  const u = $('#understoodStat');
  u.title = `${s.correct} of ${s.seen} read correctly`;
  u.setAttribute('aria-label', `${s.understood} understood: ${u.title}`);
}

// ================================================================ codex / lore / special

function entryRow(e, { stamp } = {}) {
  const src = applied.art[e.id];
  return h('div', { class: 'entry' },
    h('div', { class: 'entry-glyph', 'aria-hidden': 'true' }, src ? h('img', { src, alt: '' }) : e.glyph || '✦'),
    h('div', { class: 'entry-body' },
      h('div', { class: `entry-title ${e.rare ? 'rare-text' : ''}`, text: `${e.rare ? '✦ ' : ''}${e.name}` }),
      h('div', { class: 'entry-meta', text: [e.collection, game.intents[e.intent]?.label || e.intent, e.giver && `from ${e.giver}`, e.procedural && 'procedural'].filter(Boolean).join(' · ') }),
      h('div', { class: 'entry-text', text: e.codex || '' }),
      stamp ? h('span', { class: 'stamp', text: stamp }) : null));
}

function renderCodex() {
  const all = game.entries();
  $('#codexCount').textContent = `${all.length} discovered`;
  const handByCol = (c) => [...pack.offerings, ...pack.rare, ...pack.companions.flatMap((x) => x.offerings)].filter((o) => o.collection === c);
  $('#collectionGrid').replaceChildren(...pack.collections.map((c) => {
    const found = all.filter((e) => e.collection === c.name);
    const hand = handByCol(c.name);
    const handFound = hand.filter((o) => game.p.discovered[o.id]).length;
    const icon = applied.images[`collection-${slug(c.name)}`];
    return h('div', { class: 'collection-card' },
      icon ? h('img', { src: icon, alt: '' }) : null,
      h('div', {}, h('b', { text: c.name }), h('span', { text: `${found.length} found · ${handFound}/${hand.length} handcrafted` }),
        h('div', { class: 'meter', 'aria-hidden': 'true' }, h('i', { style: `width:${hand.length ? Math.round((handFound / hand.length) * 100) : 0}%` }))));
  }));
  $('#collectionFilters').replaceChildren(...['All', ...pack.collections.map((c) => c.name)].map((f) =>
    h('button', { type: 'button', class: `chip ${codexFilter === f ? 'active' : ''}`, 'aria-pressed': String(codexFilter === f), onclick: () => { codexFilter = f; renderCodex(); } }, f)));
  const q = $('#codexSearch').value.trim().toLowerCase();
  let entries = all.slice().reverse();
  if (codexFilter !== 'All') entries = entries.filter((e) => e.collection === codexFilter);
  if (q) entries = entries.filter((e) => `${e.name} ${e.codex} ${e.giver || ''}`.toLowerCase().includes(q));
  $('#codexList').replaceChildren(...(entries.length ? entries.slice(0, 200).map((e) => entryRow(e)) : [h('div', { class: 'empty', text: q ? 'Nothing matches that search.' : 'Nothing catalogued here yet.' })]));
}

function renderLore() {
  const unlocked = pack.lore.filter((l) => game.p.unlockedLore[l.id]);
  $('#loreCount').textContent = `${unlocked.length} / ${pack.lore.length} unlocked`;
  $('#loreList').replaceChildren(...(pack.lore.length ? pack.lore.map((l) => {
    const open = !!game.p.unlockedLore[l.id];
    const [have, need] = game.loreProgress(l);
    return h('div', { class: `entry lore-entry ${open ? 'unlocked' : 'locked'}` },
      h('div', { class: 'entry-glyph', 'aria-hidden': 'true', text: open ? '✦' : '◇' }),
      h('div', { class: 'entry-body' },
        h('div', { class: 'entry-title', text: open ? l.title : 'Locked entry' }),
        h('div', { class: 'lore-hint', text: l.hint }),
        open ? h('div', { class: 'entry-text', text: l.body })
          : h('div', {}, h('div', { class: 'entry-text', text: pack.labels.lockedLore }), h('div', { class: 'meter', role: 'progressbar', 'aria-valuenow': have, 'aria-valuemax': need, 'aria-label': 'Progress' }, h('i', { style: `width:${Math.round((have / need) * 100)}%` })))));
  }) : [h('div', { class: 'empty', text: 'This story has no secret lore.' })]));
}

function renderSpecial() {
  if (!pack.special) return;
  const entries = game.entries().filter((e) => e.intent === pack.special.intent).reverse();
  $('#specialCount').textContent = `${entries.length} on file`;
  $('#specialList').replaceChildren(...(entries.length ? entries.map((e) => entryRow(e, { stamp: pack.special.stamp })) : [h('div', { class: 'empty', text: pack.special.empty })]));
}

function renderAll() { renderStats(); renderCodex(); renderLore(); renderSpecial(); updateDaily(); }

// ================================================================ studio: packs

function lookCard(rec, active) {
  const t = rec.theme;
  const bgName = typeof t.images.background === 'string' ? t.images.background : t.images.background?.file;
  const bgUrl = rec.files && rec.files[bgName];
  const bgHref = !bgUrl && rec.baseUrl && bgName ? new URL(bgName, new URL(rec.baseUrl, location.href)).href : null;
  const preview = h('div', { class: 'look-preview', style: `background:${bgUrl ? '' : `linear-gradient(160deg, ${t.colors.bg2}, ${t.colors.bg})`}` },
    h('div', { class: 'mini-card', style: `background:${t.colors.surface};border-color:${t.colors.border}` }),
    ...['accent', 'accent2', 'rare', 'text'].map((k) => h('i', { style: `background:${t.colors[k]}` })));
  if (bgUrl) { const u = URL.createObjectURL(bgUrl); preview.style.backgroundImage = `url("${u}")`; setTimeout(() => URL.revokeObjectURL(u), 60000); }
  if (bgHref) preview.style.backgroundImage = `url("${bgHref}")`;
  const imgCount = Object.keys(t.images || {}).length + Object.keys(t.art || {}).length;
  return h('div', { class: `look ${active ? 'active' : ''}` },
    h('button', { type: 'button', class: 'story-main', 'aria-pressed': String(active), 'aria-label': `Wear ${t.name}`, onclick: () => { settings.lookChosen = true; setLook(rec.id).then(renderPacks); } },
      preview, h('div', { class: 'look-info' }, h('b', { text: t.name }), h('span', { text: rec.builtin && !rec.art ? t.description || 'Built-in' : `${imgCount} images${t.style === 'pixel' ? ' · pixel' : ''}${rec.builtin ? ' · built in' : ''}` }))),
    rec.builtin && !rec.art ? null : h('div', { class: 'look-actions' },
      h('button', { type: 'button', onclick: () => exportLook(rec) }, 'Share'),
      rec.builtin ? null : h('button', { type: 'button', onclick: () => deleteLook(rec) }, 'Delete')));
}

async function renderPacks() {
  const looks = await listLooks();
  $('#lookCount').textContent = `${looks.length} looks`;
  $('#lookGrid').replaceChildren(...looks.map((r) => lookCard(r, r.id === visual?.id)));
  const stories = await listStories();
  $('#storyList').replaceChildren(...await Promise.all(stories.map(async (s) => {
    const title = s.pack?.title || (s.id === 'rook-courtship' ? 'Rook Courtship Codex' : s.id === 'moth-lantern' ? 'The Moth Lantern Society' : s.id);
    const prog = progressStore.load(s.id);
    const active = s.id === pack?.id;
    return h('div', { class: `story ${active ? 'active' : ''}` },
      h('button', { type: 'button', class: 'story-main', 'aria-pressed': String(active), onclick: () => !active && setStory(s.id).then(renderPacks) },
        h('b', { text: title }), h('span', { text: `${Object.keys(prog.discovered).length} discovered · ${s.builtin ? 'built-in' : 'yours'}${active ? ' · playing' : ''}` })),
      h('div', { class: 'story-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => exportStory(s.id) }, 'Share'),
        s.installed ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => deleteStory(s.id) }, 'Delete') : null));
  })));
}

async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ files: [file], title: filename }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

async function withFiles(rec) {
  if (!rec.baseUrl) return rec;
  const names = new Set([...Object.values(rec.theme.images).map((v) => (typeof v === 'string' ? v : v.file)), ...Object.values(rec.theme.art), rec.theme.fonts.display, rec.theme.fonts.body, ...Object.values(rec.theme.sounds || {})].filter(Boolean));
  const files = {};
  for (const n of names) { const r = await fetch(new URL(n, new URL(rec.baseUrl, location.href))); if (r.ok) files[n] = await r.blob(); }
  return { ...rec, files };
}
async function exportLook(rec) { toast('Packing the look…'); await shareOrDownload(await exportVisualZip(await withFiles(rec)), `${slug(rec.theme.name) || 'look'}.zip`); }
async function deleteLook(rec) {
  if (!confirm(`Delete the look "${rec.theme.name}"?`)) return;
  await packs.remove('visual', rec.id);
  if (visual?.id === rec.id) await setLook(PRESETS[0].id, { silent: true });
  renderPacks(); toast('Look deleted.');
}
async function exportStory(id) {
  const p = id === pack.id ? pack : await loadStory(id);
  await shareOrDownload(new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' }), `${p.id}.json`);
}
async function deleteStory(id) {
  if (!confirm('Delete this story? Its progress is kept in case you reinstall it.')) return;
  await packs.remove('content', id);
  if (pack.id === id) await setStory(BUILTIN_STORIES[0].id, { silent: true });
  renderPacks(); toast('Story deleted.');
}

// ---------------------------------------------------------------- import

async function installStory(raw, { play = true } = {}) {
  const v = validateContentPack(raw);
  if (!v.ok) return v;
  await packs.put('content', { id: v.pack.id, pack: v.pack, installedAt: Date.now() });
  requestPersistence();
  if (play) { await setStory(v.pack.id, { silent: true }); toast(`Installed "${v.pack.title}". Enjoy!`); }
  return v;
}

async function handleImportFile(file) {
  if (!file) return;
  try {
    if (/\.json$/i.test(file.name) || file.type === 'application/json') {
      const json = JSON.parse(await file.text());
      if (json.format === 'codex-visual-pack') {
        const rec = { id: json.id || `visual-${Date.now().toString(36)}`, kind: 'visual', installedAt: Date.now(), theme: normalizeTheme(json), files: {} };
        await packs.put('visual', rec); await setLook(rec.id); renderPacks(); return;
      }
      const v = await installStory(json);
      if (!v.ok) { showReport($('#fgReport'), v); go('studio', 'forge'); $('#fgJson').value = JSON.stringify(json, null, 2); toast('That story pack has problems. See the Lore Forge.'); }
      return;
    }
    // zip: may hold a story (content.json), a look (images + theme.json), or both
    const entries = await readZip(file);
    const storyEntry = [...entries.entries()].find(([n, b]) => /\.json$/i.test(n) && !/theme\.json$/i.test(n) && new TextDecoder().decode(b.subarray(0, 400)).includes('codex-content-pack'));
    let story = null;
    if (storyEntry) {
      const v = await installStory(new TextDecoder().decode(storyEntry[1]), { play: true });
      if (!v.ok) { toast(`Story in zip is invalid: ${v.errors[0]}`); return; }
      story = v.pack;
    }
    const hasImages = [...entries.keys()].some((n) => /\.(png|webp|jpe?g|gif|avif|svg)$/i.test(n));
    if (hasImages) await reviewVisualImport(file);
    else if (!story) toast('That zip has no images or story pack in it.');
  } catch (e) {
    console.error(e);
    toast(e.message || 'Import failed.');
  }
}

async function reviewVisualImport(file) {
  pendingImport = await importVisualZip(file, pack);
  const imp = pendingImport;
  $('#importName').value = imp.theme.name;
  $('#importSwatches').replaceChildren(...Object.values(imp.theme.colors).slice(0, 11).map((c) => h('span', { class: 'swatch', style: `background:${c}`, title: c })));
  const rep = $('#importReport');
  const mappedCount = Object.keys(imp.mapping).length;
  rep.replaceChildren(h('div', { class: 'ok', text: `${mappedCount} image${mappedCount === 1 ? '' : 's'} matched to slots${imp.unmapped.length ? `, ${imp.unmapped.length} unmatched` : ''}.` }),
    ...(imp.warnings.length ? [h('ul', {}, ...imp.warnings.map((w) => h('li', { class: 'warn', text: w })))] : []));
  const slots = allSlots(pack);
  const options = [h('option', { value: '' }, 'Not used'), ...slots.map((s) => h('option', { value: s.key }, s.label))];
  const rows = Object.keys(imp.files).filter((f) => !/\.(woff2?|ttf|otf)$/i.test(f)).map((f) => {
    const url = URL.createObjectURL(imp.files[f]);
    const slot = Object.entries(imp.mapping).find(([, v]) => v === f)?.[0] || '';
    const sel = h('select', { 'data-file': f, 'aria-label': `Slot for ${f}` }, ...options.map((o) => o.cloneNode(true)));
    sel.value = slot;
    return h('div', { class: 'map-row' }, h('img', { src: url, alt: '', loading: 'lazy' }), h('div', {}, h('div', { class: 'map-name', text: f }), sel));
  });
  $('#importMap').replaceChildren(...rows);
  $('#importSheet').showModal();
}

async function confirmVisualImport() {
  const imp = pendingImport;
  if (!imp) return;
  const mapping = {};
  for (const sel of $$('#importMap select')) if (sel.value) mapping[sel.value] = sel.dataset.file;
  imp.theme.name = $('#importName').value.trim() || imp.theme.name;
  const rec = buildVisualRecord({ ...imp, mapping });
  try { await packs.put('visual', rec); } catch (e) { toast(`Could not save: ${e.message}`); return; }
  requestPersistence();
  for (const img of $$('#importMap img')) URL.revokeObjectURL(img.src);
  $('#importSheet').close();
  pendingImport = null;
  await setLook(rec.id, { silent: true });
  toast(`Installed "${rec.theme.name}".`);
  renderPacks();
}

// ================================================================ studio: customise

function workingTheme() { return draft || visual.theme; }

function renderCustomise() {
  const t = workingTheme();
  $('#customBase').textContent = `based on ${visual.theme.name}`;
  const labels = { bg: 'Background', bg2: 'Glow', surface: 'Card', surface2: 'Inset', border: 'Border', text: 'Text', muted: 'Soft text', accent: 'Accent', accent2: 'Accent 2', rare: 'Rare', danger: 'Warning' };
  $('#colorGrid').replaceChildren(...Object.entries(labels).map(([k, l]) =>
    h('label', {}, l, h('input', { type: 'color', value: t.colors[k], 'data-color': k, oninput: (e) => editDraft((d) => { d.colors[k] = e.target.value; }) }))));
  $('#radiusRange').value = t.radius; $('#radiusOut').textContent = `${t.radius}px`;
  $('#densityRange').value = t.motion.density; $('#densityOut').textContent = `${t.motion.density}×`;
  $('#particleSel').value = t.motion.particles;
  $('#pixelToggle').checked = t.style === 'pixel';
  const fontOpts = (hasPack) => Object.keys(FONT_STACKS).filter((k) => k !== 'pack' || hasPack).map((k) => h('option', { value: k }, { system: 'Clean sans', serif: 'Bookish serif', rounded: 'Soft rounded', mono: 'Typewriter mono', pack: 'From the pack' }[k]));
  $('#fontDisplay').replaceChildren(...fontOpts(!!t.fonts.display)); $('#fontDisplay').value = t.font.display;
  $('#fontBody').replaceChildren(...fontOpts(!!t.fonts.body)); $('#fontBody').value = t.font.body;
  $('#lookName').value = draft ? t.name : `${t.name}${visual.builtin ? ' (mine)' : ''}`;
  $('#updateLookBtn').disabled = !!visual.builtin;
}

let draftTimer = 0;
function editDraft(fn) {
  draft ||= JSON.parse(JSON.stringify(visual.theme));
  fn(draft);
  draft = normalizeTheme(draft, PRESETS[0]);
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => applyLook(draft, visual.files), 60);
}

async function saveDraft(asNew) {
  const t = normalizeTheme({ ...workingTheme(), name: $('#lookName').value.trim() || workingTheme().name });
  const id = asNew || visual.builtin ? `visual-${slug(t.name)}-${Date.now().toString(36)}` : visual.id;
  t.id = id;
  const rec = { id, kind: 'visual', installedAt: asNew || visual.builtin ? Date.now() : visual.installedAt || Date.now(), theme: t, files: visual.files || {}, baseUrl: visual.baseUrl || null };
  await packs.put('visual', rec);
  await setLook(id, { silent: true });
  toast(asNew || visual.builtin ? `Saved "${t.name}".` : 'Look updated.');
  renderCustomise();
}

// ================================================================ studio: SpriteCook

function scInputs() {
  const colors = refPalette.length ? colorsFromPalette(refPalette) : visual.theme.colors;
  return { name: $('#scName').value.trim(), theme: $('#scTheme').value.trim(), style: $('#scStyle').value.trim(), pixel: $('#scPixel').value === 'pixel', tier: $('#scTier').value, colors, refName: refFile?.name || null };
}

function renderBrief() {
  lastBrief = buildSpriteCookBrief(scInputs(), pack);
  const b = lastBrief;
  $('#scOut').classList.remove('hidden');
  $('#scCount').textContent = `${b.jobs.length} assets`;
  $('#scLock').textContent = b.lock;
  $('#scJobs').replaceChildren(...b.jobs.map((j) => h('div', { class: 'job' },
    h('div', { class: 'job-head' }, h('b', { text: j.label }), h('span', { class: 'tier-tag', text: j.tier })),
    h('div', { class: 'job-file', text: j.file }),
    h('div', { class: 'job-params', text: `${j.params.width}×${j.params.height} · ${j.params.aspect_ratio} · mode ${j.params.mode} · background ${j.params.bg_mode}${j.nine ? ' · 9-slice' : ''}` }),
    h('div', { class: 'job-prompt', text: j.params.prompt }),
    h('div', { class: 'btn-row' }, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: () => copy(j.params.prompt, 'Prompt copied.') }, 'Copy prompt')))));
  $('#scOut').scrollIntoView({ behavior: motionLevel() === 'off' ? 'auto' : 'smooth', block: 'start' });
}

async function copy(text, msg = 'Copied.') {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch {
    const ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = text; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); toast(msg); } catch { toast('Copy failed. Select the text manually.'); }
    ta.remove();
  }
}

async function setReference(file) {
  if (!file || !file.type.startsWith('image/')) return;
  refFile = file;
  const img = $('#refPreview');
  if (img.src) URL.revokeObjectURL(img.src);
  img.src = URL.createObjectURL(file); img.classList.remove('hidden'); $('#refHint').classList.add('hidden');
  try { refPalette = await extractPalette(file, 8); } catch { refPalette = []; }
  $('#refSwatches').replaceChildren(...refPalette.map((p) => h('span', { class: 'swatch', style: `background:${p.hex}`, title: p.hex })));
  if (lastBrief) renderBrief();
}

// ================================================================ studio: Lore Forge

function forgeInputs() {
  return {
    giver: $('#fgGiver').value.trim(), recipient: $('#fgRecipient').value.trim(), world: $('#fgWorld').value.trim(), tone: $('#fgTone').value.trim(),
    intents: $('#fgIntents').value.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6), companions: $('#fgCompanions').value.trim(),
    size: $('#fgSize').value, special: $('#fgSpecial').checked, notes: $('#fgNotes').value.trim(), hasImage: $('#fgUseRef').checked && !!refFile,
  };
}

function showReport(el, v) {
  el.replaceChildren(
    v.ok ? h('div', { class: 'ok', text: `Looks good: "${v.pack.title}" with ${v.pack.offerings.length} offerings, ${v.pack.rare.length} rare, ${v.pack.companions.length} companions and ${v.pack.lore.length} lore entries.` }) : h('div', { class: 'err', text: 'This pack needs fixing before it can be installed:' }),
    v.errors.length ? h('ul', {}, ...v.errors.slice(0, 12).map((e) => h('li', { class: 'err', text: e }))) : null,
    v.warnings.length ? h('ul', {}, ...v.warnings.slice(0, 8).map((w) => h('li', { class: 'warn', text: w }))) : null);
}

async function fileToBase64(file) {
  // Downscale large references so the request stays small.
  const img = new Image(); img.src = URL.createObjectURL(file); await img.decode();
  const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = h('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(img.src);
  return { mediaType: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.85).split(',')[1] };
}

async function forgeGenerate() {
  const key = $('#fgKey').value.trim();
  if (!key) { toast('Add your Anthropic API key first.'); $('#fgKey').focus(); return; }
  if (!navigator.onLine) { toast("You're offline. Generation needs a connection."); return; }
  try { ($('#fgRemember').checked ? localStorage : sessionStorage).setItem('codexStudio:key', key); if (!$('#fgRemember').checked) localStorage.removeItem('codexStudio:key'); } catch {}
  const f = forgeInputs();
  const btn = $('#fgGenerateBtn'); btn.disabled = true;
  $('#fgProgress').classList.remove('hidden');
  const txt = $('#fgProgressText'); txt.textContent = 'Thinking about your world…';
  try {
    const image = f.hasImage ? await fileToBase64(refFile) : null;
    const out = await generateWithClaude({ apiKey: key, model: $('#fgModel').value, prompt: buildForgePrompt(f), image, onProgress: (n) => { txt.textContent = `Writing… ${Math.round(n / 1000)}k characters`; } });
    $('#fgJson').value = out;
    const v = validateContentPack(out);
    showReport($('#fgReport'), v);
    txt.textContent = v.ok ? 'Done! Check the pack below, then install it.' : 'Done, but the pack needs a fix (see below).';
    $('#fgJson').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (e) {
    console.error(e);
    txt.textContent = describeApiError(e);
    toast(describeApiError(e));
  } finally { btn.disabled = false; }
}

// ================================================================ settings

async function renderSettings() {
  $('#modeSelect').value = settings.mode;
  $('#companionToggle').checked = settings.companions;
  $('#motionSelect').value = settings.motion;
  for (const r of $$('input[name="textSize"]')) r.checked = r.value === (settings.textSize || 'm');
  $('#fontSelect').value = settings.font || 'look';
  $('#spacingToggle').checked = !!settings.spacing;
  $('#contrastToggle').checked = !!settings.contrast;
  $('#blurbToggle').checked = !!settings.blurbs;
  $('#soundToggle').checked = settings.sound;
  $('#hapticToggle').checked = settings.haptics;
  $('#hapticToggle').closest('.switch').classList.toggle('hidden', !('vibrate' in navigator));
  $('#installBtn').classList.toggle('hidden', !deferredInstall);
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $('#iosInstall').classList.toggle('hidden', !(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone));
  const est = await storageEstimate();
  $('#storageInfo').textContent = est ? `Using ${(est.used / 1048576).toFixed(1)} MB of on-device storage for packs and progress.` : '';
}

/** Reading & accessibility preferences live on <html> as data attributes (also set before first paint in index.html). */
function applyReading() {
  const d = document.documentElement.dataset;
  d.text = ['m', 'l', 'xl', 'xxl'].includes(settings.textSize) ? settings.textSize : 'm';
  d.font = ['look', 'plain', 'legible'].includes(settings.font) ? settings.font : 'look';
  d.spacing = settings.spacing ? 'wide' : 'normal';
  d.contrast = settings.contrast ? 'high' : 'normal';
  d.blurbsForce = settings.blurbs ? 'on' : 'off';
  requestAnimationFrame(moveIndicator);
}

function saveSettings(msg) { settingsStore.save(settings); if (game) game.settings = settings; if (msg) toast(msg); }

// ================================================================ toast

let toastTimer = 0;
function toast(msg, action) {
  const el = $('#toast');
  $('#toastText').textContent = msg;
  const btn = $('#toastAction');
  btn.classList.toggle('hidden', !action);
  if (action) { btn.textContent = action.label; btn.onclick = () => { el.classList.add('hidden'); action.run(); }; }
  el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), action ? 9000 : 2600);
}

// ================================================================ wiring

function wire() {
  $('#newBtn').addEventListener('click', () => { tone('tap', settings.sound); nextOffering(); });
  $('#nextBtn').addEventListener('click', nextOffering);
  $('#dailyBtn').addEventListener('click', openDaily);
  for (const b of $$('.nav-btn')) b.addEventListener('click', () => { go(b.dataset.view); buzz(6, settings.haptics); });
  for (const b of $$('#studioTabs [role="tab"]')) b.addEventListener('click', () => go('studio', b.dataset.pane));
  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
  window.addEventListener('resize', moveIndicator, { passive: true });
  $('#codexSearch').addEventListener('input', renderCodex);
  $('#loreSheet').addEventListener('close', () => setTimeout(showNextLore, 250));

  // packs / import
  $('#importFile').addEventListener('change', (e) => { handleImportFile(e.target.files[0]); e.target.value = ''; });
  const dz = $('#dropZone');
  for (const ev of ['dragenter', 'dragover']) dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('drag'); });
  for (const ev of ['dragleave', 'drop']) dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('drag'); });
  dz.addEventListener('drop', (e) => handleImportFile(e.dataTransfer.files[0]));
  $('#demoArtBtn').addEventListener('click', async () => {
    try { const r = await fetch('packs/demo-art-pack.zip'); if (!r.ok) throw new Error(); await reviewVisualImport(new File([await r.blob()], 'demo-art-pack.zip')); }
    catch { toast('The demo pack could not be loaded (are you offline?).'); }
  });
  $('#templateBtn').addEventListener('click', async () => {
    const b = buildSpriteCookBrief({ name: 'My look', theme: '', style: '', pixel: false, tier: 'complete', colors: visual.theme.colors }, pack);
    await shareOrDownload(await briefZip(b, null), 'codex-visual-pack-template.zip');
  });
  $('#importCancel').addEventListener('click', () => { $('#importSheet').close(); pendingImport = null; });
  $('#importConfirm').addEventListener('click', confirmVisualImport);

  // customise
  $('#paletteFile').addEventListener('change', async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    const pal = await extractPalette(f, 8).catch(() => []);
    if (!pal.length) { toast("Couldn't read colours from that image."); return; }
    $('#paletteSwatches').replaceChildren(...pal.map((p) => h('span', { class: 'swatch', style: `background:${p.hex}`, title: p.hex })));
    editDraft((d) => { d.colors = colorsFromPalette(pal); });
    setTimeout(renderCustomise, 80);
    toast('Palette applied. Save it to keep it.');
  });
  $('#radiusRange').addEventListener('input', (e) => { $('#radiusOut').textContent = `${e.target.value}px`; editDraft((d) => { d.radius = +e.target.value; }); });
  $('#densityRange').addEventListener('input', (e) => { $('#densityOut').textContent = `${e.target.value}×`; editDraft((d) => { d.motion.density = +e.target.value; }); });
  $('#particleSel').addEventListener('change', (e) => editDraft((d) => { d.motion.particles = e.target.value; }));
  $('#pixelToggle').addEventListener('change', (e) => editDraft((d) => { d.style = e.target.checked ? 'pixel' : 'hd'; }));
  $('#fontDisplay').addEventListener('change', (e) => editDraft((d) => { d.font.display = e.target.value; }));
  $('#fontBody').addEventListener('change', (e) => editDraft((d) => { d.font.body = e.target.value; }));
  $('#lookName').addEventListener('input', (e) => { if (draft) draft.name = e.target.value; });
  $('#saveLookBtn').addEventListener('click', () => saveDraft(true));
  $('#updateLookBtn').addEventListener('click', () => saveDraft(false));
  $('#revertLookBtn').addEventListener('click', async () => { draft = null; await applyLook(visual.theme, visual.files); renderCustomise(); toast('Reverted.'); });

  // spritecook
  $('#scRef').addEventListener('change', (e) => setReference(e.target.files[0]));
  const rd = $('#refDrop');
  rd.addEventListener('dragover', (e) => e.preventDefault());
  rd.addEventListener('drop', (e) => { e.preventDefault(); setReference(e.dataTransfer.files[0]); });
  $('#scBuildBtn').addEventListener('click', renderBrief);
  $('#scZipBtn').addEventListener('click', async () => { if (!lastBrief) renderBrief(); await shareOrDownload(await briefZip(lastBrief, refFile), `${slug(lastBrief.themeJson.name) || 'spritecook'}-brief.zip`); });
  $('#scAgentBtn').addEventListener('click', () => copy(lastBrief.agentPrompt, 'Agent prompt copied. Paste it into Claude with SpriteCook connected.'));
  $('#scPreviewBtn').addEventListener('click', async () => {
    if (!lastBrief) renderBrief();
    toast('Painting placeholder art…');
    const zip = await placeholderPack(lastBrief.themeJson, lastBrief.jobs);
    await reviewVisualImport(new File([zip], 'placeholder.zip'));
  });

  // forge
  try { const k = localStorage.getItem('codexStudio:key') || sessionStorage.getItem('codexStudio:key'); if (k) { $('#fgKey').value = k; $('#fgRemember').checked = !!localStorage.getItem('codexStudio:key'); } } catch {}
  $('#fgCopyBtn').addEventListener('click', () => copy(`${FORGE_SYSTEM}\n\n${buildForgePrompt({ ...forgeInputs(), hasImage: false })}`, 'Prompt copied. Paste it into Claude, then paste the JSON back here.'));
  $('#fgGenerateBtn').addEventListener('click', forgeGenerate);
  $('#fgValidateBtn').addEventListener('click', () => showReport($('#fgReport'), validateContentPack($('#fgJson').value)));
  $('#fgInstallBtn').addEventListener('click', async () => {
    const v = await installStory($('#fgJson').value);
    showReport($('#fgReport'), v);
    if (v.ok) go('play');
  });
  $('#fgRemixBtn').addEventListener('click', () => { $('#fgJson').value = JSON.stringify(pack, null, 2); showReport($('#fgReport'), validateContentPack(pack)); toast('Loaded. Edit the JSON, change the id, then install it as a new story.'); });

  // settings
  $('#modeSelect').addEventListener('change', (e) => { settings.mode = e.target.value; saveSettings('Free-play mode updated.'); });
  $('#companionToggle').addEventListener('change', (e) => { settings.companions = e.target.checked; saveSettings(e.target.checked ? 'Companions may now interfere.' : 'Companion offerings paused.'); });
  $('#motionSelect').addEventListener('change', (e) => { settings.motion = e.target.value; saveSettings(); configureFx({ motion: settings.motion }); });
  for (const r of $$('input[name="textSize"]')) r.addEventListener('change', () => { settings.textSize = r.value; saveSettings(); applyReading(); });
  $('#fontSelect').addEventListener('change', (e) => { settings.font = e.target.value; saveSettings(); applyReading(); });
  $('#spacingToggle').addEventListener('change', (e) => { settings.spacing = e.target.checked; saveSettings(); applyReading(); });
  $('#contrastToggle').addEventListener('change', (e) => { settings.contrast = e.target.checked; saveSettings(); applyReading(); });
  $('#blurbToggle').addEventListener('change', (e) => { settings.blurbs = e.target.checked; saveSettings(); applyReading(); });
  $('#soundToggle').addEventListener('change', (e) => { settings.sound = e.target.checked; saveSettings(); playSfx('reveal', 'correct'); });
  $('#hapticToggle').addEventListener('change', (e) => { settings.haptics = e.target.checked; saveSettings(); buzz(20, settings.haptics); });
  $('#resetBtn').addEventListener('click', () => {
    if (!confirm(`Reset all progress for "${pack.title}" on this device?`)) return;
    progressStore.reset(pack.id);
    game = new Game(pack, progressStore.load(pack.id), settings);
    renderAll(); openDaily(); toast('Progress reset.');
  });
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; $('#installBtn').classList.remove('hidden'); });
  $('#installBtn').addEventListener('click', async () => { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice.catch(() => {}); deferredInstall = null; $('#installBtn').classList.add('hidden'); });
  window.addEventListener('appinstalled', () => toast('Installed. Find it on your home screen.'));
  $('#welcomeSheet').addEventListener('close', () => {
    settings.onboarded = true; settingsStore.save(settings);
    if ($('#welcomeSheet').returnValue === 'reading') { go('studio', 'settings'); setTimeout(() => $('input[name="textSize"]:checked')?.focus(), 350); }
  });
}

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const offer = (w) => toast('A new version is ready.', { label: 'Reload', run: () => w.postMessage('skipWaiting') });
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
    });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && navigator.serviceWorker.controller) { reloaded = true; location.reload(); } });
}

// ================================================================ boot

async function boot() {
  initFx($('#fx'));
  applyReading();
  wire();
  // The first Studio release defaulted to a colour-only preset; move anyone who never chose a look onto Tideglass.
  if (settings.visual === 'preset:tideglass' && !settings.lookChosen) settings.visual = 'builtin:tideglass';
  await setLook(settings.visual, { silent: true });
  await setStory(settings.content, { silent: true });
  route();
  sfxReady = true;
  registerSW();
  if (!settings.onboarded) setTimeout(() => $('#welcomeSheet').showModal(), 500);
  // Opened from the OS with a pack file (installed PWA file handler).
  if ('launchQueue' in window) window.launchQueue.setConsumer(async (params) => { for (const fh of params.files || []) handleImportFile(await fh.getFile()); });
  document.documentElement.classList.add('ready');
}

boot().catch((e) => {
  console.error(e);
  document.body.append(h('div', { class: 'card section', style: 'margin:16px' }, h('b', { text: 'Codex Studio could not start.' }), h('p', { class: 'small', text: e.message })));
});

// exposed for automated tests only
window.__studio = { get current() { return current; }, get game() { return game; }, get pack() { return pack; }, get visual() { return visual; }, get applied() { return applied; } };
