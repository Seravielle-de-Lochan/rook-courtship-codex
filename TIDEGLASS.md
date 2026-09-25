# Tideglass integration

Integrated locally on branch `tideglass-ui`, based on upstream commit `fa401ff`.
This checkout has not been pushed or published.

## Export inspection

The original export is in `Downloads/ChatGPT-Image-Sep-17-2026-11_23_57-PM-web`.
It contains 82 pre-sliced, transparent PNGs, a 2048 × 4410 packed atlas,
`ui-kit.json`, `manifest.json`, a Phaser loader example, and the approved concept image.
The original export is unchanged.

The existing app is plain HTML, CSS and JavaScript. It does not use Phaser,
so it can use the pre-sliced PNGs directly without a new framework or build step.
`ui-kit.json` contains packed atlas coordinates; the source manifest refers to
the original sheet. They should not be used interchangeably for slicing.
All supplied nine-slice insets are zero. The CSS defines visually checked
insets for the frames and buttons instead of treating those zeros as usable guides.

18 original PNGs are included in `assets/tideglass/` plus one generated environmental backdrop.
They are byte-for-byte copies. The source manifest is preserved as
`assets/tideglass/source-manifest.json` for reference; it is not a runtime dependency.

| Asset | Use |
| --- | --- |
| `chain_banner_decoration` | Header chain canopy |
| `teardrop_pendant_1`, `teardrop_pendant_2` | Independently swaying side pendants |
| `large_frame_empty` | Offering and section frames, expanding with content |
| `large_frame_active` | Offering display with sea-glass light |
| `wide_frame_empty` | Statistics frame |
| `long_divider_1` | Divider above the interpretation question |
| `pill_button_normal_1` through `_4` | Four answer buttons, retaining live text |
| `star_icon_button`, `book_icon_button`, `list_icon_button`, `lock_icon_button`, `gear_icon_button` | Existing five navigation actions |
| `flower_ornament` | Pressed moon-bloom, including its daily variant |

## Files and behavior

- `tideglass.css`: visual layer, responsive frames and controls, gentle chain
  and pendant motion, rare glints, keyboard focus and reduced-motion support.
- `index.html`: decorative images, navigation images and stylesheet link.
- `app.js`: matching moon-bloom artwork, accessible current-section indication and a derived accuracy percentage.
  Offering generation, chances, answers, lore, settings and save logic are unchanged.
- `sw.js`: version 4 cache includes all used artwork. Installation completes
  before activation; cleanup only removes this app's older caches. Offline
  page fallback no longer returns HTML for missing images or scripts.
- `styles.css`, both data files, the PWA manifest and app icons are unchanged.

Decorative images are hidden from assistive technology, do not intercept taps,
and are never used as a replacement for button text. Other offerings retain their
original glyphs until matching item illustrations exist. The supplied concept is
an art reference, not a screenshot used as the app interface.

The same `rookCodexState` local-storage key and existing record format are used.
The app has no runtime network, analytics or account dependency. Cormorant Garamond is bundled locally with its SIL Open Font License.

## Validation

Browser checks used isolated Edge profiles and a local server under a repository
subpath, never the live site's storage. Passed checks cover:

- Answer/reveal, disabled answers, statistics, reload persistence and daily revisit.
- Existing saved progress and cached daily offerings.
- Handcrafted and procedural modes, settings, bird offerings and rare counts.
- All five tabs, collection filtering, classified entries and all eight lore unlocks.
- Reset cancellation, visible keyboard focus and reduced-motion behavior.
- Layout without horizontal page overflow at 320, 360, 390, 768 and 1280 pixels.
- Offline reload, artwork and answering after the initial cache finishes.
- A real upgrade from the original v2 service worker to v5, retaining progress
  and a separate app's cache, followed by offline reload.
- JavaScript syntax checks and `git diff --check`.

Phone and desktop screenshots were visually inspected. Android installation
and a physical phone have not been tested in this workspace.

## Preview and release

Serve this folder with a local HTTP server to preview it; opening `index.html`
directly from the filesystem does not test PWA behavior. The running workspace
preview uses `http://127.0.0.1:8765/rook-courtship-codex/`.

