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
- `width` (optional, next to `slice`): how thick that border is drawn on screen, in CSS pixels. Use it when art has large ornamental ends, like a pill button with an icon baked into its left end: `{ "file": "pill.png", "slice": [20, 70, 20, 100], "width": [13, 46, 13, 66] }`.
- `layout` (optional):
  - `"header": "centered"` centres the title and hides the crest. It works well with a `canopy`.
  - `"stage": "ring"` shows the offering inside a thin glowing ring instead of a box.
  - `"choiceBlurbs": false` shows only the answer labels, one per row.
  - `"backgroundFit": "tile"` fits the background to the page width and repeats it downwards, instead of cropping it to cover the screen.
  - `"swagAt"` (0–1, default `0.43`): how far down the `side-drop` image the `side-swag` hangs from. Point it at the top of whatever the swag should hang from, such as a gem.
  - `"swagLift"` (0–1, default `0.15`): how far down the `side-swag` image its strands start. The swag is raised by this much, so the strands meet the `swagAt` point.
- Text colours are automatically nudged, if needed, so they stay readable against the card colour.
- `loreArt` (optional): `{ "<lore id>": "lore/three-black-feathers.webp" }`. It gives each secret its own picture, which shows on the unlock sheet and beside the entry in the Lore list. Secrets without one use the `lore-seal` image.
- `sounds` (optional), for example `{ "appear": "sounds/offering-appear.mp3", "reveal": "sounds/answer-reveal.mp3" }`.
  - `appear` plays when an offering appears, `reveal` when its meaning is revealed, and `unlock` when secret lore unlocks.
  - `tap` plays on the navigation tabs and `toggle` on switches and menus. Players can turn these two off with "Tap sounds" and keep the rest.
  - Any sound a look leaves out falls back to a soft built-in tone.
  - Use MP3 or M4A, which play everywhere including iPhones, and keep each sound short.
  - Without `theme.json`, files named like `offering-appear.mp3` and `answer-reveal.mp3` are picked up automatically.
  - Sounds play only when the player turns Sound on in Settings.

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
| `canopy` | Decoration hanging from the top of the screen | wide, e.g. 945×304 | |
| `pendant-left`, `pendant-right` | Swaying ornaments at the top corners | tall, e.g. 100×400 | |
| `divider` | Flourish under the title and the offering name | wide and thin | |
| `header-charm` | Small charm hanging beside the title, e.g. from the canopy | tall, e.g. 96×192 | |
| `new-button` | The "new offering" button (otherwise `nav-play` is used) | 128×128 | |
| `card-garland` | Garland along the top edge of the offering card | wide, e.g. 640×163 | |
| `side-drop` | Tall chain hanging beside the offering card, mirrored on the right | very tall, e.g. 65×858 | |
| `side-swag` | Swag draped from the side chain to the card edge, mirrored on the right. It attaches at its top-left and top-right. | wide, e.g. 248×150 | |
| `stats-panel` | Frame around the stats row | 16:9 | ✓ |
| `choice-<intent id>` | Answer button art for one specific answer | wide pill | ✓ |
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

### SpriteCook UI-kit exports

A SpriteCook UI-kit export can be zipped and imported as it is. Its components are listed by `name` in its manifest, and each PNG is `<name>.png`. Names are matched to slots:
- `*_icon_button` pieces become navigation icons (star → Play, book → Codex, list → Lore, lock → the special tab, gear → Studio);
- `pill_button_normal_1…n` become the answer buttons, in order;
- `large_frame_empty` becomes the card frame and `wide_frame_empty` the stats frame;
- `chain_banner_decoration` becomes the canopy, and `teardrop_pendant_1`/`_2` the pendants;
- `long_divider_1` becomes the divider;
- hover, disabled and other alternative states are left unused.

SpriteCook exports list every 9-slice border as zero, so set real borders in `theme.json` for frames that stretch. The built-in **Tideglass** look (`packs/tideglass/theme.json`) is a complete worked example.

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
