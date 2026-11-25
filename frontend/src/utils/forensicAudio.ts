export type TactileSoundKind = 'card-hum' | 'button-tick' | 'action-click';

export interface SoundPreset {
  kind: TactileSoundKind;
  startFreqHz: number;
  endFreqHz: number;
  filterCutoffHz: number;
  durationSec: number;
  peakGain: number;
  cooldownMs: number;
  waveform: OscillatorType;
}

export const SOUND_PRESETS: Record<TactileSoundKind, SoundPreset> = {
  'card-hum': {
    kind: 'card-hum',
    startFreqHz: 138,
    endFreqHz: 112,
    filterCutoffHz: 320,
    durationSec: 0.21,
    peakGain: 0.018,
    cooldownMs: 180,
    waveform: 'sine',
  },
  'button-tick': {
    kind: 'button-tick',
    startFreqHz: 480,
    endFreqHz: 210,
    filterCutoffHz: 680,
    durationSec: 0.042,
    peakGain: 0.015,
    cooldownMs: 95,
    waveform: 'sine',
  },
  'action-click': {
    kind: 'action-click',
    startFreqHz: 340,
    endFreqHz: 125,
    filterCutoffHz: 780,
    durationSec: 0.055,
    peakGain: 0.028,
    cooldownMs: 45,
    waveform: 'triangle',
  },
};

/**
 * Pure helper returning preset parameters for a given tactile sound kind.
 */
export function getAudioPreset(kind: TactileSoundKind): SoundPreset {
  return SOUND_PRESETS[kind];
}

/**
 * Pure cooldown gate to prevent audio chatter during rapid pointer sweeps.
 */
export function shouldTriggerSound(
  kind: TactileSoundKind,
  nowMs: number,
  lastPlayedAtMs: number,
): boolean {
  const preset = SOUND_PRESETS[kind];
  return nowMs - lastPlayedAtMs >= preset.cooldownMs;
}

/**
 * Pure selector classification for DOM hover targets.
 * Prioritizes interactive buttons/links/pills over enclosing glass cards.
 */
export function classifyInteractiveTag(
  matchesButtonOrLink: boolean,
  matchesGlassPill: boolean,
  matchesGlassCard: boolean,
): TactileSoundKind | null {
  if (matchesButtonOrLink || matchesGlassPill) return 'button-tick';
  if (matchesGlassCard) return 'card-hum';
  return null;
}

class ForensicAudioEngine {
  private ctx: AudioContext | null = null;
  private enabled = true;
  private lastPlayed: Record<TactileSoundKind, number> = {
    'card-hum': 0,
    'button-tick': 0,
    'action-click': 0,
  };

  setEnabled(next: boolean): void {
    this.enabled = next;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Must be called inside or after a user gesture to satisfy browser autoplay policies.
   */
  unlock(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
      } catch {
        return;
      }
    }

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {
        // Ignore resume errors before user gesture
      });
    }
  }

  play(kind: TactileSoundKind): boolean {
    if (!this.enabled || typeof window === 'undefined') return false;
    if (
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return false;
    }

    const nowMs = performance.now();
    if (!shouldTriggerSound(kind, nowMs, this.lastPlayed[kind])) {
      return false;
    }

    if (!this.ctx || this.ctx.state !== 'running') {
      return false;
    }

    this.lastPlayed[kind] = nowMs;
    const preset = getAudioPreset(kind);
    const t0 = this.ctx.currentTime;

    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = preset.waveform;
      osc.frequency.setValueAtTime(preset.startFreqHz, t0);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, preset.endFreqHz),
        t0 + preset.durationSec,
      );

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(preset.filterCutoffHz, t0);
      filter.Q.setValueAtTime(kind === 'card-hum' ? 2.4 : 1.1, t0);

      // Soft attack avoids digital clicks; exponential decay feels organic
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(preset.peakGain, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + preset.durationSec);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      // Add subtle second harmonic warmth for glass card hums
      if (kind === 'card-hum') {
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(preset.startFreqHz * 1.5, t0);
        subOsc.frequency.exponentialRampToValueAtTime(
          preset.endFreqHz * 1.5,
          t0 + preset.durationSec,
        );
        subGain.gain.setValueAtTime(0.0001, t0);
        subGain.gain.linearRampToValueAtTime(preset.peakGain * 0.42, t0 + 0.025);
        subGain.gain.exponentialRampToValueAtTime(0.0001, t0 + preset.durationSec);

        subOsc.connect(filter);
        subGain.connect(this.ctx.destination);
        subOsc.start(t0);
        subOsc.stop(t0 + preset.durationSec + 0.02);
      }

      osc.start(t0);
      osc.stop(t0 + preset.durationSec + 0.02);
      return true;
    } catch {
      return false;
    }
  }
}

export const forensicAudio = new ForensicAudioEngine();