For a release, review this branch and publish the complete folder, including
`assets/tideglass/` and `tideglass.css`, through the existing GitHub Pages process.
The service worker must finish downloading the new files before they are available
offline. An already-open page may need a refresh to display the new styling.

Keep the same production origin and path to retain existing device progress.
Local preview progress is separate from production progress.

## Reference-matching revision — 18 September 2026

The attached phone mockup guides the composition, without embedding a phone bezel or screenshot. The revision adds a continuous watery backdrop, side chain ornaments, locally bundled Cormorant Garamond, a single offering frame, larger item artwork, slim label-only answer buttons, and three main statistics. Additional exact counts remain beneath those statistics. The percentage is calculated from saved correct/seen counts, with 0% before the first answer.

The repeated side ornaments reuse the supplied hanging-charm PNG through CSS. The water and foliage backdrop was generated using the built-in image-generation tool and saved at `assets/tideglass/water-garden.png`. It is an interpretation of the reference background, not a pixel-identical extraction. Other offerings still use their original glyphs where matching illustrations are not available.

Generation prompt (reference: the user-supplied mockup):

> Create a production background asset for the functional website shown in this reference. Extract/recreate ONLY its atmospheric dark watery scene, filling the entire image edge to edge, portrait 2:3. Deep nearly-black ink teal water, delicate silver moonlight ripples especially flowing vertically down the right edge and bottom, subtle underwater caustics, sparse tiny glints and dark glossy narrow foliage at the lower left and lower right edges. Center and upper center mostly quiet nearly black teal negative space for overlay live HTML text. Match the reference's restrained realistic enchanted night sea aesthetic very closely. NO phone, NO bezel, NO UI, NO panels, NO borders, NO chains, NO jewelry, NO flower, NO icons, NO words, NO letters. This is an empty environmental background behind separately implemented live app UI. Save the generated asset.

All browser checks passed again after the revision, including actual percentage calculation, narrow viewports and offline upgrade. Screenshots use an isolated sample moon-bloom offering for comparison; the real daily selection and user progress were not replaced.

## Frame-mounted jewels — 18 September 2026

`assets/tideglass/inner-frame-jewel.png` is a new transparent ornament generated
from the supplied reference and the existing SpriteCook frame. Its silver rail
and botanical clasp visibly connect each gem to the inner offering frame. One
asset is mirrored for the left and right sides.

The two inner jewels use different, offset two-second motion cycles with short
direction changes and tiny vertical impacts. The upper pendants and outer side
jewels now use related 2.6–3 second cycles, replacing their former 8–14 second
drift. Reduced-motion mode remains fully static.

The outer left and right ornaments now show clipped halves of the transparent
SpriteCook `hanging_charm_decoration`: connected round medallions, inward chain
swags, star charms and long drops. They replace the earlier repeated vertical
strip and follow separate 2.58 and 2.83 second jangle cycles.

## Clean frame handoff — 18 September 2026

The experimental inner-frame jewels and reconstructed outer chain swags have
been removed from the live layout because their independent layers did not stay
visually attached to the frame across screen sizes. The generated
`assets/tideglass/inner-frame-jewel.png` remains available as source material,
but the app does not render it. The clean frame is ready for one transparent,
pre-composed jewellery overlay whose attachment points can be aligned as a
single layer. The canopy pendants retain their quicker irregular jangle.

## Jewellery placement editor — 18 September 2026

Settings now includes **Arrange jewellery**, an opt-in visual editor over the
real app. Tideglass pieces can be dragged from its tray onto either the whole
page or the offering frame, then moved, resized, rotated, flipped, reordered,
duplicated, hidden, or deleted. Arrow keys nudge a selected piece by 0.2%; Shift
plus an arrow nudges by 1%. Layouts persist separately under
`rookJewelleryLayout`, so arranging ornaments cannot alter game progress. **Copy
layout for Codex** copies the final JSON for turning a local composition into the
shipped default.

## Complete element tray and attachment chains — 21 September 2026

The editor now exposes all 82 pre-sliced SpriteCook PNG components plus the
generated frame jewel and four generated chain options, for 87 selectable
elements in total. A category filter and text search keep the full library
manageable on phones. The chain category contains the original shallow and
star-drop swags as well as two taller deep-U attachments traced from the
highlighted reference: **High-to-frame chain** and **Medallion-to-frame chain**.
All four have real alpha transparency and can be mirrored for the right side.

