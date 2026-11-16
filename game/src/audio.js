// Soft synthesized sounds, made with the Web Audio API at runtime: no audio files,
// no network. A gentle pluck when a monster falls asleep, a low boop when one wakes,
// a little chime when a night clears.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (!context) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context && context.state === 'suspended') context.resume();
    return context;
  }

  function tone(freq, seconds, type, volume, when) {
    const audio = ensure();
    if (!audio || muted) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.value = freq;
    const start = audio.currentTime + (when || 0);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.05);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    sleep() {
      tone(660, 0.5, 'sine', 0.12);
      tone(880, 0.6, 'sine', 0.1, 0.09);
    },
    wake() {
      tone(180, 0.25, 'triangle', 0.12);
    },
    /** A soft worried blip when a sleeper starts tossing. */
    stir() {
      tone(392, 0.18, 'sine', 0.1);
      tone(392, 0.18, 'sine', 0.1, 0.16);
    },
    /** A gentle lullaby note when soft light soothes a tossing sleeper. */
    soothe() {
      tone(784, 0.4, 'sine', 0.1);
      tone(1047, 0.5, 'sine', 0.08, 0.1);
    },
    clear() {
      tone(523, 0.4, 'sine', 0.12);
      tone(659, 0.4, 'sine', 0.12, 0.12);
      tone(784, 0.6, 'sine', 0.12, 0.24);
    },
    click() {
      tone(440, 0.12, 'sine', 0.08);
    },
  };
}
