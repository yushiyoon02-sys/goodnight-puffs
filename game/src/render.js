// Everything the player sees, drawn on one canvas: the night room, the monsters,
// the moon lamp's glow and beam, the HUD, and the title / clear / win / over screens.
// The game is a fixed 1280x720 logical stage, scaled to the window, so the layout
// never depends on the screen size.
import { FIELD, KINDS, LAMP, NIGHTS, PALETTE, STIR } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, fraction, fill, back) {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (fraction > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, fraction)), h, h / 2);
    ctx.fill();
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  // Generated pictures under game/assets/: a full night-room scene, a sleepy
  // moon, and one portrait per monster kind. Every one has a code-drawn
  // fallback: if a picture fails to load, the room and monsters are drawn
  // in code exactly as before, so the game never depends on the files.
  const IMAGES = {
    background: 'assets/background.jpg',
    moon: 'assets/moon.jpg',
    momo: 'assets/momo.jpg',
    pea: 'assets/pea.jpg',
    lulu: 'assets/lulu.jpg',
    pip: 'assets/pip.jpg',
  };
  const images = {};
  const whenImagesReady = Promise.all(Object.entries(IMAGES).map(([key, src]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images[key] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = src;
  })));

  function drawImageRound(img, x, y, r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawRoom(state, time) {
    if (images.background) {
      ctx.drawImage(images.background, 0, 0, FIELD.width, FIELD.height);
    } else {
      // Night sky, twinkling stars and the floor with its rug, drawn in code.
      const sky = ctx.createLinearGradient(0, 0, 0, 420);
      sky.addColorStop(0, PALETTE.skyTop);
      sky.addColorStop(1, PALETTE.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, FIELD.width, 420);
      for (const star of state.stars) {
        const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(time * star.speed + star.phase));
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = '#fffbe8';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Floor and the big round rug the monsters wander on.
      ctx.fillStyle = PALETTE.floor;
      ctx.fillRect(0, 420, FIELD.width, 300);
      ctx.fillStyle = PALETTE.rug;
      ctx.beginPath();
      ctx.ellipse(640, 470, 600, 130, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.rugEdge;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(640, 470, 560, 108, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Three little beds along the back wall, where sleepers dream.
      for (let index = 0; index < 3; index += 1) {
        const x = 470 + index * 190;
        ctx.fillStyle = '#7a5a9e';
        roundRect(ctx, x, 396, 130, 34, 12);
        ctx.fill();
        ctx.fillStyle = '#f2e3c9';
        roundRect(ctx, x + 8, 384, 114, 26, 10);
        ctx.fill();
      }
    }
    // Window, top right and small, with a sleepy moon in it — clear of the centred
    // title above and the HUD bar below it.
    ctx.fillStyle = PALETTE.windowFrame;
    roundRect(ctx, 1010, 88, 240, 150, 14);
    ctx.fill();
    ctx.fillStyle = PALETTE.window;
    roundRect(ctx, 1020, 98, 220, 130, 9);
    ctx.fill();
    if (images.moon) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(1130, 163, 40, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(images.moon, 1090, 123, 80, 80);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.arc(1130, 163, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2cd6e';
      ctx.beginPath();
      ctx.arc(1115, 152, 7, 0, Math.PI * 2);
      ctx.arc(1144, 174, 5, 0, Math.PI * 2);
      ctx.arc(1138, 144, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = PALETTE.windowFrame;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(1130, 98);
    ctx.lineTo(1130, 228);
    ctx.moveTo(1020, 163);
    ctx.lineTo(1240, 163);
    ctx.stroke();
  }

  /** The warning over a tossing sleeper: a pulsing "!" badge, a draining bar
   * that shows how long until it wakes up for real, and a "?" where its Zzz
   * used to be. */
  function drawStirring(monster, x, y, r, time) {
    if (monster.stirring <= 0) return;
    const w = r * 1.7;
    bar(ctx, x - w / 2, y - r - 22, w, 9, monster.stirring / STIR.warn, '#ff9d9d', PALETTE.barBack);
    const pulse = 1 + Math.sin(time * 6) * 0.12;
    const by = y - r - 52;
    const br = 15 * pulse;
    ctx.fillStyle = '#ff5d5d';
    ctx.beginPath();
    ctx.arc(x, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, by, br, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(br * 1.3)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, by + 1);
    ctx.fillStyle = '#cfe0ff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('?', x + br + 10, by);
    ctx.textAlign = 'left';
  }

  function drawMonster(monster, state, time) {
    const kind = KINDS[monster.kind];
    const squash = monster.asleep ? 0.72 : 1 + Math.sin(monster.phase) * 0.03;
    const bob = monster.asleep ? 0 : monster.bob;
    // A stirring sleeper tosses from side to side.
    const shake = monster.stirring > 0 ? Math.sin(time * 28) * 3 : 0;
    const x = monster.x + shake;
    const y = monster.y + bob;
    const r = monster.radius;

    // The generated portrait, round-clipped like a badge; the code-drawn
    // monster below stays as the fallback if the picture is missing.
    const portrait = images[kind.id];
    if (portrait) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, squash);
      drawImageRound(portrait, 0, 0, r);
      ctx.restore();
      drawStirring(monster, x, y, r, time);
      if (!monster.asleep) {
        const w = r * 1.7;
        bar(ctx, x - w / 2, y - r - 22, w, 9, monster.sleep / 100,
          monster.sleep > 75 ? PALETTE.gold : '#b7e6a1', PALETTE.barBack);
      }
      return;
    }

    // Ears, by kind.
    ctx.fillStyle = kind.body;
    if (kind.ear === 'round') {
      ctx.beginPath();
      ctx.arc(x - r * 0.55, y - r * 0.75, r * 0.3, 0, Math.PI * 2);
      ctx.arc(x + r * 0.55, y - r * 0.75, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind.ear === 'leaf') {
      ctx.beginPath();
      ctx.ellipse(x - r * 0.5, y - r * 0.85, r * 0.16, r * 0.42, -0.5, 0, Math.PI * 2);
      ctx.ellipse(x + r * 0.5, y - r * 0.85, r * 0.16, r * 0.42, 0.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind.ear === 'horn') {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.6, y - r * 0.55);
      ctx.lineTo(x - r * 0.35, y - r * 1.15);
      ctx.lineTo(x - r * 0.15, y - r * 0.6);
      ctx.moveTo(x + r * 0.6, y - r * 0.55);
      ctx.lineTo(x + r * 0.35, y - r * 1.15);
      ctx.lineTo(x + r * 0.15, y - r * 0.6);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(x - r * 0.62, y - r * 0.6, r * 0.34, r * 0.18, 0.5, 0, Math.PI * 2);
      ctx.ellipse(x + r * 0.62, y - r * 0.6, r * 0.34, r * 0.18, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body and belly.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, squash);
    ctx.fillStyle = kind.body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = kind.belly;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.32, r * 0.55, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // Face: open eyes that watch the lamp, closed arcs when asleep, grumpy brows when woken.
    if (monster.asleep) {
      ctx.strokeStyle = '#5a3d4d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(-r * 0.32, -r * 0.1, r * 0.16, Math.PI * 1.15, Math.PI * 1.85);
      ctx.arc(r * 0.32, -r * 0.1, r * 0.16, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, r * 0.12, r * 0.12, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      const lookX = Math.max(-1, Math.min(1, (state.lamp.x - x) / 300));
      const lookY = Math.max(-1, Math.min(1, (state.lamp.y - y) / 300));
      ctx.fillStyle = '#3a2b3d';
      ctx.beginPath();
      ctx.arc(-r * 0.32 + lookX * 4, -r * 0.12 + lookY * 3, r * 0.14, 0, Math.PI * 2);
      ctx.arc(r * 0.32 + lookX * 4, -r * 0.12 + lookY * 3, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-r * 0.32 + lookX * 4 - 2, -r * 0.12 + lookY * 3 - 2, r * 0.05, 0, Math.PI * 2);
      ctx.arc(r * 0.32 + lookX * 4 - 2, -r * 0.12 + lookY * 3 - 2, r * 0.05, 0, Math.PI * 2);
      ctx.fill();
      if (monster.grumpy > 0) {
        ctx.strokeStyle = '#5a3d4d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-r * 0.5, -r * 0.42);
        ctx.lineTo(-r * 0.14, -r * 0.3);
        ctx.moveTo(r * 0.5, -r * 0.42);
        ctx.lineTo(r * 0.14, -r * 0.3);
        ctx.stroke();
      }
      ctx.strokeStyle = '#5a3d4d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, r * 0.18, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
    // Blush.
    ctx.fillStyle = 'rgba(255, 120, 150, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.55, r * 0.1, r * 0.14, r * 0.09, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.55, r * 0.1, r * 0.14, r * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sleepiness bar, only while awake.
    if (!monster.asleep) {
      const w = r * 1.7;
      bar(ctx, x - w / 2, y - r - 22, w, 9, monster.sleep / 100,
        monster.sleep > 75 ? PALETTE.gold : '#b7e6a1', PALETTE.barBack);
    }
    drawStirring(monster, x, y, r, time);
  }

  function drawLamp(state) {
    const lamp = state.lamp;
    // Soft moonlight pool.
    const glow = ctx.createRadialGradient(lamp.x, lamp.y, 10, lamp.x, lamp.y, LAMP.softRadius);
    glow.addColorStop(0, 'rgba(255, 230, 150, 0.34)');
    glow.addColorStop(0.7, 'rgba(255, 230, 150, 0.12)');
    glow.addColorStop(1, 'rgba(255, 230, 150, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lamp.x, lamp.y, LAMP.softRadius, 0, Math.PI * 2);
    ctx.fill();
    if (lamp.focus) {
      const beam = ctx.createRadialGradient(lamp.x, lamp.y, 5, lamp.x, lamp.y, LAMP.beamRadius);
      beam.addColorStop(0, 'rgba(255, 246, 200, 0.85)');
      beam.addColorStop(0.75, 'rgba(255, 220, 120, 0.4)');
      beam.addColorStop(1, 'rgba(255, 220, 120, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, LAMP.beamRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 240, 170, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, LAMP.beamRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    // The little moon itself.
    if (images.moon) {
      drawImageRound(images.moon, lamp.x, lamp.y, 26);
    } else {
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2b3d';
      ctx.beginPath();
      ctx.arc(lamp.x - 8, lamp.y - 3, 3, 0, Math.PI * 2);
      ctx.arc(lamp.x + 8, lamp.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a2b3d';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y + 4, 6, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(20, 16, 42, 0.72)';
    roundRect(ctx, 16, 12, 1248, 64, 14);
    ctx.fill();
    ctx.fillStyle = PALETTE.hud;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Night ${state.night} / ${NIGHTS.length}`, 36, 44);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(`🌙 ${state.asleep} / ${state.target} ASLEEP`, 240, 44);
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    ctx.fillStyle = state.timeLeft < 15 ? '#ff9d9d' : PALETTE.hud;
    ctx.fillText(`⏰ ${minutes}:${String(seconds).padStart(2, '0')}`, 520, 44);
    ctx.fillStyle = PALETTE.hud;
    ctx.fillText(`Score ${state.score}`, 700, 44);
    if (state.combo > 1) {
      ctx.fillStyle = PALETTE.gold;
      ctx.fillText(`🔥 x${state.combo}`, 880, 44);
    }
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Moon', 1000, 30);
    bar(ctx, 1000, 42, 150, 12, state.energy / 100,
      state.beamReady ? PALETTE.energyFill : '#ff9d9d', PALETTE.barBack);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '18px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Best ${best}`, 1244, 44);
    ctx.textAlign = 'left';
    // Bottom hint line.
    ctx.fillStyle = 'rgba(20, 16, 42, 0.72)';
    roundRect(ctx, 16, 668, 1248, 40, 12);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '19px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Move mouse: moonlight  ·  Hold click: focused beam (wakes sleepers!)  ·  P pause  ·  M mute', 640, 689);
    ctx.textAlign = 'left';
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(20, 16, 42, 0.82)';
    roundRect(ctx, 340, 150, 600, 420, 22);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 3;
    roundRect(ctx, 340, 150, 600, 420, 22);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = accent || PALETTE.gold;
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText(title, 640, 220);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '24px system-ui, sans-serif';
    lines.forEach((line, index) => {
      ctx.fillText(line, 640, 290 + index * 42);
    });
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Press Space or click to continue', 640, 530);
    ctx.textAlign = 'left';
  }

  function drawTitle(state, best, time) {
    ctx.fillStyle = 'rgba(20, 16, 42, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 72px system-ui, sans-serif';
    ctx.fillText('Goodnight, Puffs!', 640, 150);
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '29px system-ui, sans-serif';
    ctx.fillText('Shh… tuck the little monsters in with moonlight.', 640, 202);
    // A parade of the four kinds, drowsy to different degrees so the sleep bars show.
    const paradeSleep = [25, 50, 75, 90, 40];
    for (let index = 0; index < state.monsters.length; index += 1) {
      const monster = state.monsters[index];
      if (!monster.active) continue;
      const savedX = monster.x;
      const savedY = monster.y;
      const savedSleep = monster.sleep;
      monster.x = 400 + index * 160;
      monster.y = 315;
      monster.sleep = paradeSleep[index] ?? 50;
      monster.asleep = false;
      drawMonster(monster, state, time);
      monster.x = savedX;
      monster.y = savedY;
      monster.sleep = savedSleep;
    }
    ctx.fillStyle = 'rgba(20, 16, 42, 0.72)';
    roundRect(ctx, 230, 410, 820, 170, 16);
    ctx.fill();
    ctx.fillStyle = PALETTE.hud;
    ctx.font = '23px system-ui, sans-serif';
    ctx.fillText('Move the mouse to shine soft moonlight. Hold click for a focused beam —', 640, 452);
    ctx.fillText('it puts one monster to sleep fast, but wakes any sleeper it touches.', 640, 486);
    ctx.fillText('Put enough monsters to sleep before dawn. 3 nights, 4 kinds of puffs.', 640, 520);
    ctx.fillText('A sleeper may toss and turn — shine soft light on them before they wake!', 640, 554);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 25px system-ui, sans-serif';
    ctx.fillText(`Night 1: ${NIGHTS[0].target} of ${NIGHTS[0].monsters} asleep in ${NIGHTS[0].seconds}s  ·  Best ${best}`, 640, 622);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Press 2 or 3 on the title screen to start on Night 2 or 3', 640, 660);
    ctx.textAlign = 'left';
  }

  return {
    /** Resolves once every generated picture has loaded or failed to load. */
    whenImagesReady,
    draw(state, screen, best, time) {
      const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
      const offsetX = (canvas.width - FIELD.width * scale) / 2;
      const offsetY = (canvas.height - FIELD.height * scale) / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#14102a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);

      drawRoom(state, time);
      // The title screen draws its own monster parade; the room's monsters stay hidden there.
      if (screen !== SCREEN_TITLE) {
        for (const monster of state.monsters) {
          if (monster.active) drawMonster(monster, state, time);
        }
      }
      // Floating Zzz puffs.
      ctx.fillStyle = '#cfe0ff';
      ctx.font = 'bold 22px system-ui, sans-serif';
      for (const puff of state.puffs) {
        ctx.globalAlpha = Math.max(0, puff.life / puff.max);
        ctx.fillText('Z', puff.x, puff.y);
      }
      ctx.globalAlpha = 1;
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawLamp(state);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);

      if (screen === SCREEN_TITLE) drawTitle(state, best, time);
      else if (screen === SCREEN_PAUSED) {
        panel('Paused', ['The monsters are waiting.', 'The moon is holding its light.'], PALETTE.hud);
      } else if (screen === SCREEN_CLEAR) {
        panel(`Night ${state.night} Clear! 🌙`, [
          `${state.asleep} of ${state.target} puffs asleep.`,
          `Score ${state.score}  ·  Best combo x${state.bestCombo}`,
          state.night < NIGHTS.length ? 'Tomorrow brings more puffs — and less time.' : '',
        ], PALETTE.gold);
      } else if (screen === SCREEN_WIN) {
        panel('PERFECT NIGHT! 🌙', [
          'Every puff is asleep. The whole house dreams.',
          `Final score ${state.score}  ·  Best combo x${state.bestCombo}`,
          `Best total ${best}`,
        ], PALETTE.gold);
      } else if (screen === SCREEN_OVER) {
        panel('Dawn came… 🌅', [
          `Only ${state.asleep} of ${state.target} puffs fell asleep.`,
          `Score ${state.score}  ·  Best ${best}`,
          'The puffs are still bouncing. Try again?',
        ], '#ff9d9d');
      }
    },
  };
}
