# Codex Studio pack format

Codex Studio has two kinds of pack. Mix and match them freely.

- A **visual pack** (a "look") is a `.zip` of images, with an optional `theme.json`. It changes how everything looks.
- A **story pack** (content) is a `.json` file. It changes what's in the game: characters, offerings, meanings and lore.

A single `.zip` can hold both: `theme.json`, the images, and a story `.json` (for example `story.json`). Importing it installs both.

Everything stays on the device, in the browser's IndexedDB. Nothing is uploaded.

---

## Visual packs

```
my-look.zip
├── theme.json          (optional, but recommended)
├── background.png
├── panel.png
├── button.png
├── …
└── fonts/display.woff2 (optional)
```

### Without a theme.json

Images are matched to slots by **filename**, ignoring case, spaces, `_` and `-`. For example `UI_Panel_Frame.png` becomes `panel`, and `btn_pressed.png` becomes `buttonActive`. When you import, a review screen lets you fix any guess before installing. Colours are worked out from the background (or frame) art.

If the zip contains a **SpriteCook UI-kit manifest** (or any JSON listing components with a name and an image file), component names are matched the same way. Any 9-slice borders in it (`top/right/bottom/left`) are used too.

### theme.json

```json
{
  "format": "codex-visual-pack",
  "version": 1,
  "id": "visual-harbour-night",
  "name": "Harbour Night",
  "author": "you",
  "description": "Brass lanterns on black water.",
  "style": "hd",
  "radius": 18,
  "colors": {
    "bg": "#0b1016", "bg2": "#12303a", "surface": "#15202a", "surface2": "#0f171f",
    "border": "#243541", "text": "#edf4f2", "muted": "#9fb1b0",
    "accent": "#7fcfbd", "accent2": "#d7b7c7", "rare": "#d8c08a", "danger": "#e5c8d4"
  },
  "font": { "display": "serif", "body": "system" },
  "fonts": { "display": "fonts/display.woff2", "body": null },
  "motion": { "particles": "sprite", "density": 1 },
  "images": {
    "background": "background.png",
    "panel": { "file": "panel.png", "slice": 32 },
    "button": { "file": "button.png", "slice": [20, 24, 20, 24] }
  },
  "art": { "three-pistachios": "offering-three-pistachios.png" }
}
```

- `style`: `"hd"` or `"pixel"`. Pixel style renders images crisp, without smoothing.
- `font.*`: `system`, `serif`, `rounded`, `mono`, or `pack` (uses the file named in `fonts.*`).
- `motion.particles`: `motes`, `sparkles`, `petals`, `bubbles`, `embers`, `snow`, `sprite` (uses the `particle` image), or `none`.
- `slice`: the 9-slice border, in source pixels. Give one number, or `[top, right, bottom, left]`.
- Text colours are automatically nudged, if needed, so they stay readable against the card colour.

### Image slots

| Slot (filename) | What it is | Suggested size | 9-slice |
|---|---|---|---|
| `background` | Full-screen backdrop | 9:16, e.g. 1080×1920 | |
| `panel` | Frame for every card | 256×256 | ✓ |
| `button` | Buttons | 256×144 | ✓ |
| `button-active` | Pressed / primary button | 256×144 | ✓ |
| `choice` | Answer tiles | 256×144 | ✓ |
| `stage` | Backdrop behind the offering | 16:9 | |
| `crest` | Logo next to the title | 192×192 | |
| `particle` | Floating ambient sprite | 32×32 | |
| `rare-badge` | Rare-find star | 64×64 | |
| `lore-seal`, `lore-lock` | Lore unlocked / locked icons | 96×96 | |
| `nav-play`, `nav-codex`, `nav-lore`, `nav-special`, `nav-studio` | Bottom navigation icons | 64×64 | |
| `intent-<intent id>` | Icon on each answer button | 64×64 | |
| `collection-<collection name>` | Collection badge | 96×96 | |
| `companion-<name>` | Side-character portrait | 128×128 | |
| `offering-<offering id>` | Art replacing an offering's emoji | 128×128+ | |

