// Renders the demo art pack and the apple-touch icon using the app's own
// placeholder generator in headless Chromium.
// usage: (serve the repo root on :8080) node studio/tools/build-demo-assets.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('http://localhost:8080/studio/tools/blank.html');
const out = await p.evaluate(async () => {
  const { buildSpriteCookBrief, placeholderPack } = await import('../js/forge.js');
  const { validateContentPack } = await import('../js/engine.js');
  const { PRESETS } = await import('../js/theme.js');
  const pack = validateContentPack(await (await fetch('../packs/rook-courtship.json')).json()).pack;
  const colors = PRESETS.find((x) => x.id === 'preset:moth-lantern').colors;
  const brief = buildSpriteCookBrief({ name: 'Lantern Demo', theme: 'lamplit night garden', style: 'soft painted', pixel: false, tier: 'complete', colors }, pack);
  brief.themeJson.id = 'visual-lantern-demo';
  brief.themeJson.description = 'Placeholder art that shows how a visual pack re-skins every part of the app.';
  const zip = await placeholderPack(brief.themeJson, brief.jobs);
  const toB64 = async (blob) => { const u8 = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); };
  // apple touch icon: opaque 180x180 from the 512 icon
  const img = new Image(); img.src = '../icons/icon-512.png'; await img.decode();
  const c = document.createElement('canvas'); c.width = c.height = 180; const x = c.getContext('2d');
  x.fillStyle = '#0b1016'; x.fillRect(0, 0, 180, 180); x.drawImage(img, 0, 0, 180, 180);
  const icon = await new Promise((r) => c.toBlob(r, 'image/png'));
  return { zip: await toB64(zip), icon: await toB64(icon) };
});
fs.writeFileSync('studio/packs/demo-art-pack.zip', Buffer.from(out.zip, 'base64'));
fs.writeFileSync('studio/icons/apple-touch-icon.png', Buffer.from(out.icon, 'base64'));
console.log('demo zip', fs.statSync('studio/packs/demo-art-pack.zip').size, 'bytes');
await b.close();
