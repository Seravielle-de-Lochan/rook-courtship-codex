// Converts the original game's data files into the Studio content-pack format.
// usage: node studio/tools/build-rook-pack.mjs  (from the repo root)
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ['data-core.js', 'data-extra.js']) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
const d = ctx.window.ROOK_CODEX_DATA;

const blurbs = {
  affection: 'I am fond of you in an embarrassingly visible way.',
  seduction: 'Cryptid flirting. Quite possibly with intent.',
  thought: 'My brain pointed at a thing and went: Sera.',
  dontask: 'No laws have necessarily been broken.',
};
const lines = {
  affection: ['“I wanted you to find a small piece of me thinking about you.”', '“No grand speech. Just this. Just you.”', '“It looked like something your hands should know.”'],
  thought: ['“There was no deeper symbolism. My brain saw it and produced your name.”', '“You have colonised several categories of object in my head. Congratulations.”', '“I knew you would pick it up. That was enough reason.”'],
  seduction: ['“Oh, moon-bloom. Please. That one was not subtle.”', '“I was flirting with you using hardware. It seemed efficient.”', '“Consider it an invitation disguised as an object.”'],
  dontask: ['“It was not stolen. That is not the same thing as explaining where it came from.”', '“You may have the object or the story. I am currently offering the object.”', '“Look how lovely it is. Let us remain focused on that.”'],
};
const why = {
  affection: 'A small prepared gesture meant to be found and handled.',
  thought: 'The object triggered an immediate association with you.',
  seduction: 'Its placement and presentation turn it into an invitation.',
  dontask: 'The object is compelling. The acquisition story remains pointedly unavailable.',
};
const weights = {
  'Tideglass Reach': ['affection', 'affection', 'thought'],
  'Domestic Cryptid': ['affection', 'thought', 'thought'],
  'Questionable Antiques': ['dontask', 'dontask', 'thought'],
  'Things Rook Found Outside': ['thought', 'thought', 'affection'],
  'Flirting With Hardware': ['seduction', 'seduction', 'affection'],
};
const collectionBlurbs = {
  'Tideglass Reach': 'Pieces of the Reach, small enough to carry.',
  'Domestic Cryptid': 'Everyday objects, quietly rearranged.',
  'Questionable Antiques': 'Old, beautiful, and without receipts.',
  'Things Rook Found Outside': 'Weather-worn treasures from walks.',
  'Flirting With Hardware': 'Clasps, chains, and very little subtlety.',
};
const offering = ({ rook, rare, giver, ...o }) => ({ id: o.id, name: o.name, glyph: o.glyph, intent: o.intent, collection: o.collection, desc: o.desc, why: o.why, line: rook, codex: o.codex });
const companionNames = [...new Set(d.birdOfferings.map((b) => b.giver))];
const companionBlurbs = { Morrow: 'Courts with standards.', Ink: 'Courts with stealth.', Pip: 'Courts with spectacle.' };

const requires = (r) =>
  r.requiresIds ? { type: 'ids', ids: r.requiresIds, intent: '', collection: '', count: r.requiresIds.length }
  : r.requiresGivers ? { type: 'companions', ids: r.requiresGivers, intent: '', collection: '', count: r.requiresGivers.length }
  : r.requiresIntentCount ? { type: 'intentCount', ids: [], intent: r.requiresIntentCount.intent, collection: '', count: r.requiresIntentCount.count }
  : r.requiresCollectionCount ? { type: 'collectionCount', ids: [], intent: '', collection: r.requiresCollectionCount.collection, count: r.requiresCollectionCount.count }
  : { type: 'rareCount', ids: [], intent: '', collection: '', count: r.requiresRareCount };

const pack = {
  format: 'codex-content-pack',
  version: 1,
  id: 'rook-courtship',
  title: 'Rook Courtship Codex',
  eyebrow: 'cryptid field study · pocket edition',
  subtitle: 'Interpret strange little offerings, catalogue the rituals, unlock secret lore, and continue not asking where the antique hardware came from.',
  giver: { name: 'Rook', description: 'A courting cryptid with a sea-glass palette and an aversion to receipts.' },
  recipient: { name: 'Sera' },
  labels: {
    daily: "Today's courtship offering",
    question: 'What did I mean by this?',
    unread: 'Uninterpreted',
    correctBadge: 'Read perfectly',
    wrongBadge: 'Unexpected cryptid logic',
    correctVerdict: 'You read me perfectly.',
    wrongVerdict: 'Entirely reasonable. Unfortunately, I am stranger than that.',
    codexTitle: 'Discovered rituals',
    loreTitle: 'Secret lore',
    loreIntro: 'Certain combinations of finds make the Codex remember things it was not initially planning to tell you.',
    lockedLore: 'The rest of this entry remains hidden until the right finds gather together.',
  },
  intents: Object.entries(d.intents).map(([id, label]) => ({ id, label, blurb: blurbs[id], why: why[id], lines: lines[id] })),
  collections: d.collections.map((name) => {
    const b = d.proceduralBanks[name];
    return {
      name,
      blurb: collectionBlurbs[name],
      intentWeights: weights[name],
      objects: b.objects.map(([n, glyph]) => ({ name: n, glyph })),
      places: b.places,
      touches: b.touches,
      lines: name === 'Tideglass Reach' ? { intent: 'affection', lines: ['“A little bit of our Reach, because I wanted you to have it here too.”', '“Some places fit in the palm when you know what to look for.”'] } : { intent: '', lines: [] },
    };
  }),
  offerings: d.handcrafted.map(offering),
  rare: d.rareOfferings.map(offering),
  companions: companionNames.map((name) => ({ name, blurb: companionBlurbs[name] || '', offerings: d.birdOfferings.filter((b) => b.giver === name).map(offering) })),
  lore: d.loreRules.map((r) => ({ id: r.id, title: r.title, hint: r.hint, body: r.body, requires: requires(r) })),
  special: {
    intent: 'dontask',
    tab: 'Classified',
    title: 'Provenance: Classified',
    intro: 'Objects whose emotional significance is clear and whose acquisition history remains none of your business, apparently.',
    stamp: 'Provenance classified',
    empty: 'No classified provenance yet. This is unlikely to remain true.',
  },
};
fs.writeFileSync('studio/packs/rook-courtship.json', JSON.stringify(pack, null, 1));
console.log('wrote studio/packs/rook-courtship.json', pack.offerings.length, 'offerings,', pack.rare.length, 'rare,', pack.companions.length, 'companions,', pack.lore.length, 'lore');
