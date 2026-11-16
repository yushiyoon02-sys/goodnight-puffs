// The screenshot scenes behind ?shot=start|play|clear|end. Each one plays the real
// rules forward from a fresh world, steered by a simple autopilot (follow the least
// sleepy awake monster and focus only when no sleeper is in the beam), so the frame
// is what a real game looks like and the same seed always gives the same frame.
import { LAMP, NIGHTS, STEP } from './config.js';
import { EVENT_CLEAR, EVENT_OVER } from './world.js';
import { SCREEN_CLEAR, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 13;
const LIMIT_SECONDS = 600;

/** The awake monster closest to sleep — the one the lamp should finish first. */
function targetMonster(state) {
  let best = null;
  for (const monster of state.monsters) {
    if (!monster.active || monster.asleep) continue;
    if (best === null || monster.sleep > best.sleep) best = monster;
  }
  return best;
}

/** True when an asleep monster sits inside the beam's reach of the lamp. */
function sleeperInBeam(state) {
  const lamp = state.lamp;
  for (const monster of state.monsters) {
    if (!monster.active || !monster.asleep) continue;
    const dx = monster.x - lamp.x;
    const dy = monster.y - lamp.y;
    if (Math.sqrt(dx * dx + dy * dy) < LAMP.beamRadius + monster.radius) return true;
  }
  return false;
}

/** One autopilot step: drift the lamp toward its target, focus only when it is safe. */
function autopilotStep(world, dt) {
  const state = world.state;
  const target = targetMonster(state);
  const lamp = state.lamp;
  let mx = lamp.x;
  let my = lamp.y;
  let focus = false;
  if (target) {
    const dx = target.x - lamp.x;
    const dy = target.y - lamp.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const move = LAMP.keySpeed * dt;
    if (dist > move) {
      mx = lamp.x + (dx / dist) * move;
      my = lamp.y + (dy / dist) * move;
    } else {
      mx = target.x;
      my = target.y;
    }
    focus = dist < 70 && !sleeperInBeam(state);
  }
  return world.step(dt, { mx, my, focus, moveX: 0, moveY: 0 });
}

/**
 * Set `world` to the named scene (start, play, clear or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset(1);
  if (name !== 'play' && name !== 'clear' && name !== 'end') {
    // A few seconds of soft light so the title's monsters already look drowsy.
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { mx: 640, my: 380, focus: false, moveX: 0, moveY: 0 });
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    // A lamp parked in the corner, never focused: dawn arrives with nobody asleep.
    for (let index = 0; index < LIMIT_SECONDS / STEP; index += 1) {
      if (world.step(STEP, { mx: 90, my: 130, focus: false, moveX: 0, moveY: 0 }) & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: 0 };
  }
  const limit = name === 'clear' ? NIGHTS[0].seconds + 2 : PLAY_SECONDS;
  let cleared = false;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = autopilotStep(world, STEP);
    if (events & EVENT_CLEAR) {
      cleared = true;
      break;
    }
    if (events & EVENT_OVER) break;
  }
  if (cleared) return { screen: SCREEN_CLEAR, best: world.state.score };
  // The frame should show the room busy: top the lamp up near a drowsy monster.
  return { screen: SCREEN_PLAY, best: Math.max(world.state.score, 0) };
}
