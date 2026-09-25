// Creation tools: SpriteCook briefs for visual packs, Claude prompts for
// story (content) packs, and a canvas placeholder-art generator.
import { allSlots, STATIC_SLOTS, normalizeTheme, kebabSlot } from './theme.js';
import { writeZip } from './zip.js';

// ================================================================ SpriteCook

const TIER_ORDER = { essential: 0, complete: 1, deluxe: 2 };
export const slotFile = (key) => `${kebabSlot(key)}.png`;

/**
 * Build the SpriteCook job list. Parameters mirror SpriteCook's
 * generate_game_art tool so the brief works in the web app and over MCP.
 */
export function buildSpriteCookBrief({ name, theme, style, pixel, tier, colors, refName }, contentPack) {
  const slots = allSlots(contentPack).filter((s) => TIER_ORDER[s.tier] <= TIER_ORDER[tier]);
  const palette = Object.values(colors).filter((v, i, a) => a.indexOf(v) === i).slice(0, 12);
  const styleText = [style, pixel ? 'clean pixel art, limited palette, crisp readable silhouettes' : 'polished detailed 2D game art, soft shading'].filter(Boolean).join('; ');
  const themeText = theme || 'a cosy, mysterious courtship field journal';
  const jobs = slots.map((s) => {
    const nine = !!s.nine;
    const params = {
      prompt: `${s.prompt}. ${themeText}.`,
      mode: s.mode,
      pixel,
      bg_mode: s.bg,
      aspect_ratio: s.aspect,
      width: pixel ? s.w : Math.max(s.w, 256),
      height: pixel ? s.h : Math.round(Math.max(s.w, 256) * (s.h / s.w)),
      smart_crop: !(s.key === 'background' || s.key === 'stage' || nine),
      theme: themeText,
      style: styleText,
      colors: palette,
      resolution: s.resolution || (pixel ? '1K' : s.key === 'background' ? '2K' : '1K'),
    };
    // SpriteCook caps width/height at 512.
    params.width = Math.min(512, params.width); params.height = Math.min(512, params.height);
    return { slot: s.key, file: slotFile(s.key), label: s.label, tier: s.tier, nine, slice: s.slice || null, glyph: s.glyph || null, params };
  });

  const images = {};
  const art = {};
  for (const j of jobs) {
    if (j.slot.startsWith('offering-')) art[j.slot.slice(9)] = j.file;
    else images[j.slot] = j.nine ? { file: j.file, slice: j.slice } : j.file;
  }
  const themeJson = normalizeTheme({
    name: name || 'My SpriteCook look', description: themeText, style: pixel ? 'pixel' : 'hd', colors,
    radius: pixel ? 4 : 18, font: pixel ? { display: 'mono', body: 'mono' } : { display: 'serif', body: 'system' },
    motion: { particles: 'sprite', density: 1 }, images, art,
    spritecook: { theme: themeText, style: styleText, reference: refName || null, palette },
  });
  themeJson.id = `visual-${(name || 'spritecook').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const lock = [
    `Theme: ${themeText}`,
    `Style: ${styleText}`,
    `Rendering: ${pixel ? 'Pixel art (pixel: true)' : 'Detailed / HD (pixel: false)'}`,
    `Palette: ${palette.join(' ')}`,
    refName ? `Style reference image: ${refName}. Upload it once and add it as a style reference for every asset.` : 'Style reference: (none added; consider adding one for consistency)',
    'Keep the SAME theme, style, palette and reference for every asset so the set matches.',
  ].join('\n');

  const agentPrompt = `Use the SpriteCook MCP tools to make a matching visual pack for my Codex Studio game.

1. ${refName ? `Upload my reference image "${refName}" (spritecook-upload-assets) and use its asset id as style_asset_ids for every generation below.` : 'No reference image; keep every generation consistent by reusing the first finished asset (the panel) as style_asset_ids.'}
2. For each job in spritecook-jobs.json, call generate_game_art with exactly the given params (plus style_asset_ids). Poll until finished, download sprite_url and save it as the job's "file" name in one folder. Do not rename files.
3. The frame, button, pressed-button and answer-tile jobs are 9-slice UI pieces: keep straight, uniform edges and plain centres. If you prefer the UI-kit workflow, create_ui_kit for "mobile card game: card frame, wide button (normal and pressed), answer tile", then save those components as panel.png, button.png, button-active.png and choice.png. Put any 9-slice borders from the manifest into theme.json under images.<slot>.slice as [top, right, bottom, left].
4. Put theme.json from the brief into the same folder, zip the folder (theme.json at the top level) and give me the zip.
5. I'll import it in Codex Studio under Studio → Packs → Import.

Style lock:
${lock}

Jobs (${jobs.length}):
${jobs.map((j) => `- ${j.file}: ${j.params.prompt} [${j.params.mode}, ${j.params.width}x${j.params.height}, ${j.params.aspect_ratio}, bg ${j.params.bg_mode}]`).join('\n')}`;

  const md = `# SpriteCook brief: ${themeJson.name}

This folder is a Codex Studio visual pack waiting for its art.

## How to use it

1. Open SpriteCook (https://www.spritecook.ai). Set the **theme**, **style** and **palette** from the style lock below${refName ? `, and upload \`${refName}\` as your style reference` : ''}.
2. Generate each asset below with the listed settings. Download each one and **save it into this folder with the exact filename shown**.
3. 9-slice pieces (frame, buttons, answer tile) need straight, even edges and a plain centre so they stretch cleanly.
4. Zip this folder (theme.json at the top) and import it in **Codex Studio → Studio → Packs → Import**.
   Missing images are fine: the look falls back to its colours for any slot without art.

If you use Claude with the SpriteCook MCP connected, paste \`AGENT_PROMPT.txt\` into Claude and it will generate and save everything.

## Style lock

\`\`\`
${lock}
\`\`\`

## Assets (${jobs.length})

| File | What | Size | Aspect | Mode | Background |
|---|---|---|---|---|---|
${jobs.map((j) => `| \`${j.file}\` | ${j.label} | ${j.params.width}×${j.params.height} | ${j.params.aspect_ratio} | ${j.params.mode} | ${j.params.bg_mode} |`).join('\n')}

