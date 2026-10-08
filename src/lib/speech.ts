// Spoken reminders using the phone's built-in voice (no internet needed on most phones).

export function speak(text: string, loud = false) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-IN";
  u.rate = 0.85; // a little slower, easier to follow
  u.volume = 1;
  u.pitch = loud ? 1.2 : 1;
  window.speechSynthesis.speak(u);
}

// A short attention chime, used for the louder 20-minute reminder.
export function chime() {
  try {
    const ctx = new AudioContext();
    [880, 660, 880].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      g.gain.value = 0.4;
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.35);
      o.stop(ctx.currentTime + i * 0.35 + 0.3);
    });
  } catch {
    /* audio not available */
  }
}