Any slot without an image falls back to the look's colours, so partial packs work.

Transparent PNG or WebP is best. JPEG, GIF, AVIF and SVG also work. Zips can be up to 80 MB unpacked and 600 files.

### Making one with SpriteCook

In **Studio → SpriteCook**, describe your theme and style and add a reference image. The app gives you:

- `SPRITECOOK_BRIEF.md`: what to generate, one prompt per file, with SpriteCook settings (`mode`, `width`/`height`, `aspect_ratio`, `bg_mode`, palette).
- `spritecook-jobs.json`: the same jobs as `generate_game_art` parameters, for the SpriteCook MCP server.
- `AGENT_PROMPT.txt`: paste this into Claude with SpriteCook connected to generate everything automatically.
- `theme.json`: already maps every expected filename.

Save the generated images into that folder with the listed filenames, zip it, and import it.

---

## Story packs

A story pack is one JSON object. `packs/rook-courtship.json` and `packs/moth-lantern.json` are complete examples. The **Lore Forge** in Studio can write one for you with Claude.

```jsonc
{
  "format": "codex-content-pack",
  "version": 1,
  "id": "harbour-lights",                  // kebab-case; the key for saved progress
  "title": "Harbour Lights",
  "eyebrow": "tideline correspondence",
  "subtitle": "One sentence of flavour.",
  "giver": { "name": "Wren", "description": "…" },
  "recipient": { "name": "Jo" },
  "labels": { "daily": "Tonight's offering", "question": "What did I mean by this?", "unread": "…",
              "correctBadge": "…", "wrongBadge": "…", "correctVerdict": "…", "wrongVerdict": "…",
              "codexTitle": "…", "loreTitle": "…", "loreIntro": "…", "lockedLore": "…" },
  "intents": [                               // 2–6 possible meanings (the answer buttons)
    { "id": "affection", "label": "Affection", "blurb": "Button subtitle",
      "why": "Generic explanation", "lines": ["“Generic line in the giver's voice”"] }
  ],
  "collections": [
    { "name": "Tide Line", "blurb": "…",
      "intentWeights": ["affection", "affection", "thought"],   // repeats = more likely
      "objects": [{ "name": "sea-glass sliver", "glyph": "🔹" }],   // procedural bank
      "places": ["on the windowsill"], "touches": ["still cold from the sea"],
      "lines": { "intent": "affection", "lines": ["“Special line for this collection”"] } }
  ],
  "offerings": [
    { "id": "brass-key", "name": "Small brass key", "glyph": "🗝️", "intent": "affection",
      "collection": "Tide Line", "desc": "Where and how it was left…", "why": "The real meaning.",
      "line": "“What the giver says.”", "codex": "Catalogue line." }
  ],
  "rare": [ /* same shape as offerings; 1 in 100 chance */ ],
  "companions": [ { "name": "Brine", "blurb": "…", "offerings": [ /* offerings */ ] } ],
  "lore": [
    { "id": "…", "title": "…", "hint": "…", "body": "…",
      "requires": { "type": "ids", "ids": ["brass-key", "…"], "intent": "", "collection": "", "count": 3 } }
  ],
  "special": { "intent": "dontask", "tab": "Classified", "title": "…", "intro": "…",
               "stamp": "…", "empty": "…" }   // optional extra tab for one intent
}
```

`requires.type` is one of:

| Type | Unlocks when |
|---|---|
| `ids` | every listed offering id has been found |
| `companions` | an offering from every listed companion has been found |
| `intentCount` | `count` finds with that `intent` |
| `collectionCount` | `count` finds in that `collection` |
| `rareCount` | `count` rare finds |

On import the pack is checked. You get readable errors, such as an unknown intent, a duplicate id, or lore pointing at an offering that doesn't exist. Nothing half-broken gets installed.
