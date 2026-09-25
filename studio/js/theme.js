// Visual packs: presets, image slots, palette extraction, zip import/export.
import { readZip, writeZip } from './zip.js';
import { slug } from './engine.js';

// ---------------------------------------------------------------- slots
// Every image a visual pack can supply. The same table drives the SpriteCook
// brief (prompt, size, mode) and the zip importer (filename aliases).
export const STATIC_SLOTS = [
  { key: 'background', label: 'App background', tier: 'essential', aspect: '9:16', w: 288, h: 512, mode: 'texture', bg: 'include', resolution: '2K',
    prompt: 'full-screen portrait mobile game background, atmospheric and softly lit, calm low-detail centre so text stays readable, no characters, no text, no UI', aliases: ['bg', 'backdrop', 'wallpaper', 'scene'] },
  { key: 'panel', label: 'Card frame (9-slice)', tier: 'essential', nine: true, slice: 32, aspect: '1:1', w: 256, h: 256, mode: 'ui', bg: 'transparent',
    prompt: 'empty rectangular UI panel frame, decorative corners, straight uniform edges for 9-slice scaling, plain dark translucent centre, no text, front view', aliases: ['frame', 'card', 'window', 'dialog', 'box', 'container', 'panel-frame'] },
  { key: 'button', label: 'Button (9-slice)', tier: 'essential', nine: true, slice: 22, aspect: '16:9', w: 256, h: 144, mode: 'ui', bg: 'transparent',
    prompt: 'blank wide rounded game UI button, idle state, uniform edges suitable for 9-slice, no text, no icon, front view', aliases: ['btn', 'button-normal', 'button-idle', 'primary-button'] },
  { key: 'buttonActive', label: 'Button pressed / selected (9-slice)', tier: 'complete', nine: true, slice: 22, aspect: '16:9', w: 256, h: 144, mode: 'ui', bg: 'transparent',
    prompt: 'the same blank game UI button in a glowing selected/pressed state, uniform edges for 9-slice, no text', aliases: ['button-pressed', 'button-selected', 'button-hover', 'btn-active', 'button-on'] },
  { key: 'choice', label: 'Answer tile (9-slice)', tier: 'essential', nine: true, slice: 24, aspect: '16:9', w: 256, h: 144, mode: 'ui', bg: 'transparent',
    prompt: 'blank answer card / option tile for a mobile quiz, subtle border, flat readable centre, uniform edges for 9-slice, no text', aliases: ['option', 'answer', 'tile', 'slot', 'choice-tile'] },
  { key: 'stage', label: 'Offering stage', tier: 'essential', aspect: '16:9', w: 384, h: 216, mode: 'assets', bg: 'include',
    prompt: 'small display alcove or velvet cushion where a single precious object is presented, spot-lit centre, empty, no object, no text', aliases: ['plinth', 'pedestal', 'display', 'altar', 'showcase', 'stage-bg'] },
  { key: 'crest', label: 'Title crest / logo mark', tier: 'essential', aspect: '1:1', w: 192, h: 192, mode: 'ui', bg: 'transparent',
    prompt: 'small emblem crest for the game title, iconic silhouette, no text, centred', aliases: ['logo', 'emblem', 'sigil', 'icon', 'app-icon'] },
  { key: 'particle', label: 'Floating particle sprite', tier: 'essential', aspect: '1:1', w: 32, h: 32, mode: 'assets', bg: 'transparent',
    prompt: 'single tiny glowing floating mote sprite, soft edges, centred, isolated', aliases: ['sparkle', 'mote', 'petal', 'ember', 'star', 'fx'] },
  { key: 'rareBadge', label: 'Rare-find badge', tier: 'complete', aspect: '1:1', w: 64, h: 64, mode: 'ui', bg: 'transparent',
    prompt: 'small shining rare-item star badge icon, gold accents', aliases: ['rare', 'badge-rare', 'rare-star'] },
  { key: 'loreSeal', label: 'Lore unlocked seal', tier: 'complete', aspect: '1:1', w: 96, h: 96, mode: 'ui', bg: 'transparent',
    prompt: 'wax seal or glowing sigil icon meaning a secret has been unlocked', aliases: ['seal', 'lore-unlocked', 'unlocked'] },
  { key: 'loreLock', label: 'Lore locked icon', tier: 'complete', aspect: '1:1', w: 96, h: 96, mode: 'ui', bg: 'transparent',
    prompt: 'closed ornate lock or sealed envelope icon meaning a secret is still hidden', aliases: ['lock', 'lore-locked', 'locked'] },
  { key: 'navPlay', label: 'Nav icon: Play', tier: 'complete', aspect: '1:1', w: 64, h: 64, mode: 'ui', bg: 'transparent', prompt: 'simple UI icon of a small wrapped gift', aliases: ['icon-play', 'nav-play'] },
  { key: 'navCodex', label: 'Nav icon: Codex', tier: 'complete', aspect: '1:1', w: 64, h: 64, mode: 'ui', bg: 'transparent', prompt: 'simple UI icon of an open field journal', aliases: ['icon-codex', 'nav-codex', 'book'] },
  { key: 'navLore', label: 'Nav icon: Lore', tier: 'complete', aspect: '1:1', w: 64, h: 64, mode: 'ui', bg: 'transparent', prompt: 'simple UI icon of a rolled scroll with a tiny seal', aliases: ['icon-lore', 'nav-lore', 'scroll'] },
  { key: 'navSpecial', label: 'Nav icon: Special file', tier: 'complete', aspect: '1:1', w: 64, h: 64, mode: 'ui', bg: 'transparent', prompt: 'simple UI icon of a sealed secret dossier folder', aliases: ['icon-special', 'nav-special', 'nav-classified', 'folder'] },
  { key: 'navStudio', label: 'Nav icon: Studio', tier: 'complete', aspect: '1:1', w: 64, h: 64, mode: 'ui', bg: 'transparent', prompt: 'simple UI icon of a paintbrush crossed with a quill', aliases: ['icon-studio', 'nav-studio', 'nav-settings', 'brush'] },
];