The two deep-U cutouts were cleaned by SpriteCook background removal after
generation. Their reusable asset IDs and local hashes are recorded in
`spritecook-assets.json`.

## Moving overlapping pieces — 25 September 2026

The editing layers now let pointer events reach only the actual ornaments, so
the page layer cannot block a piece attached to the offering frame. The tray
lists every placed element; selecting one raises it while editing, which makes
it possible to move pieces that overlap. On narrower screens the tray minimises
after an element is added or selected, leaving the offering window clear for
dragging. **Open tray** restores the controls. Positions still save in
`rookJewelleryLayout` and do not affect offering progress.

Two live SVG chain swags on each side make the reference's curved outer loops
legible at phone size. Their small links, attachment rings and star drops remain
connected while each loop uses its own 1.88 or 2.16 second rattle cycle.

The selected inner-jewel generation prompt asked for a single transparent,
mirrorable left-side ornament with a silver rail clasp, articulated short chain,
round luminous aqua sea-glass cabochon, botanical silver setting and weighted
drop, matching the supplied mockup and SpriteCook frame. The generated PNG has
a real alpha channel; the discarded side-garland drafts were not added because
they rendered a checkerboard instead of transparency.

## Concept ornaments — 25 September 2026

Five new SpriteCook pieces bring the classic layout closer to the approved concept
(SpriteCook asset `5d326516-4679-45b0-8262-1d97f8cfadb1`, the phone mockup). Each
was generated with `generate_game_art` (model `gpt-image-2.5-sunburst`, detailed,
transparent background) using the concept as `reference_asset_id` and existing kit
pieces as `style_asset_ids` (`chain_banner_decoration`, `hanging_charm_decoration`,
`round_medallion_1`; the offering art used `flower_ornament`). Asset IDs and local
hashes are recorded in `spritecook-assets.json`. The files were trimmed to their
visible content and scaled to about twice their largest displayed size.

| Asset | Use |
| --- | --- |
| `side_chain_column` | Source image for the long side chains (also in the editor tray) |
| `side_chain_drop`, `side_chain_swag` | Cut from `side_chain_column`: the tall drop hangs in each side margin, and the swag runs from its middle medallion to the frame edge |
| `crescent_moon_ornament` | Hangs from the canopy, left of the title |
| `rook_medallion` | The "new offering" button, top right |
| `frame_star_garland` | Across the top edge of the offering frame |
| `offering_three_pistachios` | Illustration for *Three pistachios* |

The side chains are positioned from the offering frame itself (`tideglass-extras.css`),
not from the page, so they cannot drift away from it at different screen sizes. The
swags tuck just behind the frame edge. On phones the side margin is narrow, so the
swags are short there and the drops sit close to the frame.

Also added:
- **Day counter**: "Day N" in the frame's top-left corner, counting the calendar
  days on which a daily offering has been opened.
- **Offering art map**: `offering-art.js` maps offering ids to artwork;
  offerings without art keep their glyph.

## Offering illustrations — 25 September 2026

Every offering now has an illustration: the 39 added here, plus *Three pistachios* and
*Pressed moon-bloom* from earlier. That covers all handcrafted, rare and bird
offerings. Procedural finds keep their glyph.

- **How they were made**: `generate_game_art` (model `gpt-image-2.5-sunburst`,
  detailed, transparent background), with the approved *Three pistachios* illustration
  (`061fc1f9-2d8c-4b66-9377-e18cf5ba3407`) as the only style reference, so the set
  matches it.
- **Prompts**: the per-offering prompts and the shared suffixes are in
  `assets/tideglass/offering-prompts.json`. Rare finds add a "subtle luminous aura"
  line.
- **Files**: `assets/tideglass/offerings/<offering-id>.webp`, trimmed and scaled to
  400px wide. WebP keeps the whole set at about 3 MB. Asset IDs and hashes are in
  `spritecook-assets.json` under `offerings/<id>`.
- **Wiring**: `offering-art.js` is loaded by both `index.html` and `sw.js`, so the
  service worker precaches every illustration for offline play (cache
  `v12-offering-art`).
