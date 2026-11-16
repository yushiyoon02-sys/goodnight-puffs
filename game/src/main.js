// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between six screens: title, play, paused, night clear, win and
// game over. Three nights in a row make a full run; clearing night 3 wins the game.
//
// ?seed=N fixes the monster pattern. ?shot=start|play|clear|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets window.__shotReady
// for a screenshot.
import { BEST_KEY, NIGHTS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CLEAR, EVENT_OVER, EVENT_SLEEP, EVENT_WAKE } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_NIGHT2, ACTION_NIGHT3, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
// The canvas backs the 1280x720 logical stage one-to-one; without this it stays
// 300x150 and the browser stretches it, which makes everything blurry.
canvas.width = 1280;
canvas.height = 720;
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let time = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startNight(night) {
    world.reset(night);
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Night ${night}. Put ${world.state.target} puffs to sleep before dawn.`);
  }

  function endRun(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(won
      ? `Perfect night. Final score ${world.state.score}.`
      : `Dawn came. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_NIGHT3) startNight(3);
      else if (actions & ACTION_NIGHT2) startNight(2);
      else if (actions & ACTION_CONFIRM) {
        audio.unlock();
        audio.click();
        startNight(1);
      }
    } else if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_CLEAR) {
      if (actions & ACTION_CONFIRM) {
        audio.click();
        startNight(world.state.night + 1);
      }
    } else if (screen === SCREEN_WIN || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) {
        audio.click();
        startNight(1);
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // The title's monsters drift gently under the moon, so the screen is alive.
      world.step(STEP, { mx: 640, my: 330, focus: false, moveX: 0, moveY: 0 });
      return;
    }
    const events = world.step(STEP, input.control());
    if (events & EVENT_SLEEP) audio.sleep();
    if (events & EVENT_WAKE) audio.wake();
    if (events & EVENT_CLEAR) {
      audio.clear();
      if (world.state.night >= NIGHTS.length) endRun(true);
      else {
        screen = SCREEN_CLEAR;
        announce(`Night ${world.state.night} clear. Score ${world.state.score}.`);
      }
    } else if (events & EVENT_OVER) {
      endRun(false);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    time = now / 1000;
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, time);
  }

  // Leaving the tab pauses a running game rather than letting dawn arrive unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Goodnight, Puffs. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