/** Slots that depend on the active content pack (one icon per intent etc.). */
export function dynamicSlots(pack) {
  const out = [];
  for (const it of pack.intents) out.push({ key: `intent-${it.id}`, label: `Answer icon: ${it.label}`, tier: 'essential', aspect: '1:1', w: 64, h: 64, mode: 'ui', bg: 'transparent', prompt: `small symbolic UI icon representing "${it.label}"${it.blurb ? ` (${it.blurb})` : ''}, no text` });
  for (const c of pack.collections) out.push({ key: `collection-${slug(c.name)}`, glyph: c.objects?.[0]?.glyph, label: `Collection icon: ${c.name}`, tier: 'complete', aspect: '1:1', w: 96, h: 96, mode: 'ui', bg: 'transparent', prompt: `collection badge icon for "${c.name}"${c.blurb ? ` — ${c.blurb}` : ''}, no text` });
  for (const c of pack.companions) out.push({ key: `companion-${slug(c.name)}`, label: `Companion portrait: ${c.name}`, tier: 'complete', aspect: '1:1', w: 128, h: 128, mode: 'assets', bg: 'transparent', prompt: `bust portrait of ${c.name}${c.blurb ? `, who ${c.blurb.replace(/\.$/, '').toLowerCase()}` : ''}, expressive, centred` });
  for (const o of [...pack.offerings, ...pack.rare, ...pack.companions.flatMap((c) => c.offerings)]) {
    out.push({ key: `offering-${o.id}`, label: `Offering: ${o.name}`, tier: o.rare ? 'complete' : 'deluxe', glyph: o.glyph, aspect: '1:1', w: 128, h: 128, mode: 'assets', bg: 'transparent', prompt: `${o.name}${o.desc ? `. ${o.desc}` : ''} Single isolated object, three-quarter view, centred, no hands, no text${o.rare ? ', rare treasure with a subtle magical glow' : ''}` });
  }
  return out;
}
export const allSlots = (pack) => [...STATIC_SLOTS, ...dynamicSlots(pack)];

// ---------------------------------------------------------------- presets

export const FONT_STACKS = {
  system: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", system-ui, sans-serif',
  mono: 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace',
  pack: null, // fonts shipped inside the visual pack
};