- **Codex**: discovered entries show a small thumbnail of their offering.
- **Wide screens**: the offering art is sized to sit inside the moon circle, which
  keeps it clear of the source label beside it.

To replace an illustration, overwrite its `.webp` file, or point its entry in
`offering-art.js` at a new file, then bump the cache name in `sw.js`.

### In Studio

The built-in **Tideglass** look in Studio (`studio/packs/tideglass/theme.json`) uses
the same files through its `art` map, so people can see what an illustrated look
can do.

- **Rook story**: all 41 illustrations.
- **Moth Lantern Society story**: 19 more illustrations in
  `assets/tideglass/offerings/moth-lantern/`. That covers every handcrafted, rare
  and companion offering (Fennick and Old Lune). They use the same settings and
  pistachio style reference as the Rook set, with a lamplighter's-town theme and
  warm lamplight glints; the prompts are in `offering-prompts.json`.
- **Procedural finds** in either story keep their glyph.
- **Caching**: Studio caches each illustration the first time it is shown. Its
  service worker cache is now `codex-studio-v6`.
- **Ornaments**: the Tideglass look also fills Studio's ornament slots with the
  concept pieces: `headerCharm` (crescent), `newButton` (rook medallion),
  `cardGarland` (star garland), and `sideDrop`/`sideSwag`. The side pieces use
  `side_chain_drop_clean.png` and `side_chain_swag_clean.png`, copies of the game's
  chain pieces without the stubs and gem sliver left over from cutting the
  original image.

All new CSS lives in `tideglass-extras.css`; `tideglass.css` is unchanged. The
editor tray lists the new pieces, and the service worker (v11) caches them.
Layout was checked at 320–1280px against the `tideglass-ui` branch: no new
overlaps, and the garland clears the frame labels at every width.

## Sound effects — 25 September 2026

Two sounds from Seravielle live in `assets/tideglass/sounds/`:

- `offering-appear.mp3` ("short warm happy") plays when an offering appears.
- `answer-reveal.mp3` ("single bright sparkle") plays when its meaning is revealed.

**How they play:**
- Both need Sound switched on in Settings, which is off by default.
- Nothing plays on first load: browsers allow audio only after the player has
  tapped something.
- Each file is fetched once and played from memory. iPhone Safari won't play
  audio streamed from a service worker's cache, but a blob URL works online and
  offline.

**Where they're used:**
- **The game:** precached for offline play (cache `v14-sound-effects`).
- **Studio:** looks can now carry `sounds` in `theme.json` (see
  `studio/PACK_FORMAT.md`), and the Tideglass look uses these two. Looks without
  sounds keep the built-in tones. Studio's cache is now `codex-studio-v7`.

### Interface sounds (ElevenLabs)

Three quiet interface sounds were made with ElevenLabs' sound-effects model
(`eleven_text_to_sound_v2`). Three takes of each were generated, then picked by
analysis: one clean hit, short, and no stray clicks.

| File | Plays when | Take |
| --- | --- | --- |
| `ui-tap.wav` | Tabs and codex filters | A tiny rounded tick, 0.1 s |
| `ui-toggle.wav` | Switches and menus | A soft low "thock", trimmed so it starts on the tap |
| `lore-unlock.mp3` | Secret lore unlocks | A gentle glass chime |

- **Settings:** everything needs Sound switched on, which is off by default, so
  turning Sound off means nothing plays. A separate "Tap sounds" switch mutes
  just the tap and toggle sounds.
- **The game:** all five sounds are precached (cache `v16-rook-icon-sounds`).
- **Studio:** looks can now also carry `unlock`, `tap` and `toggle` sounds, and
  the Tideglass look uses these. Looks without them fall back to soft tones.
  Studio's cache is `codex-studio-v9`.

## App icon — 25 September 2026

The app icon for both the game and Studio is now a rook, not the old abstract
mark.
- **Source:** a SpriteCook painting (`eb9479f9-…`, recorded as `app_icon` in
  `spritecook-assets.json`): a glossy rook with the pale bare face at the base of
  its beak, holding a sea-glass gem, with the moon behind.
- **Crop:** cropped to the head, beak and gem so it reads at home-screen size.
- **Maskable version:** a slightly wider crop keeps the gem inside Android's
  circular safe zone.

