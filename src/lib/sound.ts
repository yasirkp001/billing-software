/** Tiny Web Audio chimes — generated in-browser, no audio files needed. */

type Tone = { freq: number; start: number; dur: number };

function play(tones: Tone[], volume = 0.18) {
  try {
    const ctx = new AudioContext();
    for (const t of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = t.freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + t.start);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + t.start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t.start + t.dur);
      osc.start(ctx.currentTime + t.start);
      osc.stop(ctx.currentTime + t.start + t.dur + 0.05);
    }
  } catch {
    /* no audio support — silently ignore */
  }
}

/** Rising two-tone chime for new notifications (A5 → C#6). */
export function playNotification() {
  play([
    { freq: 880, start: 0, dur: 0.28 },
    { freq: 1108, start: 0.18, dur: 0.32 },
  ]);
}

/** Soft descending two-tone for logout (C#6 → A5). */
export function playLogout() {
  play([
    { freq: 1108, start: 0, dur: 0.22 },
    { freq: 880, start: 0.15, dur: 0.3 },
  ]);
}