export const PRESETS = [
  { id: 'preset:tideglass', name: 'Tideglass', description: 'The original sea-glass night palette.', style: 'hd', radius: 22,
    colors: { bg: '#0b1016', bg2: '#12303a', surface: '#15202a', surface2: '#0f171f', border: '#243541', text: '#edf4f2', muted: '#9fb1b0', accent: '#7fcfbd', accent2: '#d7b7c7', rare: '#d8c08a', danger: '#e5c8d4' },
    font: { display: 'system', body: 'system' }, motion: { particles: 'motes', density: 1 } },
  { id: 'preset:moth-lantern', name: 'Moth Lantern', description: 'Plum dusk, amber lamplight, drifting moths.', style: 'hd', radius: 18,
    colors: { bg: '#150d17', bg2: '#3a1f2e', surface: '#221523', surface2: '#1a101b', border: '#4a2e45', text: '#f7ebe0', muted: '#c2a9b3', accent: '#f0b465', accent2: '#e58aa6', rare: '#ffd98a', danger: '#f2b8c6' },
    font: { display: 'serif', body: 'system' }, motion: { particles: 'embers', density: 1 } },
  { id: 'preset:paper-garden', name: 'Paper Garden', description: 'A light, papery field journal with falling petals.', style: 'hd', radius: 16,
    colors: { bg: '#f4efe4', bg2: '#dfe8d5', surface: '#fffaf1', surface2: '#f1eadb', border: '#d6ccb7', text: '#2c2a24', muted: '#6d675a', accent: '#4f7d5c', accent2: '#b0605e', rare: '#a67c1d', danger: '#9b3f3c' },
    font: { display: 'serif', body: 'serif' }, motion: { particles: 'petals', density: 0.8 } },
  { id: 'preset:abyssal', name: 'Abyssal', description: 'Deep-sea navy with bioluminescent bubbles.', style: 'hd', radius: 26,
    colors: { bg: '#050b1a', bg2: '#0a2a4a', surface: '#0c1830', surface2: '#081226', border: '#1b3558', text: '#e6f3ff', muted: '#8fb1cf', accent: '#4ee0e6', accent2: '#8f8cff', rare: '#9ef7c9', danger: '#ff9db5' },
    font: { display: 'rounded', body: 'rounded' }, motion: { particles: 'bubbles', density: 1.1 } },
  { id: 'preset:pixel-hearth', name: 'Pixel Hearth', description: 'Chunky retro pixel UI with square corners.', style: 'pixel', radius: 4,
    colors: { bg: '#1b1426', bg2: '#35214a', surface: '#2a1f3d', surface2: '#221832', border: '#5b3f7a', text: '#fff4e0', muted: '#c9b3d9', accent: '#ffcc4d', accent2: '#ff6f91', rare: '#7df9ff', danger: '#ff9aa2' },
    font: { display: 'mono', body: 'mono' }, motion: { particles: 'sparkles', density: 0.9 } },
];
export const presetById = (id) => PRESETS.find((p) => p.id === id);

// ---------------------------------------------------------------- colour utils

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
function lum([r, g, b]) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a, b) { const [x, y] = [lum(hexToRgb(a)), lum(hexToRgb(b))].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); }
function sat([r, g, b]) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; }
const mix = (a, b, t) => rgbToHex(hexToRgb(a).map((v, i) => v + (hexToRgb(b)[i] - v) * t));
const isHex = (v) => typeof v === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());

/** Push `fg` toward white/black until it reaches `min` contrast against `bg`. */
export function ensureContrast(fg, bg, min = 4.5) {
  if (contrast(fg, bg) >= min) return fg;
  const target = lum(hexToRgb(bg)) > 0.4 ? '#000000' : '#ffffff';
  for (let t = 0.1; t <= 1.001; t += 0.1) { const c = mix(fg, target, t); if (contrast(c, bg) >= min) return c; }
  return target;
}

