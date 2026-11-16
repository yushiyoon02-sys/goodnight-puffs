// Goodnight, Puffs! — every tuning number in one place.
// The room is a fixed 1280x720 logical stage; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Local-storage key for the best total score. */
export const BEST_KEY = 'goodnight-puffs-best';

/** One entry per night: how many monsters wander, how many must sleep, how long the night lasts. */
export const NIGHTS = [
  { monsters: 5, target: 4, seconds: 75 },
  { monsters: 6, target: 5, seconds: 70 },
  { monsters: 7, target: 6, seconds: 65 },
];

/** The four monster kinds: body colour, belly, ear shape and how fast each one dozes off. */
export const KINDS = [
  { id: 'momo', name: 'Momo', body: '#ffb3c8', belly: '#ffe3ec', ear: 'round', sleepRate: 1.0 },
  { id: 'pea', name: 'Pea', body: '#a8e6a1', belly: '#e2f7df', ear: 'leaf', sleepRate: 1.15 },
  { id: 'lulu', name: 'Lulu', body: '#cdb4f6', belly: '#ece4fb', ear: 'horn', sleepRate: 0.9 },
  { id: 'pip', name: 'Pip', body: '#ffc98a', belly: '#ffedd6', ear: 'flop', sleepRate: 1.05 },
];

/** Wandering room bounds (the rug area, below the window). */
export const ROOM = { left: 70, right: 1210, top: 250, bottom: 580 };

/** The moon lamp: soft light radius, focused beam radius, and how fast it moves on keys. */
export const LAMP = { softRadius: 185, beamRadius: 78, keySpeed: 760 };

/** Sleepiness gained per second inside the soft light / the focused beam. */
export const GAIN = { soft: 6, beam: 26 };
/** Sleepiness lost per second while an awake monster stands in the dark. */
export const DECAY = 0.7;
/** Sleepiness an asleep monster keeps: only a focused beam can wake one. */
export const WAKE_SLEEP = 45;

/** Moon energy: 100 at most, drained by the beam, refilled while the beam is off. */
export const ENERGY = { max: 100, drain: 13, regen: 7, rearm: 30 };

/** Wandering speed on night 1, and how much faster each later night is. */
export const WANDER = { base: 16, perNight: 5, max: 34 };
/** Seconds between a monster picking a new wandering direction. */
export const WANDER_TURN = { min: 1.4, max: 3.2 };

/** Points for putting a monster to sleep, plus a per-night bonus and the combo bonus. */
export const SCORE = { sleep: 100, perNight: 20, combo: 25, wakePenalty: 25 };

/** How many monsters can be in the room at once (the pool is allocated once, at boot). */
export const POOL_SIZE = 7;

export const PALETTE = {
  skyTop: '#1b2350',
  skyBottom: '#3b2f6b',
  floor: '#4a3a63',
  rug: '#6b4f8a',
  rugEdge: '#8a68ad',
  window: '#2a3a6e',
  windowFrame: '#f2e3c9',
  hud: '#fff7e0',
  hudDim: '#cfc4ee',
  gold: '#ffd66e',
  barBack: '#241d3d',
  barFill: '#ffd66e',
  energyFill: '#9fd8ff',
  panel: '#241d3d',
  panelEdge: '#8a68ad',
};
