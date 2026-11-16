// Keyboard and pointer input, with no game rules in it: it reports what the player
// did — where the mouse is, whether the beam is held, which keys are down — and the
// caller decides what each one means.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_NIGHT2 = 8;
export const ACTION_NIGHT3 = 16;

export function createInput(canvas) {
  let actions = 0;
  let mouseX = FIELD.width / 2;
  let mouseY = 380;
  let mouseIn = false;
  let beamHeld = false;
  const keys = new Set();

  function toGame(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    switch (event.code) {
      case 'Space':
      case 'Enter':
        actions |= ACTION_CONFIRM;
        event.preventDefault();
        break;
      case 'KeyP':
      case 'Escape':
        actions |= ACTION_PAUSE;
        break;
      case 'KeyM':
        actions |= ACTION_MUTE;
        break;
      case 'Digit2':
        actions |= ACTION_NIGHT2;
        break;
      case 'Digit3':
        actions |= ACTION_NIGHT3;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        beamHeld = true;
        break;
      default:
        break;
    }
    keys.add(event.code);
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') beamHeld = false;
  });
  window.addEventListener('blur', () => {
    keys.clear();
    beamHeld = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = toGame(event);
    mouseX = point.x;
    mouseY = point.y;
    mouseIn = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = toGame(event);
    mouseX = point.x;
    mouseY = point.y;
    mouseIn = true;
    beamHeld = true;
    if (event.button === 0) actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointerup', () => {
    beamHeld = false;
  });
  canvas.addEventListener('pointerleave', () => {
    mouseIn = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The lamp control for this frame: mouse position, beam held, arrow-key drift. */
    control() {
      const moveX = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0)
        - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
      const moveY = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0)
        - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
      return { mx: mouseIn ? mouseX : undefined, my: mouseIn ? mouseY : undefined, focus: beamHeld, moveX, moveY };
    },
  };
}