/** Median-cut palette extraction from an image blob/URL. */
export async function extractPalette(src, count = 8) {
  const img = new Image();
  img.decoding = 'async';
  img.src = src instanceof Blob ? URL.createObjectURL(src) : src;
  await img.decode();
  const size = 72;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, size, size);
  if (src instanceof Blob) URL.revokeObjectURL(img.src);
  const d = x.getImageData(0, 0, size, size).data;
  const px = [];
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) px.push([d[i], d[i + 1], d[i + 2]]);
  if (!px.length) return [];
  let boxes = [px];
  while (boxes.length < count) {
    boxes.sort((a, b) => b.length - a.length);
    const box = boxes.shift();
    if (box.length < 2) { boxes.push(box); break; }
    const ranges = [0, 1, 2].map((ch) => { let lo = 255, hi = 0; for (const p of box) { lo = Math.min(lo, p[ch]); hi = Math.max(hi, p[ch]); } return hi - lo; });
    const ch = ranges.indexOf(Math.max(...ranges));
    box.sort((a, b) => a[ch] - b[ch]);
    const mid = box.length >> 1;
    boxes.push(box.slice(0, mid), box.slice(mid));
  }
  return boxes
    .filter((b) => b.length)
    .map((b) => ({ rgb: [0, 1, 2].map((ch) => b.reduce((s, p) => s + p[ch], 0) / b.length), weight: b.length }))
    .sort((a, b) => b.weight - a.weight)
    .map((b) => ({ hex: rgbToHex(b.rgb), weight: b.weight / px.length }));
}

/** Turn an extracted palette into a full, readable colour token set. */
export function colorsFromPalette(palette, preferLight = null) {
  const hexes = palette.map((p) => p.hex);
  if (!hexes.length) return { ...PRESETS[0].colors };
  const byLum = [...hexes].sort((a, b) => lum(hexToRgb(a)) - lum(hexToRgb(b)));
  const avgLum = palette.reduce((s, p) => s + lum(hexToRgb(p.hex)) * p.weight, 0);
  const light = preferLight ?? avgLum > 0.45;
  const bgBase = light ? byLum[byLum.length - 1] : byLum[0];
  const bg = light ? mix(bgBase, '#ffffff', 0.55) : mix(bgBase, '#000000', 0.45);
  const bySat = [...hexes].sort((a, b) => sat(hexToRgb(b)) * (0.4 + lum(hexToRgb(b))) - sat(hexToRgb(a)) * (0.4 + lum(hexToRgb(a))));
  const surface = light ? mix(bg, '#ffffff', 0.6) : mix(bg, byLum[1] || bg, 0.35);
  const text = light ? mix(byLum[0], '#000000', 0.5) : mix(byLum[byLum.length - 1], '#ffffff', 0.6);
  const accent = ensureContrast(bySat[0], surface, 3);
  const accent2 = ensureContrast(bySat.find((h) => contrast(h, bySat[0]) > 1.3) || bySat[1] || bySat[0], surface, 3);
  return {
    bg,
    bg2: mix(bg, bySat[0], 0.28),
    surface,
    surface2: light ? mix(bg, '#000000', 0.03) : mix(bg, '#000000', 0.2),
    border: mix(surface, text, 0.18),
    text: ensureContrast(text, surface, 7),
    muted: ensureContrast(mix(text, surface, 0.4), surface, 4.5),
    accent,
    accent2,
    rare: ensureContrast(light ? '#9a7314' : '#e6c67f', surface, 3),
    danger: ensureContrast(light ? '#9b3f3c' : '#f2b8c6', surface, 4.5),
  };
}

// ---------------------------------------------------------------- normalise

const COLOR_KEYS = ['bg', 'bg2', 'surface', 'surface2', 'border', 'text', 'muted', 'accent', 'accent2', 'rare', 'danger'];

export function normalizeTheme(t = {}, base = PRESETS[0]) {
  const colors = { ...base.colors };
  for (const k of COLOR_KEYS) if (isHex(t.colors?.[k])) colors[k] = t.colors[k].trim();
  // Guarantee readability whatever a pack (or a generator) asked for.
  colors.text = ensureContrast(colors.text, colors.surface, 7);
  colors.muted = ensureContrast(colors.muted, colors.surface, 4.5);
  colors.accent = ensureContrast(colors.accent, colors.surface, 3);
  return {
    format: 'codex-visual-pack',
    version: 1,
    id: t.id || `visual-${Date.now().toString(36)}`,
    name: String(t.name || 'Custom look').slice(0, 60),
    author: String(t.author || '').slice(0, 80),
    description: String(t.description || '').slice(0, 280),
    style: t.style === 'pixel' ? 'pixel' : 'hd',
    radius: Number.isFinite(+t.radius) ? Math.max(0, Math.min(40, +t.radius)) : base.radius,
    colors,
    font: { display: t.font?.display in FONT_STACKS ? t.font.display : base.font.display, body: t.font?.body in FONT_STACKS ? t.font.body : base.font.body },
    fonts: { display: t.fonts?.display || null, body: t.fonts?.body || null },
    motion: {
      particles: ['motes', 'sparkles', 'petals', 'bubbles', 'embers', 'snow', 'sprite', 'none'].includes(t.motion?.particles) ? t.motion.particles : base.motion.particles,
      density: Number.isFinite(+t.motion?.density) ? Math.max(0, Math.min(2, +t.motion.density)) : base.motion.density,
    },
    images: t.images && typeof t.images === 'object' ? t.images : {},
    art: t.art && typeof t.art === 'object' ? t.art : {},
    spritecook: t.spritecook || null,
  };
}

