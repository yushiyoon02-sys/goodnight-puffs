# Goodnight, Puffs!

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/yushiyoon02-sys/goodnight-puffs/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/yushiyoon02-sys/goodnight-puffs/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Shh… the little monsters are bouncing around the night room, and dawn is coming. Guide the moonlight with your mouse: soft light slowly makes a puff sleepy, and holding click focuses the beam to tuck one in fast — but the beam wakes any sleeper it touches, and it drains the moon's energy. Put enough puffs to sleep before the timer runs out, across three nights, and the whole house dreams.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/index.html` and its ES modules are the whole game, and every picture and sound is drawn or synthesised in code.

## How to play

- **Move the mouse** to move the moon lamp. Monsters inside the soft light get sleepy; monsters in the dark slowly wake back up.
- **Hold click (or Shift)** for a focused beam: one monster falls asleep much faster, but the beam drains moon energy and wakes any sleeper it touches. Let the energy refill before beaming again.
- **Arrow keys / WASD** move the lamp without the mouse.
- **P** pauses, **M** mutes, **Space / click** starts or restarts. Press **2** or **3** on the title screen to start on Night 2 or 3.
- Each night has a target: Night 1 needs 4 of 5 puffs asleep in 75 seconds, Night 2 needs 5 of 6 in 70, Night 3 needs 6 of 7 in 65. Chain sleeps without waking anyone to grow the combo multiplier.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