## Prompts

${jobs.map((j) => `### ${j.file}\n${j.params.prompt}\n`).join('\n')}
`;
  return { jobs, themeJson, lock, agentPrompt, md };
}

export async function briefZip(brief, refFile) {
  const files = [
    { name: 'theme.json', data: JSON.stringify(brief.themeJson, null, 2) },
    { name: 'spritecook-jobs.json', data: JSON.stringify({ tool: 'generate_game_art', jobs: brief.jobs.map(({ file, slot, label, params }) => ({ file, slot, label, params })) }, null, 2) },
    { name: 'SPRITECOOK_BRIEF.md', data: brief.md },
    { name: 'AGENT_PROMPT.txt', data: brief.agentPrompt },
  ];
  if (refFile) files.push({ name: `reference/${refFile.name.replace(/[^\w.-]+/g, '_')}`, data: refFile });
  return writeZip(files);
}

// ================================================================ placeholder art

/**
 * Draw simple matching art for every slot from the palette, so a brief (or a
 * demo) can be previewed in the app before any real art exists.
 */
export async function placeholderPack(themeJson, jobs) {
  const c = themeJson.colors;
  const files = [];
  const canvas = document.createElement('canvas');
  const x = canvas.getContext('2d');
  const toBlob = () => new Promise((r) => canvas.toBlob(r, 'image/png'));
  const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
  const star = (cx, cy, R, r, n = 4) => { x.beginPath(); for (let i = 0; i < n * 2; i++) { const a = (i * Math.PI) / n - Math.PI / 2; const rad = i % 2 ? r : R; x.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); } x.closePath(); };
  const glyphFor = (slot) => ({ navPlay: '🎁', navCodex: '📖', navLore: '📜', navSpecial: '🗂️', navStudio: '🖌️', rareBadge: '✦', loreSeal: '✺', loreLock: '🔒', crest: '✦' }[slot]);

  for (const j of jobs) {
    const w = j.nine ? 128 : Math.min(512, j.params.width), h = j.nine ? 128 : Math.min(512, j.params.height);
    canvas.width = j.slot === 'background' ? 540 : w; canvas.height = j.slot === 'background' ? 960 : h;
    const W = canvas.width, H = canvas.height;
    x.clearRect(0, 0, W, H);
    x.save();
    if (j.slot === 'background') {
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c.bg2); g.addColorStop(0.55, c.bg); g.addColorStop(1, c.bg);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) { x.globalAlpha = Math.random() * 0.6; x.fillStyle = i % 3 ? c.text : c.accent; x.beginPath(); x.arc(Math.random() * W, Math.random() * H * 0.7, Math.random() * 1.8, 0, Math.PI * 2); x.fill(); }
      x.globalAlpha = 0.35; x.fillStyle = c.accent2; x.beginPath(); x.ellipse(W * 0.5, H * 1.05, W * 0.9, H * 0.28, 0, 0, Math.PI * 2); x.fill();
    } else if (j.nine) {
      const pad = 6, r = j.slot === 'panel' ? 26 : 22;
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, c.surface); g.addColorStop(1, c.surface2);
      x.globalAlpha = j.slot === 'panel' ? 0.94 : 1; rr(pad, pad, W - pad * 2, H - pad * 2, r); x.fillStyle = g; x.fill(); x.globalAlpha = 1;
      x.lineWidth = 3; x.strokeStyle = j.slot === 'buttonActive' ? c.accent : c.border; x.stroke();
      rr(pad + 5, pad + 5, W - (pad + 5) * 2, H - (pad + 5) * 2, r - 5); x.lineWidth = 1; x.strokeStyle = j.slot === 'buttonActive' ? c.accent2 : c.accent; x.globalAlpha = 0.6; x.stroke(); x.globalAlpha = 1;
      if (j.slot === 'panel') for (const [cx, cy] of [[pad + 4, pad + 4], [W - pad - 4, pad + 4], [pad + 4, H - pad - 4], [W - pad - 4, H - pad - 4]]) { star(cx, cy, 9, 3); x.fillStyle = c.rare; x.fill(); }
      j.slice = j.slot === 'panel' ? 30 : 26;
    } else if (j.slot === 'stage') {
      const g = x.createRadialGradient(W / 2, H * 0.4, 4, W / 2, H * 0.4, W * 0.6); g.addColorStop(0, c.accent); g.addColorStop(0.18, c.surface); g.addColorStop(1, c.surface2);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = c.bg; x.globalAlpha = 0.55; x.beginPath(); x.ellipse(W / 2, H * 0.86, W * 0.3, H * 0.08, 0, 0, Math.PI * 2); x.fill();
    } else if (j.slot === 'particle') {
      const g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, c.accent); g.addColorStop(1, 'transparent');
      x.fillStyle = g; x.fillRect(0, 0, W, H); star(W / 2, H / 2, W / 2, W / 10); x.fillStyle = '#ffffffcc'; x.fill();
    } else {
      // icons, portraits, offering art: medallion + emoji / initial
      const R = Math.min(W, H) / 2 - 3;
      const g = x.createRadialGradient(W * 0.4, H * 0.35, 2, W / 2, H / 2, R); g.addColorStop(0, j.slot.startsWith('offering-') ? c.surface : c.accent); g.addColorStop(1, j.slot.startsWith('offering-') ? c.surface2 : c.bg2);
      x.beginPath(); x.arc(W / 2, H / 2, R, 0, Math.PI * 2); x.fillStyle = g; x.fill();
      x.lineWidth = Math.max(2, R * 0.08); x.strokeStyle = j.slot === 'rareBadge' || j.slot === 'loreSeal' ? c.rare : c.accent2; x.stroke();
      const glyph = glyphFor(j.slot) || j.glyph || (j.label.split(':').pop().trim()[0] || '?').toUpperCase();
      x.fillStyle = c.text; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `${Math.round(R * 1.05)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      x.fillText(glyph, W / 2, H / 2 + R * 0.05);
    }
    x.restore();
    files.push({ name: j.file, data: await toBlob() });
  }
  const theme = JSON.parse(JSON.stringify(themeJson));
  for (const j of jobs) if (j.nine && theme.images[j.slot]) theme.images[j.slot].slice = j.slice;
  theme.name = `${theme.name} (placeholder art)`;
  theme.id = `${theme.id}-placeholder`;
  return writeZip([{ name: 'theme.json', data: JSON.stringify(theme, null, 2) }, ...files]);
}

