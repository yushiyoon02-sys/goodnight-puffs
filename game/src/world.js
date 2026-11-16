// The room's rules, with no drawing and no input in them: given the lamp's position
// and whether the beam is on, the world advances one fixed step and reports what
// happened as event flags. A monster is awake until its sleepiness reaches 100,
// then it lies down and stays asleep — unless the focused beam hits it, which wakes
// it up grumpy. The night ends when enough monsters are asleep (clear) or the
// dawn timer runs out (over).
import {
  DECAY, ENERGY, FIELD, GAIN, KINDS, LAMP, NIGHTS, POOL_SIZE, ROOM,
  SCORE, STEP, WAKE_SLEEP, WANDER, WANDER_TURN,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_SLEEP = 1;
export const EVENT_WAKE = 2;
export const EVENT_CLEAR = 4;
export const EVENT_OVER = 8;

function distance(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function createWorld(random) {
  const state = {
    night: 1,
    timeLeft: NIGHTS[0].seconds,
    target: NIGHTS[0].target,
    score: 0,
    combo: 0,
    bestCombo: 0,
    asleep: 0,
    energy: ENERGY.max,
    beamReady: true,
    lamp: { x: FIELD.width / 2, y: 380, focus: false },
    monsters: [],
    events: [],
    // Twinkling stars, placed once so the sky never changes between frames.
    stars: [],
    // Floating "Zzz" puffs from sleeping monsters, purely cosmetic.
    puffs: [],
  };
  for (let index = 0; index < 70; index += 1) {
    state.stars.push({
      x: random() * FIELD.width,
      y: random() * 230,
      size: 1 + random() * 2.2,
      phase: random() * Math.PI * 2,
      speed: 0.6 + random() * 1.4,
    });
  }
  for (let index = 0; index < POOL_SIZE; index += 1) {
    state.monsters.push({
      active: false, kind: 0, x: 0, y: 0, radius: 34,
      vx: 0, vy: 0, turnIn: 0, sleep: 0, asleep: false,
      grumpy: 0, phase: random() * Math.PI * 2, bob: 0,
      woken: 0,
    });
  }

  function placeMonster(monster, night) {
    const kind = KINDS[Math.floor(random() * KINDS.length)];
    monster.kind = KINDS.indexOf(kind);
    monster.x = ROOM.left + 60 + random() * (ROOM.right - ROOM.left - 120);
    monster.y = ROOM.top + 30 + random() * (ROOM.bottom - ROOM.top - 60);
    monster.radius = 30 + random() * 10;
    monster.sleep = 5 + random() * 20;
    monster.asleep = false;
    monster.grumpy = 0;
    monster.turnIn = 0;
    monster.vx = 0;
    monster.vy = 0;
    monster.woken = 0;
    monster.active = true;
    void night;
  }

  function reset(night) {
    const setup = NIGHTS[night - 1];
    state.night = night;
    state.timeLeft = setup.seconds;
    state.target = setup.target;
    state.asleep = 0;
    state.combo = 0;
    // A fresh run starts at night 1: the score and best combo start over too.
    if (night === 1) {
      state.score = 0;
      state.bestCombo = 0;
    }
    state.energy = ENERGY.max;
    state.beamReady = true;
    state.lamp.x = FIELD.width / 2;
    state.lamp.y = 380;
    state.lamp.focus = false;
    state.puffs.length = 0;
    for (const monster of state.monsters) monster.active = false;
    for (let index = 0; index < setup.monsters; index += 1) placeMonster(state.monsters[index], night);
  }

  /** The lamp's control for one step: mouse position, beam held, arrow-key drift. */
  function step(dt, ctl) {
    const setup = NIGHTS[state.night - 1];
    let events = EVENT_NONE;
    state.events.length = 0;

    // The lamp follows the mouse; arrow keys nudge it when the mouse is still.
    if (ctl) {
      if (ctl.mx !== undefined) state.lamp.x = ctl.mx;
      if (ctl.my !== undefined) state.lamp.y = ctl.my;
      if (ctl.moveX || ctl.moveY) {
        state.lamp.x += (ctl.moveX || 0) * LAMP.keySpeed * dt;
        state.lamp.y += (ctl.moveY || 0) * LAMP.keySpeed * dt;
      }
      state.lamp.x = Math.max(30, Math.min(FIELD.width - 30, state.lamp.x));
      state.lamp.y = Math.max(90, Math.min(FIELD.height - 30, state.lamp.y));
    }
    const wantBeam = Boolean(ctl && ctl.focus);
    state.lamp.focus = wantBeam && state.beamReady && state.energy > 0;
    if (state.lamp.focus) {
      state.energy = Math.max(0, state.energy - ENERGY.drain * dt);
      if (state.energy <= 0) state.beamReady = false;
    } else {
      state.energy = Math.min(ENERGY.max, state.energy + ENERGY.regen * dt);
      if (!state.beamReady && state.energy >= ENERGY.rearm) state.beamReady = true;
    }

    const speed = Math.min(WANDER.max, WANDER.base + WANDER.perNight * (state.night - 1));
    for (const monster of state.monsters) {
      if (!monster.active) continue;
      monster.phase += dt * 2;
      monster.bob = Math.sin(monster.phase) * 2;
      if (monster.grumpy > 0) monster.grumpy -= dt;

      const dist = distance(monster.x, monster.y, state.lamp.x, state.lamp.y);
      const inBeam = state.lamp.focus && dist < LAMP.beamRadius + monster.radius * 0.6;
      const inSoft = dist < LAMP.softRadius + monster.radius * 0.5;

      if (monster.asleep) {
        // Only the focused beam can wake a sleeper — and it wakes them grumpy.
        if (inBeam) {
          monster.asleep = false;
          monster.sleep = WAKE_SLEEP;
          monster.grumpy = 2;
          monster.woken += 1;
          state.asleep -= 1;
          state.combo = 0;
          state.score = Math.max(0, state.score - SCORE.wakePenalty);
          events |= EVENT_WAKE;
          state.events.push({ type: 'wake', x: monster.x, y: monster.y });
        }
        continue;
      }

      // Wandering: pick a new direction every couple of seconds, drift inside the room.
      monster.turnIn -= dt;
      if (monster.turnIn <= 0) {
        monster.turnIn = WANDER_TURN.min + random() * (WANDER_TURN.max - WANDER_TURN.min);
        const angle = random() * Math.PI * 2;
        monster.vx = Math.cos(angle) * speed;
        monster.vy = Math.sin(angle) * speed * 0.55;
      }
      monster.x += monster.vx * dt;
      monster.y += monster.vy * dt;
      if (monster.x < ROOM.left + monster.radius) { monster.x = ROOM.left + monster.radius; monster.vx = Math.abs(monster.vx); }
      if (monster.x > ROOM.right - monster.radius) { monster.x = ROOM.right - monster.radius; monster.vx = -Math.abs(monster.vx); }
      if (monster.y < ROOM.top + monster.radius) { monster.y = ROOM.top + monster.radius; monster.vy = Math.abs(monster.vy); }
      if (monster.y > ROOM.bottom - monster.radius) { monster.y = ROOM.bottom - monster.radius; monster.vy = -Math.abs(monster.vy); }

      // Moonlight makes a monster sleepy; darkness slowly wakes it back up.
      const kind = KINDS[monster.kind];
      if (inBeam) monster.sleep += GAIN.beam * kind.sleepRate * dt;
      else if (inSoft) monster.sleep += GAIN.soft * kind.sleepRate * dt;
      else monster.sleep -= DECAY * dt;
      monster.sleep = Math.max(0, Math.min(100, monster.sleep));

      if (monster.sleep >= 100) {
        monster.asleep = true;
        monster.vx = 0;
        monster.vy = 0;
        state.asleep += 1;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        const gained = SCORE.sleep + SCORE.perNight * (state.night - 1) + SCORE.combo * (state.combo - 1);
        state.score += gained;
        events |= EVENT_SLEEP;
        state.events.push({ type: 'sleep', x: monster.x, y: monster.y, gained });
      }
    }

    // "Zzz" puffs drift up from sleepers; they are cosmetic and capped.
    for (const monster of state.monsters) {
      if (monster.active && monster.asleep && random() < dt * 1.2 && state.puffs.length < 24) {
        state.puffs.push({ x: monster.x + 18, y: monster.y - monster.radius - 6, life: 1.6, max: 1.6 });
      }
    }
    for (let index = state.puffs.length - 1; index >= 0; index -= 1) {
      const puff = state.puffs[index];
      puff.y -= 22 * dt;
      puff.life -= dt;
      if (puff.life <= 0) state.puffs.splice(index, 1);
    }

    state.timeLeft -= dt;
    if (state.asleep >= state.target) events |= EVENT_CLEAR;
    else if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      events |= EVENT_OVER;
    }
    return events;
  }

  reset(1);

  return {
    state,
    reset,
    step,
    /** The score the night is worth so far, used for the clear screen. */
    get nightScore() {
      return state.score;
    },
    STEP,
  };
}