// ---------------------------------------------------------------- zip import

const IMAGE_RE = /\.(png|webp|jpe?g|gif|avif|svg)$/i;
const FONT_RE = /\.(woff2?|ttf|otf)$/i;
const MIME = { png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf', otf: 'font/otf', json: 'application/json' };
export const mimeFor = (name) => MIME[name.split('.').pop().toLowerCase()] || 'application/octet-stream';
const baseKey = (path) => path.split('/').pop().replace(/\.[^.]+$/, '').replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase().replace(/[\s_.]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
const kebab = (k) => k.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
export const kebabSlot = kebab;

/** Best guess of which slot a file (or manifest component name) belongs to. */
export function guessSlot(nameOrPath, slots) {
  const k = baseKey(nameOrPath);
  for (const s of slots) if (kebab(s.key) === k || s.key.toLowerCase() === k.replace(/-/g, '')) return s.key;
  for (const pre of ['intent-', 'collection-', 'companion-', 'offering-']) {
    if (k.startsWith(pre)) { const hit = slots.find((s) => kebab(s.key) === k || s.key === k); if (hit) return hit.key; }
  }
  const art = k.replace(/^(art|item|object|offering)-/, '');
  const off = slots.find((s) => s.key === `offering-${art}`);
  if (off) return off.key;
  for (const s of slots) if ((s.aliases || []).includes(k)) return s.key;
  // loose: file name contains an alias word ("ui_panel_frame_01" -> panel)
  const words = k.split('-');
  if (words.some((w) => ['pressed', 'selected', 'hover', 'active'].includes(w)) && words.some((w) => w.startsWith('btn') || w === 'button')) return 'buttonActive';
  for (const s of STATIC_SLOTS) if ([kebab(s.key), ...(s.aliases || [])].some((a) => !a.includes('-') && words.includes(a))) return s.key;
  return null;
}

/** Walk arbitrary JSON (e.g. a SpriteCook UI-kit manifest) for named image components with 9-slice borders. */
function manifestComponents(json) {
  const found = [];
  const visit = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(visit); return; }
    const file = ['file', 'path', 'filename', 'image', 'sprite', 'src', 'asset'].map((k) => o[k]).find((v) => typeof v === 'string' && IMAGE_RE.test(v));
    if (file) {
      const nm = [o.group, o.name || o.label || o.id, o.state && o.state !== 'normal' && o.state !== 'default' ? o.state : ''].filter(Boolean).join('-');
      const b = o.nine_slice || o.nineSlice || o.slice || o.borders || o.border || o;
      const nums = ['top', 'right', 'bottom', 'left'].map((k) => Number(b?.[k]));
      found.push({ file, name: nm || file, slice: nums.every((n) => Number.isFinite(n)) && nums.some((n) => n > 0) ? nums : null });
    }
    Object.values(o).forEach(visit);
  };
  visit(json);
  return found;
}

/**
 * Parse a visual-pack zip into a record ready for review + storage.
 * Works with a proper theme.json, a SpriteCook UI-kit export, or a loose folder of PNGs.
 */