// ================================================================ Lore Forge

const str = { type: 'string' };
const strArr = { type: 'array', items: str };
const obj = (properties) => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });
const offeringSchema = obj({ id: str, name: str, glyph: str, intent: str, collection: str, desc: str, why: str, line: str, codex: str });

/** JSON schema for structured outputs (no numeric/length constraints; the validator enforces those). */
export const CONTENT_SCHEMA = obj({
  format: { type: 'string', enum: ['codex-content-pack'] },
  version: { type: 'integer' },
  id: str, title: str, eyebrow: str, subtitle: str,
  giver: obj({ name: str, description: str }),
  recipient: obj({ name: str }),
  labels: obj({ daily: str, question: str, unread: str, correctBadge: str, wrongBadge: str, correctVerdict: str, wrongVerdict: str, codexTitle: str, loreTitle: str, loreIntro: str, lockedLore: str }),
  intents: { type: 'array', items: obj({ id: str, label: str, blurb: str, why: str, lines: strArr }) },
  collections: { type: 'array', items: obj({ name: str, blurb: str, intentWeights: strArr, objects: { type: 'array', items: obj({ name: str, glyph: str }) }, places: strArr, touches: strArr, lines: obj({ intent: str, lines: strArr }) }) },
  offerings: { type: 'array', items: offeringSchema },
  rare: { type: 'array', items: offeringSchema },
  companions: { type: 'array', items: obj({ name: str, blurb: str, offerings: { type: 'array', items: offeringSchema } }) },
  lore: { type: 'array', items: obj({ id: str, title: str, hint: str, body: str, requires: obj({ type: { type: 'string', enum: ['ids', 'companions', 'intentCount', 'collectionCount', 'rareCount'] }, ids: strArr, intent: str, collection: str, count: { type: 'integer' } }) }) },
  special: obj({ intent: str, tab: str, title: str, intro: str, stamp: str, empty: str }),
});

