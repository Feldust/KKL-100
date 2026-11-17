import { SoundConfig } from '../types/game';

export const DEFAULT_SOUND_CONFIG: SoundConfig = {
  muted: false,
  volume: 0.8,
  theme: 'STUDIO',
  enableCorrect: true,
  enableStrike: true,
  enableFanfare: true,
  enableTurnSwitch: true,
};

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function effectiveGain(config: SoundConfig, baseLevel: number): number {
  return Math.max(0.001, baseLevel * Math.max(0, Math.min(1, config.volume)));
}

function playFilteredBrassHit(
  ctx: AudioContext,
  freqs: number[],
  startTime: number,
  duration: number,
  gainLevel: number,
  cutoffHz: number = 2200
) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(cutoffHz, startTime);
  filter.connect(ctx.destination);

  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.015);
    gain.gain.setValueAtTime(gainLevel * 0.85, startTime + duration * 0.65);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(filter);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  });
}

export function playCorrectSound(config: SoundConfig) {
  if (config.muted || !config.enableCorrect || config.volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (config.theme === 'FAMILY_100') {
    // Upbeat "jejeng-jejeng!" TV show brass & chime stabs
    const level = effectiveGain(config, 0.11);
    playFilteredBrassHit(ctx, [392.0, 493.88, 587.33], now, 0.09, level, 2600);
    playFilteredBrassHit(ctx, [523.25, 659.25, 783.99], now + 0.1, 0.16, level * 1.1, 2800);
    playFilteredBrassHit(ctx, [587.33, 739.99, 880.0], now + 0.28, 0.09, level, 2800);
    playFilteredBrassHit(
      ctx,
      [783.99, 987.77, 1174.66, 1567.98],
      now + 0.39,
      0.56,
      level * 1.15,
      3200
    );
    return;
  }

  if (config.theme === 'ARCADE') {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const start = now + idx * 0.045;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(effectiveGain(config, 0.14), start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });
    return;
  }

  if (config.theme === 'ARENA') {
    const chord = [440, 554.37, 659.25, 880];
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(effectiveGain(config, 0.09), now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
    });
    return;
  }

  if (config.theme === 'MINIMAL') {
    const notes = [880, 1318.51];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const start = now + idx * 0.07;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(effectiveGain(config, 0.22), start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });
    return;
  }

  // STUDIO (default)
  const notes = [587.33, 880, 1174.66];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const start = now + idx * 0.055;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(effectiveGain(config, 0.22), start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.48);
  });
}

export function playStrikeSound(config: SoundConfig) {
  if (config.muted || !config.enableStrike || config.volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (config.theme === 'FAMILY_100') {
    // Loud, sustained classic "TEEEEETTTTT!" game show wrong horn blast
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1650, now);
    filter.frequency.linearRampToValueAtTime(1250, now + 0.88);
    filter.connect(ctx.destination);

    const hornVoices: { freq: number; type: OscillatorType; weight: number }[] = [
      { freq: 146.83, type: 'sawtooth', weight: 0.16 },
      { freq: 150.5, type: 'sawtooth', weight: 0.14 },
      { freq: 220.0, type: 'square', weight: 0.09 },
      { freq: 293.66, type: 'sawtooth', weight: 0.11 },
    ];

    hornVoices.forEach((voice) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = voice.type;
      osc.frequency.setValueAtTime(voice.freq, now);
      osc.frequency.setValueAtTime(voice.freq * 0.99, now + 0.65);

      const lvl = effectiveGain(config, voice.weight);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(lvl, now + 0.015);
      gain.gain.setValueAtTime(lvl, now + 0.72);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.92);

      osc.connect(gain);
      gain.connect(filter);
      osc.start(now);
      osc.stop(now + 0.95);
    });
    return;
  }

  if (config.theme === 'ARCADE') {
    [196, 146.83].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const start = now + idx * 0.16;
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.linearRampToValueAtTime(freq * 0.72, start + 0.22);
      gain.gain.setValueAtTime(effectiveGain(config, 0.16), start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.28);
    });
    return;
  }

  if (config.theme === 'MINIMAL') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.35);
    gain.gain.setValueAtTime(effectiveGain(config, 0.26), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.42);
    return;
  }

  // STUDIO & ARENA dissonant brassy buzzer
  const freqs = config.theme === 'ARENA' ? [92.5, 98, 138.59] : [110, 116.5, 164.8];
  freqs.forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * 0.92, now + 0.55);

    const level = effectiveGain(config, 0.15);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.025);
    gain.gain.setValueAtTime(level, now + 0.42);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  });
}

export function playRoundWinSound(config: SoundConfig) {
  if (config.muted || !config.enableFanfare || config.volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (config.theme === 'FAMILY_100') {
    const level = effectiveGain(config, 0.1);
    const steps = [523.25, 659.25, 783.99, 1046.5];
    steps.forEach((freq, idx) => {
      playFilteredBrassHit(ctx, [freq, freq * 1.5], now + idx * 0.075, 0.14, level, 2800);
    });
    playFilteredBrassHit(
      ctx,
      [523.25, 659.25, 783.99, 1046.5, 1318.51],
      now + 0.34,
      0.7,
      level * 1.15,
      3200
    );
    return;
  }

  const fanfare =
    config.theme === 'ARENA'
      ? [392.0, 493.88, 587.33, 783.99, 987.77]
      : [523.25, 659.25, 783.99, 1046.5];

  const oscType: OscillatorType =
    config.theme === 'ARCADE'
      ? 'square'
      : config.theme === 'ARENA'
      ? 'sawtooth'
      : config.theme === 'MINIMAL'
      ? 'sine'
      : 'triangle';

  fanfare.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = oscType;
    const start = now + idx * 0.085;
    osc.frequency.setValueAtTime(freq, start);

    const baseLvl = config.theme === 'ARENA' || config.theme === 'ARCADE' ? 0.12 : 0.22;
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(effectiveGain(config, baseLvl), start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.58);
  });
}

export function playTurnSwitchSound(config: SoundConfig) {
  if (config.muted || !config.enableTurnSwitch || config.volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type =
    config.theme === 'ARCADE'
      ? 'square'
      : config.theme === 'FAMILY_100'
      ? 'triangle'
      : 'sine';
  osc.frequency.setValueAtTime(config.theme === 'FAMILY_100' ? 587.33 : 420, now);
  osc.frequency.exponentialRampToValueAtTime(
    config.theme === 'FAMILY_100' ? 880 : 640,
    now + 0.09
  );

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(effectiveGain(config, 0.14), now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.16);
}