export async function importVisualZip(file, contentPack) {
  const entries = await readZip(file);
  const paths = [...entries.keys()];
  // Strip a single shared root folder ("my-pack/theme.json" -> "theme.json").
  const roots = new Set(paths.map((p) => (p.includes('/') ? p.split('/')[0] : '')));
  const root = roots.size === 1 && [...roots][0] ? [...roots][0] + '/' : '';
  const files = {};
  const warnings = [];
  let themeJson = null;
  const otherJson = [];
  for (const [p, bytes] of entries) {
    const rel = p.slice(root.length);
    if (/(^|\/)theme\.json$/i.test(rel) && !themeJson) {
      try { themeJson = JSON.parse(new TextDecoder().decode(bytes)); } catch (e) { warnings.push(`theme.json could not be read (${e.message}); using filenames instead.`); }
    } else if (/\.json$/i.test(rel)) {
      try { otherJson.push(JSON.parse(new TextDecoder().decode(bytes))); } catch { /* not ours */ }
    } else if (IMAGE_RE.test(rel) || FONT_RE.test(rel)) {
      files[rel] = new Blob([bytes], { type: mimeFor(rel) });
    }
  }
  if (!Object.keys(files).length) throw new Error('No images were found in that zip. Expected PNG/WebP/JPEG files (and optionally theme.json).');

  const slots = allSlots(contentPack);
  const theme = normalizeTheme(themeJson || { name: file.name?.replace(/\.zip$/i, '') || 'Imported pack' });
  if (themeJson?.id) theme.id = slug(themeJson.id);
  else theme.id = `visual-${slug(theme.name)}-${Date.now().toString(36)}`;

  // 1) explicit mapping from theme.json, 2) SpriteCook/other manifests, 3) filenames
  const mapping = {};
  const slices = {};
  const fileByLoose = (f) => files[f] ? f : Object.keys(files).find((k) => k.toLowerCase() === String(f).toLowerCase() || k.split('/').pop().toLowerCase() === String(f).split('/').pop().toLowerCase());
  for (const [slot, v] of Object.entries(theme.images)) {
    const f = fileByLoose(typeof v === 'string' ? v : v?.file);
    if (f) { mapping[slot] = f; if (typeof v === 'object' && v?.slice != null) slices[slot] = v.slice; } else warnings.push(`theme.json maps "${slot}" to a file that isn't in the zip.`);
  }
  for (const [id, f0] of Object.entries(theme.art)) { const f = fileByLoose(f0); if (f) mapping[`offering-${id}`] = f; }
  for (const json of otherJson) {
    for (const comp of manifestComponents(json)) {
      const f = fileByLoose(comp.file);
      const slot = f && guessSlot(comp.name, slots);
      if (slot && !mapping[slot]) { mapping[slot] = f; if (comp.slice) slices[slot] = comp.slice; }
    }
  }
  const used = new Set(Object.values(mapping));
  for (const f of Object.keys(files)) {
    if (used.has(f) || FONT_RE.test(f)) continue;
    const slot = guessSlot(f, slots);
    if (slot && !mapping[slot]) { mapping[slot] = f; used.add(f); }
  }
  // fonts
  const fontFiles = Object.keys(files).filter((f) => FONT_RE.test(f));
  if (!theme.fonts.display && fontFiles[0]) theme.fonts.display = fontFiles.find((f) => /display|title|head/i.test(f)) || fontFiles[0];
  if (!theme.fonts.body && fontFiles.length > 1) theme.fonts.body = fontFiles.find((f) => /body|text|regular/i.test(f) && f !== theme.fonts.display) || null;
  if (theme.fonts.display) theme.font.display = 'pack';
  if (theme.fonts.body) theme.font.body = 'pack';
  if (theme.style !== 'pixel' && /pixel/i.test(JSON.stringify(themeJson?.spritecook || '') + (themeJson?.style || ''))) theme.style = 'pixel';

  // No colours supplied? Derive them from the background (or panel) art.
  if (!themeJson?.colors) {
    const src = files[mapping.background] || files[mapping.panel] || files[mapping.stage];
    if (src) { try { theme.colors = normalizeTheme({ colors: colorsFromPalette(await extractPalette(src)) }).colors; } catch { /* keep preset colours */ } }
  }
  return { theme, files, mapping, slices, warnings, unmapped: Object.keys(files).filter((f) => !Object.values(mapping).includes(f) && !FONT_RE.test(f)) };
}

/** Finalise a reviewed import into a stored record. */
export function buildVisualRecord({ theme, files, mapping, slices }) {
  const images = {};
  const art = {};
  for (const [slot, f] of Object.entries(mapping)) {
    if (!f) continue;
    if (slot.startsWith('offering-')) art[slot.slice(9)] = f;
    else images[slot] = slices[slot] != null ? { file: f, slice: slices[slot] } : f;
  }
  const keep = new Set([...Object.values(mapping), theme.fonts.display, theme.fonts.body].filter(Boolean));
  const kept = Object.fromEntries(Object.entries(files).filter(([k]) => keep.has(k)));
  return { id: theme.id, kind: 'visual', installedAt: Date.now(), theme: { ...theme, images, art }, files: kept };
}