const SIZES = {
  small: { offerings: 12, rare: 3, collections: 3, lore: 5, perCompanion: 2 },
  standard: { offerings: 24, rare: 6, collections: 5, lore: 8, perCompanion: 3 },
  large: { offerings: 36, rare: 10, collections: 6, lore: 12, perCompanion: 4 },
};

export const FORGE_SYSTEM = `You write content packs for Codex Studio, a small mobile guessing game. Each day a character leaves the player a small physical "offering", and the player guesses what it meant. Correct guesses fill a Codex, and certain combinations unlock secret lore.

Write with specificity and warmth. Offerings are tangible, sensory objects that are placed somewhere on purpose. Each one should feel chosen for this particular recipient, in the giver's own voice. Let humour come from character, not from randomness. Keep everything tasteful: flirtation can be suggestive but never explicit.`;

/** Build the user prompt for a content pack from the Lore Forge form. */
export function buildForgePrompt(f) {
  const size = SIZES[f.size] || SIZES.standard;
  const intents = f.intents.filter(Boolean);
  return `Create a complete Codex Studio content pack as a single JSON object.

## The story
- Giver (leaves the offerings, and speaks every "line"): ${f.giver || 'invent a memorable, slightly mysterious courting creature or person'}
- Recipient (the player, addressed as "you"): ${f.recipient || 'the player'}
- World, setting and relationship: ${f.world || 'invent one that suits the giver'}
- Tone: ${f.tone || 'cosy, witty, affectionate, a little mysterious'}
- Intents, the possible meanings the player chooses between: ${intents.length ? intents.map((i) => `"${i}"`).join(', ') : 'invent exactly 4 distinct, characterful meanings (e.g. affection, flirtation, "I saw this and thought of you", and one comic or mysterious option)'}
- Side characters who also bring offerings: ${f.companions || 'none; use an empty companions array'}
- Special file tab: ${f.special ? 'yes: choose the most characterful intent and give it its own themed tab (tab label of 12 characters or fewer, like "Classified")' : 'no: set special.intent to ""'}
${f.notes ? `- Also: ${f.notes}\n` : ''}${f.hasImage ? '- The attached image is the visual reference for this world. Take objects, materials, colours and mood from it.\n' : ''}
## Sizes
- ${size.collections} collections. Each has 5-6 procedural objects (a short lowercase noun phrase plus a single-emoji glyph), exactly 5 places ("on the windowsill"), exactly 5 touches ("still warm from someone's hand"), and intentWeights: exactly 3 intent ids, where repeats mean "more likely".
- ${size.offerings} handcrafted offerings, spread evenly across collections and intents.
- ${size.rare} rare offerings: more precious, more emotionally revealing.
- ${size.perCompanion} offerings per side character (companion), each reflecting that character's own idea of romance.
- ${size.lore} lore entries.

## Field rules
- Every "id" is unique kebab-case ascii (e.g. "brass-key"). Pack id is a kebab-case title.
- Every offering's "intent" is one of the intent ids; every "collection" is one of the collection names, spelled exactly.
- glyph: exactly one emoji.
- desc: 1-2 sentences in second person describing where and how it was left ("Placed precisely in the middle of your pillow…").
- why: one sentence explaining the true meaning.
- line: what the giver says about it, in their voice, wrapped in curly quotes “…”.
- codex: a short catalogue line, "Object — meaning, with a twist."
- intents[].lines: 3 generic giver lines per intent, used for procedural offerings. intents[].why: a generic one-sentence explanation. intents[].blurb: a short, funny subtitle for the answer button.
- collections[].lines: optionally 2 special lines for one intent in that collection (otherwise intent "" and an empty lines array).
- labels: flavour the UI text to fit the world. daily is the banner kicker, e.g. "Today's courtship offering". question is asked of every offering, e.g. "What did I mean by this?". correctVerdict and wrongVerdict are said by the giver. unread, correctBadge and wrongBadge are short status badges.
- lore.requires.type is one of:
  - "ids": ids lists 3 handcrafted offering ids that belong together thematically; count is 3.
  - "companions": ids lists companion names; only use this if there are companions.
  - "intentCount": intent plus a count of 4-6.
  - "collectionCount": collection plus a count of 4-6.
  - "rareCount": a count of 2-3.
  Unused fields are "" or [] or 0. Mix the types, and make at least half of them "ids" combinations. The hint teases the requirement without spelling it out. The body is 3-5 sentences of genuinely revealing backstory in the giver's voice.
- title, eyebrow (a tiny all-lowercase tagline such as "cryptid field study · pocket edition") and subtitle (one playful sentence).
- format must be "codex-content-pack" and version 1.

Return only the JSON object.`;
}

