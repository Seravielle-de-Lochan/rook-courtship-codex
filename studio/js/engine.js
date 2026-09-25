// Data-driven game engine: everything the original Rook game hard-coded
// (intents, collections, companions, lore) now comes from a content pack.

export const RARE_CHANCE = 0.01;
export const COMPANION_CHANCE = 0.14;

export function pick(arr, rand = Math.random) { return arr[Math.floor(rand() * arr.length)]; }
export function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72); }
export function localDateKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function hashString(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function seeded(seed) {
  let x = seed >>> 0;
  return () => { x += 0x6d2b79f5; let t = x; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const canonicalId = (id) => String(id).replace(/^daily-\d{4}-\d{2}-\d{2}-/, '');

// ---------------------------------------------------------------- validation

const LABEL_DEFAULTS = {
  daily: "Today's offering",
  question: 'What did I mean by this?',
  unread: 'Uninterpreted',
  correctBadge: 'Read perfectly',
  wrongBadge: 'Unexpected logic',
  correctVerdict: 'You read me perfectly.',
  wrongVerdict: 'Entirely reasonable. The truth is stranger.',
  codexTitle: 'Discovered offerings',
  loreTitle: 'Secret lore',
  loreIntro: 'Certain combinations of finds unlock hidden entries.',
  lockedLore: 'The rest of this entry stays hidden until the right finds gather together.',
};

/**
 * Validate and normalise a content pack. Returns human-readable errors so
 * generated packs can be fixed rather than silently failing.
 */
export function validateContentPack(input) {
  const errors = [];
  const warnings = [];
  let p = input;
  if (typeof p === 'string') {
    try { p = JSON.parse(p.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch (e) { return { ok: false, errors: [`Not valid JSON: ${e.message}`], warnings }; }
  }
  if (!p || typeof p !== 'object') return { ok: false, errors: ['Pack must be a JSON object.'], warnings };
  const str = (v, fallback = '') => (typeof v === 'string' ? v.trim() : fallback);
  const arr = (v) => (Array.isArray(v) ? v : []);

  const pack = {
    format: 'codex-content-pack',
    version: 1,
    id: slug(str(p.id) || str(p.title) || 'custom-pack') || 'custom-pack',
    title: str(p.title, 'Untitled Codex'),
    eyebrow: str(p.eyebrow, 'field study · pocket edition'),
    subtitle: str(p.subtitle),
    giver: { name: str(p.giver?.name, 'Someone'), description: str(p.giver?.description) },
    recipient: { name: str(p.recipient?.name, 'you') },
    labels: { ...LABEL_DEFAULTS },
    intents: [],
    collections: [],
    offerings: [],
    rare: [],
    companions: [],
    lore: [],
    special: null,
  };
  for (const [k, v] of Object.entries(p.labels || {})) if (typeof v === 'string' && v.trim()) pack.labels[k] = v.trim();
  if (!str(p.title)) warnings.push('No title given; using "Untitled Codex".');

  // intents
  const intentIds = new Set();
  for (const [i, it] of arr(p.intents).entries()) {
    const id = slug(str(it?.id) || str(it?.label));
    if (!id) { errors.push(`intents[${i}] needs an id.`); continue; }
    if (intentIds.has(id)) { errors.push(`Duplicate intent id "${id}".`); continue; }
    intentIds.add(id);
    const lines = arr(it.lines).filter((l) => typeof l === 'string' && l.trim());
    pack.intents.push({ id, label: str(it.label, id), blurb: str(it.blurb), why: str(it.why, 'The meaning was there all along.'), lines: lines.length ? lines : ['“You know what this means.”'] });
  }
  if (pack.intents.length < 2) errors.push('A pack needs at least 2 intents (the answers a player can choose).');
  if (pack.intents.length > 6) warnings.push('More than 6 intents makes the answer grid crowded on phones.');

  // collections
  const collectionNames = new Set();
  for (const [i, c] of arr(p.collections).entries()) {
    const name = str(c?.name);
    if (!name) { errors.push(`collections[${i}] needs a name.`); continue; }
    if (collectionNames.has(name)) { errors.push(`Duplicate collection "${name}".`); continue; }
    collectionNames.add(name);
    const weights = arr(c.intentWeights).map((x) => slug(x)).filter((x) => intentIds.has(x));
    const objects = arr(c.objects).map((o) => (Array.isArray(o) ? { name: o[0], glyph: o[1] } : o)).filter((o) => str(o?.name)).map((o) => ({ name: str(o.name), glyph: str(o.glyph, '✦') }));
    const col = {
      name,
      blurb: str(c.blurb),
      intentWeights: weights.length ? weights : [...intentIds],
      objects,
      places: arr(c.places).filter((x) => typeof x === 'string' && x.trim()),
      touches: arr(c.touches).filter((x) => typeof x === 'string' && x.trim()),
      lines: { intent: slug(str(c.lines?.intent)), lines: arr(c.lines?.lines).filter((x) => typeof x === 'string') },
    };
    col.procedural = col.objects.length > 0 && col.places.length > 0 && col.touches.length > 0;
    if (!col.procedural) warnings.push(`Collection "${name}" has no complete procedural bank (objects, places, touches), so it only appears through handcrafted offerings.`);
    pack.collections.push(col);
  }
  if (!pack.collections.length) errors.push('A pack needs at least 1 collection.');

  const seenIds = new Set();
  const normOffering = (o, where, extra = {}) => {
    const id = slug(str(o?.id) || str(o?.name));
    if (!id) { errors.push(`${where}: offering needs an id or name.`); return null; }
    if (seenIds.has(id)) { errors.push(`${where}: duplicate offering id "${id}".`); return null; }
    seenIds.add(id);
    const intent = slug(str(o.intent));
    if (!intentIds.has(intent)) { errors.push(`${where} "${id}": intent "${o.intent}" is not one of the pack's intents (${[...intentIds].join(', ')}).`); return null; }
    let collection = str(o.collection);
    if (!collectionNames.has(collection)) {
      if (collection) warnings.push(`${where} "${id}": unknown collection "${collection}", filed under "${pack.collections[0]?.name}".`);
      collection = pack.collections[0]?.name || 'Uncatalogued';
    }
    return {
      id, name: str(o.name, id), glyph: str(o.glyph, '✦'), intent, collection,
      desc: str(o.desc), why: str(o.why), line: str(o.line) || str(o.rook), codex: str(o.codex) || `${str(o.name, id)}.`, ...extra,
    };
  };
  pack.offerings = arr(p.offerings).map((o, i) => normOffering(o, `offerings[${i}]`)).filter(Boolean);
  pack.rare = arr(p.rare).map((o, i) => normOffering(o, `rare[${i}]`, { rare: true })).filter(Boolean);
  for (const [i, c] of arr(p.companions).entries()) {
    const name = str(c?.name);
    if (!name) { errors.push(`companions[${i}] needs a name.`); continue; }
    const offerings = arr(c.offerings).map((o, j) => normOffering(o, `companions[${i}].offerings[${j}]`, { giver: name })).filter(Boolean);
    if (!offerings.length) { warnings.push(`Companion "${name}" has no offerings and was skipped.`); continue; }
    pack.companions.push({ name, blurb: str(c.blurb), offerings });
  }
  if (!pack.offerings.length && !pack.collections.some((c) => c.procedural)) errors.push('A pack needs handcrafted offerings or at least one complete procedural collection.');

  const loreIds = new Set();
  for (const [i, l] of arr(p.lore).entries()) {
    const id = slug(str(l?.id) || str(l?.title));
    if (!id || loreIds.has(id)) { errors.push(`lore[${i}] needs a unique id.`); continue; }
    loreIds.add(id);
    const r = l.requires || {};
    const type = ['ids', 'companions', 'intentCount', 'collectionCount', 'rareCount'].includes(r.type) ? r.type : null;
    if (!type) { errors.push(`lore "${id}": requires.type must be one of ids, companions, intentCount, collectionCount, rareCount.`); continue; }
    const req = { type, ids: arr(r.ids).map(String), intent: slug(str(r.intent)), collection: str(r.collection), count: Math.max(1, Number(r.count) || 1) };
    if (type === 'ids') {
      req.ids = req.ids.map(slug);
      const missing = req.ids.filter((x) => !seenIds.has(x));
      if (missing.length) warnings.push(`lore "${id}" refers to offerings that don't exist (${missing.join(', ')}); it can never unlock.`);
    }
    if (type === 'intentCount' && !intentIds.has(req.intent)) warnings.push(`lore "${id}" counts intent "${req.intent}", which doesn't exist.`);
    if (type === 'collectionCount' && !collectionNames.has(req.collection)) warnings.push(`lore "${id}" counts collection "${req.collection}", which doesn't exist.`);
    if (type === 'companions' && !req.ids.length) req.ids = pack.companions.map((c) => c.name);
    pack.lore.push({ id, title: str(l.title, id), hint: str(l.hint), body: str(l.body), requires: req });
  }

  if (p.special && intentIds.has(slug(str(p.special.intent)))) {
    const s = p.special;
    pack.special = { intent: slug(s.intent), tab: str(s.tab, 'Special').slice(0, 14), title: str(s.title, 'Special file'), intro: str(s.intro), stamp: str(s.stamp, 'On file'), empty: str(s.empty, 'Nothing on file yet.') };
  }

  return { ok: errors.length === 0, errors, warnings, pack };
}

// ---------------------------------------------------------------- game

export class Game {
  constructor(pack, progress, settings) {
    this.pack = pack;
    this.p = progress;
    this.settings = settings;
    this.intents = Object.fromEntries(pack.intents.map((i) => [i.id, i]));
    this.recent = [];
    this.migrate();
  }

  migrate() {
    for (const id of Object.keys(this.p.discovered)) {
      const c = canonicalId(id);
      if (c !== id) { this.p.discovered[c] ||= this.p.discovered[id]; delete this.p.discovered[id]; }
    }
  }

  intentFor(collection, rand) { return pick(collection.intentWeights, rand); }

  generateProcedural(rand = Math.random) {
    const cols = this.pack.collections.filter((c) => c.procedural);
    if (!cols.length) return null;
    const col = pick(cols, rand);
    const obj = pick(col.objects, rand);
    const place = pick(col.places, rand);
    const touch = pick(col.touches, rand);
    const intent = this.intentFor(col, rand);
    const it = this.intents[intent];
    const name = obj.name.charAt(0).toUpperCase() + obj.name.slice(1);
    const special = col.lines.intent === intent && col.lines.lines.length ? col.lines.lines : null;
    return {
      id: `p-${slug(col.name)}-${intent}-${slug(obj.name)}-${slug(place)}-${slug(touch)}`,
      name, glyph: obj.glyph, intent, collection: col.name,
      desc: `${name}, ${place}, ${touch}.`,
      why: it.why,
      line: pick(special || it.lines, rand),
      codex: `${name} — ${it.label.toLowerCase()}; ${place}.`,
      procedural: true,
    };
  }

  companionOfferings() { return this.pack.companions.flatMap((c) => c.offerings); }

  randomOffering(rand = Math.random) {
    const { rare, offerings } = this.pack;
    const companions = this.companionOfferings();
    if (rare.length && rand() < RARE_CHANCE) return { ...pick(rare, rand) };
    if (this.settings.companions && companions.length && rand() < COMPANION_CHANCE) return { ...pick(companions, rand) };
    const mode = this.settings.mode;
    const proc = () => this.generateProcedural(rand);
    const hand = () => (offerings.length ? { ...pick(offerings, rand) } : null);
    if (mode === 'handcrafted') return hand() || proc();
    if (mode === 'procedural') return proc() || hand();
    return rand() < 0.52 ? hand() || proc() : proc() || hand();
  }

  next() {
    let o = this.randomOffering();
    for (let tries = 0; this.recent.includes(o.id) && tries < 10; tries++) o = this.randomOffering();
    this.recent.push(o.id);
    if (this.recent.length > 8) this.recent.shift();
    return o;
  }

  daily(dateKey = localDateKey()) {
    if (this.p.dailyCache[dateKey]) return this.p.dailyCache[dateKey];
    const rand = seeded(hashString(`codex-daily-v1-${this.pack.id}-${dateKey}`));
    const o = this.randomOffering(rand);
    const d = { ...o, daily: true, id: `daily-${dateKey}-${o.id}` };
    this.p.dailyCache[dateKey] = d;
    return d;
  }

  dailyAnswer(dateKey = localDateKey()) { return this.p.dailyAnswers[dateKey] || null; }

  answer(o, intent) {
    const hit = intent === o.intent;
    const key = canonicalId(o.id);
    const already = !!this.p.discovered[key];
    this.p.seen++;
    if (hit) { this.p.correct++; this.p.streak = (this.p.streak || 0) + 1; this.p.best = Math.max(this.p.best || 0, this.p.streak); }
    else this.p.streak = 0;
    this.p.discovered[key] = {
      name: o.name, intent: o.intent, collection: o.collection, codex: o.codex, glyph: o.glyph,
      procedural: !!o.procedural, rare: !!o.rare, giver: o.giver || null,
      firstSeen: already ? this.p.discovered[key].firstSeen : localDateKey(),
    };
    if (o.daily) this.p.dailyAnswers[localDateKey()] = { id: o.id, intent };
    const unlocked = this.checkLore();
    return { hit, isNew: !already, unlocked };
  }

  entries() { return Object.entries(this.p.discovered).map(([id, v]) => ({ id, ...v })); }

  loreProgress(rule) {
    const vals = Object.values(this.p.discovered);
    const r = rule.requires;
    switch (r.type) {
      case 'ids': { const have = r.ids.filter((id) => this.p.discovered[id]).length; return [have, r.ids.length]; }
      case 'companions': { const have = r.ids.filter((g) => vals.some((v) => v.giver === g)).length; return [have, r.ids.length]; }
      case 'intentCount': return [Math.min(r.count, vals.filter((v) => v.intent === r.intent).length), r.count];
      case 'collectionCount': return [Math.min(r.count, vals.filter((v) => v.collection === r.collection).length), r.count];
      case 'rareCount': return [Math.min(r.count, vals.filter((v) => v.rare).length), r.count];
      default: return [0, 1];
    }
  }

  checkLore() {
    const newly = [];
    for (const rule of this.pack.lore) {
      if (this.p.unlockedLore[rule.id]) continue;
      const [have, need] = this.loreProgress(rule);
      if (have >= need) { this.p.unlockedLore[rule.id] = localDateKey(); newly.push(rule); }
    }
    return newly;
  }

  stats() {
    const vals = Object.values(this.p.discovered);
    return {
      seen: this.p.seen, correct: this.p.correct, streak: this.p.streak || 0, best: this.p.best || 0,
      understood: `${this.p.seen ? Math.round((100 * this.p.correct) / this.p.seen) : 0}%`,
      entries: vals.length, rare: vals.filter((v) => v.rare).length,
      lore: Object.keys(this.p.unlockedLore).filter((id) => this.pack.lore.some((l) => l.id === id)).length,
    };
  }
}
