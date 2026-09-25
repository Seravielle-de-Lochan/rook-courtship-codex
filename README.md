# Rook Courtship Codex

A tiny installable Progressive Web App (PWA) for phone and desktop: part guessing game, part collection book, part mildly suspicious cryptid courtship archive.

The local Tideglass edition adds the supplied SpriteCook silver-chain and
sea-glass artwork, responsive ornamental frames, illustrated navigation and
reduced-motion support. See [TIDEGLASS.md](TIDEGLASS.md) for the asset map,
integration details and validation.

## Current features

- A daily courtship offering that stays stable for that local calendar day.
- Free-play mode with handcrafted and procedurally generated offerings.
- Five collections: **Tideglass Reach**, **Domestic Cryptid**, **Questionable Antiques**, **Things Rook Found Outside**, and **Flirting With Hardware**.
- **Rare 1-in-100 finds** with their own visual treatment and Codex count.
- Occasional offerings from **Morrow, Ink, and Pip**, each with their own idea of romance.
- Secret combinations that unlock hidden lore entries.
- A dedicated **Provenance: Classified** section for objects whose acquisition history is apparently none of our business.
- Persistent local Codex, statistics, daily history, rare finds, and lore unlocks.
- Offline support after the first successful load.
- Optional tiny local click tone.
- No account, server, analytics, or remote data required.

## Codex Studio: make your own version

[`studio/`](studio/) is a separate, fully customisable edition of the game. It installs as its own app, at `…/studio/`.

- **Tideglass is the default look**, built from the same SpriteCook kit as the classic edition (`packs/tideglass/theme.json`, art in `assets/tideglass/`).
- **Visual packs.** Import a `.zip` of art to re-skin everything: background, 9-slice card frames, buttons, answer tiles, offering stage, crest, nav icons, answer icons, collection badges, companion portraits, per-offering art, fonts, particles and colours. A `theme.json` is optional; images are matched by filename, and SpriteCook UI-kit manifests (including 9-slice borders) are understood.
- **SpriteCook brief builder.** Describe a theme and style and add a reference image. The palette is taken from the reference. You get per-asset SpriteCook prompts with exact sizes and settings, a `spritecook-jobs.json` for the SpriteCook MCP server, an agent prompt for Claude, and a pre-filled `theme.json`. Generate the art, zip the folder and import it. A placeholder-art preview shows the result before you spend any credits.
- **Customise.** Live colour, font, corner, particle and pixel-art controls. Palette from any image. Save as a new look and share it as a zip.
- **Lore Forge.** Describe your giver, recipient, world, tone, meanings and side characters, and Claude writes a complete story pack: offerings, rare finds, procedural banks, companions and secret lore. Use your own Anthropic API key in the browser, or copy the prompt into Claude and paste the JSON back. Packs are validated with readable errors before installing.
- **Stories.** Several story packs installed side by side, each with its own progress. The original Rook story and a second demo story, *The Moth Lantern Society*, are built in.
- **Reading & accessibility** (Studio → Settings, also offered from the welcome screen): four text sizes that build on the reader's own browser size, a choice of font including the bundled Atkinson Hyperlegible, extra letter, word and line spacing, a high-contrast mode, always-visible answer descriptions, and Full, Calm or Off animation. These settings apply before the first paint, so there's no flash.
- Animated throughout: an ambient particle field, an unveil animation for each offering, celebration bursts, a lore-unlock seal, and a sliding nav indicator. Motion can be set to Full, Calm or Off, and reduced-motion settings are respected.
- Installable PWA: offline after the first load, update prompt, maskable icon, and `.zip`/`.json` file handling once installed.

The full pack format is in [`studio/PACK_FORMAT.md`](studio/PACK_FORMAT.md).

## Install on a phone

Once GitHub Pages is enabled for this repository, open the HTTPS site on your phone.

- Android / Chrome: menu -> **Install app** or **Add to Home screen**.
- iPhone / iPad / Safari: Share -> **Add to Home Screen**.

After the first successful load, the app can work offline.

## GitHub Pages

Set **Settings -> Pages -> Build and deployment** to **Deploy from a branch**, then choose **main** and **/(root)**.