/** Call Claude from the browser with the user's own key (Anthropic TypeScript SDK via CDN). */
export async function generateWithClaude({ apiKey, model, prompt, image, onProgress }) {
  const { default: Anthropic } = await import('https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128/+esm');
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const content = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  content.push({ type: 'text', text: prompt });
  const params = {
    model,
    max_tokens: 64000,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema: CONTENT_SCHEMA } },
    system: FORGE_SYSTEM,
    messages: [{ role: 'user', content }],
  };
  if (model === 'claude-opus-5') { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }
  const stream = client.beta.messages.stream(params);
  let chars = 0;
  stream.on('text', (delta) => { chars += delta.length; onProgress?.(chars); });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('Claude declined to write this pack. Try adjusting the tone or notes.');
  if (msg.stop_reason === 'max_tokens') throw new Error('The pack was too long and got cut off. Try the Small or Standard size.');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  if (!text.trim()) throw new Error('Claude returned no text. Please try again.');
  return text;
}

export function describeApiError(e) {
  const status = e?.status;
  if (status === 401) return 'That API key was rejected. Check it at console.anthropic.com.';
  if (status === 403) return 'This key does not have access to that model.';
  if (status === 404) return 'That model is not available to this key. Try the other model.';
  if (status === 429) return 'Rate limited. Wait a minute and try again.';
  if (status === 529 || status >= 500) return 'Anthropic is busy right now. Try again shortly.';
  if (e?.name === 'TypeError' || /fetch|network|import/i.test(e?.message || '')) return 'Could not reach Anthropic. Check your connection. (Generation needs to be online.)';
  return e?.message || String(e);
}

export { STATIC_SLOTS };