export async function exportVisualZip(record) {
  const list = [{ name: 'theme.json', data: JSON.stringify(record.theme, null, 2) }];
  for (const [name, blob] of Object.entries(record.files || {})) list.push({ name, data: blob });
  return writeZip(list);
}

// ---------------------------------------------------------------- apply

let liveUrls = [];
let liveFonts = [];

/** Apply a visual record (preset or installed pack) to the document. */
export async function applyVisual(record, root = document.documentElement) {
  const theme = record.theme;
  const files = record.files || {};
  for (const u of liveUrls) URL.revokeObjectURL(u);
  liveUrls = [];
  for (const f of liveFonts) document.fonts.delete(f);
  liveFonts = [];
  const url = (f) => { const b = files[f]; if (!b) return null; const u = URL.createObjectURL(b); liveUrls.push(u); return u; };

  const st = root.style;
  // wipe previous image vars
  for (const prop of [...st]) if (prop.startsWith('--img-') || prop.startsWith('--slice-')) st.removeProperty(prop);
  for (const a of [...root.attributes]) if (a.name.startsWith('data-has-')) root.removeAttribute(a.name);

  for (const [k, v] of Object.entries(theme.colors)) st.setProperty(`--c-${kebab(k)}`, v);
  const accentRgb = hexToRgb(theme.colors.accent).join(',');
  const rareRgb = hexToRgb(theme.colors.rare).join(',');
  st.setProperty('--accent-rgb', accentRgb);
  st.setProperty('--bg-rgb', hexToRgb(theme.colors.bg).join(','));
  st.setProperty('--rare-rgb', rareRgb);
  st.setProperty('--accent2-rgb', hexToRgb(theme.colors.accent2).join(','));
  st.setProperty('--radius', `${theme.radius}px`);
  root.dataset.style = theme.style;
  root.dataset.scheme = lum(hexToRgb(theme.colors.bg)) > 0.4 ? 'light' : 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colors.bg);

  for (const role of ['display', 'body']) {
    let family = FONT_STACKS[theme.font[role]] || FONT_STACKS.system;
    if (theme.font[role] === 'pack' && theme.fonts[role] && files[theme.fonts[role]]) {
      try {
        const ff = new FontFace(`PackFont-${role}`, `url(${url(theme.fonts[role])})`, { display: 'swap' });
        await ff.load();
        document.fonts.add(ff);
        liveFonts.push(ff);
        family = `"PackFont-${role}", ${FONT_STACKS.system}`;
      } catch { family = FONT_STACKS.system; }
    }
    st.setProperty(`--font-${role}`, family);
  }

  const imgMap = {};
  for (const [slot, v] of Object.entries(theme.images || {})) {
    const file = typeof v === 'string' ? v : v?.file;
    const u = url(file);
    if (!u) continue;
    imgMap[slot] = u;
    const k = kebab(slot);
    st.setProperty(`--img-${k}`, `url("${u}")`);
    root.setAttribute(`data-has-${k}`, '');
    const def = STATIC_SLOTS.find((s) => s.key === slot);
    if (def?.nine) {
      const sl = (typeof v === 'object' && v?.slice) || def.slice;
      const [t, r, b, l] = Array.isArray(sl) ? sl : [sl, sl, sl, sl];
      st.setProperty(`--slice-${k}`, `${t} ${r} ${b} ${l}`);
      // Rendered border width: scale the source slice to something sensible on screen.
      const px = (n) => `${Math.max(6, Math.min(28, Math.round(n * 0.5)))}px`;
      st.setProperty(`--slice-${k}-w`, `${px(t)} ${px(r)} ${px(b)} ${px(l)}`);
    }
  }
  const art = {};
  for (const [id, f] of Object.entries(theme.art || {})) { const u = url(f); if (u) art[id] = u; }
  return { images: imgMap, art, motion: theme.motion, style: theme.style };
}

export function presetRecord(preset) { return { id: preset.id, kind: 'visual', builtin: true, theme: normalizeTheme(preset, preset), files: {} }; }
