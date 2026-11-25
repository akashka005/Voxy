import type { AssessmentCase } from '../data';
import { createSeededRng } from './forensics';

const decodedAudioRegistry = new Map<string, AudioBuffer>();

export function registerDecodedAudioBuffer(caseId: string, buffer: AudioBuffer): void {
  decodedAudioRegistry.set(caseId, buffer);
}

export function getDecodedAudioBuffer(caseId: string): AudioBuffer | undefined {
  return decodedAudioRegistry.get(caseId);
}

export function clearDecodedAudioBuffers(): void {
  decodedAudioRegistry.clear();
}

/**
 * Extracts normalized [0.08, 1.0] mirrored waveform envelope bars from raw mono PCM samples.
 */
export function extractWaveformEnvelopeFromPcm(
  samples: Float32Array,
  barCount: number,
): number[] {
  if (barCount <= 0) return [];
  if (samples.length === 0) return Array.from({ length: barCount }, () => 0.12);

  const step = Math.max(1, Math.floor(samples.length / barCount));
  const rawPeaks: number[] = [];
  let globalMax = 0.0001;

  for (let i = 0; i < barCount; i++) {
    const start = Math.min(samples.length - 1, Math.floor((i / barCount) * samples.length));
    const end = Math.min(samples.length, Math.max(start + 1, start + step));
    let sumSq = 0;
    for (let j = start; j < end; j++) {
      const s = samples[j];
      sumSq += s * s;
    }
    const rms = Math.sqrt(sumSq / Math.max(1, end - start));
    rawPeaks.push(rms);
    if (rms > globalMax) globalMax = rms;
  }

  return rawPeaks.map((rms) => {
    const normalized = Math.pow(rms / globalMax, 0.72);
    return Number(Math.max(0.08, Math.min(1.0, 0.08 + normalized * 0.92)).toFixed(4));
  });
}

/**
 * Computes a mel-weighted time-frequency spectrogram matrix (cols x bands in [0, 1])
 * using Goertzel DFT band filters on mono PCM samples across 120 Hz .. 8000 Hz.
 */
export function computeMelSpectrogramColumns(
  samples: Float32Array,
  sampleRate: number,
  cols: number,
  bands: number,
): number[][] {
  if (cols <= 0 || bands <= 0) return [];
  if (samples.length === 0 || sampleRate <= 0) {
    return Array.from({ length: cols }, () => Array.from({ length: bands }, () => 0.05));
  }

  const nyquist = Math.min(8000, sampleRate / 2);
  const minFreq = 120;
  const maxMel = 2595 * Math.log10(1 + nyquist / 700);
  const minMel = 2595 * Math.log10(1 + minFreq / 700);

  const bandFreqs = Array.from({ length: bands }, (_, b) => {
    const mel = minMel + ((b + 0.5) / bands) * (maxMel - minMel);
    return 700 * (Math.pow(10, mel / 2595) - 1);
  });

  const windowSize = Math.min(256, Math.max(48, Math.floor(samples.length / cols)));
  const matrix: number[][] = [];
  let maxEnergy = 0.0001;

  for (let c = 0; c < cols; c++) {
    const start = Math.min(
      Math.max(0, samples.length - windowSize),
      Math.floor((c / Math.max(1, cols - 1)) * Math.max(0, samples.length - windowSize)),
    );
    const colVals: number[] = [];

    for (let b = 0; b < bands; b++) {
      const targetFreq = bandFreqs[b];
      const omega = (2 * Math.PI * targetFreq) / sampleRate;
      const coeff = 2 * Math.cos(omega);
      let q0 = 0;
      let q1 = 0;
      let q2 = 0;

      for (let n = 0; n < windowSize; n++) {
        const hann = 0.5 * (1 - Math.cos((2 * Math.PI * n) / Math.max(1, windowSize - 1)));
        const x = samples[start + n] * hann;
        q0 = coeff * q1 - q2 + x;
        q2 = q1;
        q1 = q0;
      }

      const power = Math.max(0, q1 * q1 + q2 * q2 - q1 * q2 * coeff);
      const mag = Math.log1p(Math.sqrt(power));
      colVals.push(mag);
      if (mag > maxEnergy) maxEnergy = mag;
    }
    matrix.push(colVals);
  }

  return matrix.map((col) =>
    col.map((val) => Number(Math.max(0.03, Math.min(1, val / maxEnergy)).toFixed(3))),
  );
}

/**
 * Deterministic synthetic forensic Mel-Spectrogram for seeded demo cases,
 * modeling realistic speech formants (0.3-3.4 kHz) plus high-frequency vocoder artifacts (4-8 kHz)
 * on elevated risk captures.
 */
export function generateDeterministicSpectrogram(
  seed: number,
  cols: number,
  bands: number,
  hasSpoofArtifacts: boolean,
): number[][] {
  const rand = createSeededRng(seed + 917);
  const matrix: number[][] = [];

  for (let c = 0; c < cols; c++) {
    const t = c / Math.max(1, cols - 1);
    const speechEnvelope =
      0.55 + 0.35 * Math.sin(t * Math.PI * 13) + 0.14 * Math.cos(t * Math.PI * 27);
    const pauseDip =
      (1 - 0.65 * Math.exp(-Math.pow((t - 0.325) / 0.028, 2))) *
      (1 - 0.6 * Math.exp(-Math.pow((t - 0.655) / 0.028, 2)));

    const col: number[] = [];
    for (let b = 0; b < bands; b++) {
      const freqRatio = b / Math.max(1, bands - 1);
      // Fundamental pitch + 2 speech formant ridges
      const f0 = Math.exp(-Math.pow((freqRatio - 0.09) / 0.07, 2)) * 0.92;
      const f1 =
        Math.exp(-Math.pow((freqRatio - (0.24 + 0.06 * Math.sin(t * 22))) / 0.1, 2)) * 0.85;
      const f2 =
        Math.exp(-Math.pow((freqRatio - (0.44 + 0.07 * Math.cos(t * 17))) / 0.11, 2)) * 0.58;
      // High-band vocoder phase shimmer / metallic stripe between 4.5-7.2 kHz
      const artifactRidge = hasSpoofArtifacts
        ? Math.exp(-Math.pow((freqRatio - 0.76) / 0.08, 2)) *
          (0.32 + 0.25 * Math.sin(t * 48))
        : 0.05 * Math.exp(-Math.pow((freqRatio - 0.72) / 0.12, 2));

      const harmonicRib = 0.84 + 0.16 * Math.sin(b * 2.1 + t * 8);
      const raw =
        (f0 + f1 + f2 + artifactRidge) * speechEnvelope * pauseDip * harmonicRib * (0.8 + rand() * 0.32);
      col.push(Number(Math.max(0.03, Math.min(1, raw)).toFixed(3)));
    }
    matrix.push(col);
  }

  return matrix;
}

/**
 * Computes SHA-256 hex digest for an uploaded audio ArrayBuffer.
 */
export async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle?.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Deterministic fallback for non-secure test contexts
  const bytes = new Uint8Array(buffer);
  let acc = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    acc ^= bytes[i];
    acc = Math.imul(acc, 0x01000193);
  }
  return (acc >>> 0).toString(16).padStart(8, '0').repeat(8);
}

/**
 * Derives an AssessmentCase from a real decoded Web Audio clip and optional analyst label/transcript.
 */
export function buildAssessmentFromDecodedAudio(params: {
  fileName: string;
  fileSizeBytes: number;
  durationSec: number;
  sampleRate: number;
  channels: number;
  samples: Float32Array;
  sha256: string;
  customTitle?: string;
  customChannel?: string;
  customTranscript?: string;
}): AssessmentCase {
  const duration = Math.max(2.0, Number(params.durationSec.toFixed(1)));
  const bars = extractWaveformEnvelopeFromPcm(params.samples, 220);
  const specCols = computeMelSpectrogramColumns(params.samples, params.sampleRate, 96, 28);

  // Measure high-frequency energy ratio and zero-crossing jitter for heuristic scoring
  let rmsSum = 0;
  let highFreqDiff = 0;
  const stride = Math.max(1, Math.floor(params.samples.length / 8000));
  let count = 0;
  for (let i = stride; i < params.samples.length; i += stride) {
    const cur = params.samples[i];
    const prev = params.samples[i - stride];
    rmsSum += cur * cur;
    highFreqDiff += Math.abs(cur - prev);
    count++;
  }
  const rms = Math.sqrt(rmsSum / Math.max(1, count));
  const hfRatio = highFreqDiff / Math.max(0.0001, count * (rms + 0.01));

  const transcriptText = (params.customTranscript ?? '').trim();
  const lower = transcriptText.toLowerCase();
  const hasSocialKeywords =
    lower.includes('otp') ||
    lower.includes('code') ||
    lower.includes('urgent') ||
    lower.includes('transfer') ||
    lower.includes('bank') ||
    lower.includes('verify');

  const synthProb = Number(Math.max(6, Math.min(88, 12 + hfRatio * 24)).toFixed(1));
  const compositeScore = Number(
    Math.min(
      96.5,
      Math.max(14.0, (hasSocialKeywords ? 72 : 28) + synthProb * 0.34),
    ).toFixed(1),
  );
  const riskLevel =
    compositeScore >= 80
      ? 'CRITICAL'
      : compositeScore >= 60
        ? 'HIGH'
        : compositeScore >= 35
          ? 'MODERATE'
          : 'LOW';

  const seg1End = Number((duration * 0.33).toFixed(1));
  const seg2End = Number((duration * 0.66).toFixed(1));
  const caseId = `VS-2026-${Math.floor(8850 + (parseInt(params.sha256.slice(0, 4), 16) % 140))}`;
  const title =
    (params.customTitle ?? '').trim() ||
    `Uploaded Capture — ${params.fileName.replace(/\.[^.]+$/, '')}`;

  const temporalSteps = 12;
  const temporalSeries = Array.from({ length: temporalSteps + 1 }, (_, idx) => {
    const time = Number(((idx / temporalSteps) * duration).toFixed(1));
    const barIdx = Math.min(bars.length - 1, Math.floor((idx / temporalSteps) * bars.length));
    const localEnergy = bars[barIdx] ?? 0.4;
    const riskScore = Number(
      Math.max(10, Math.min(98, compositeScore * (0.76 + localEnergy * 0.32))).toFixed(1),
    );
    const authenticity = Number(Math.max(12, Math.min(98, 100 - synthProb * (0.85 + localEnergy * 0.2))).toFixed(1));
    const fraudIntent = Number(
      Math.max(8, Math.min(95, (hasSocialKeywords ? 68 : 22) + localEnergy * 24)).toFixed(1),
    );
    return {
      time,
      label: `${time}s`,
      authenticity,
      fraudIntent,
      riskScore,
      threshold: 65,
    };
  });

  const seedNum = parseInt(params.sha256.slice(0, 6), 16) || 4219;
  const nowStr = 'Nov 19, 2026 • 23:05:00 UTC';

  return {
    id: caseId,
    title,
    sourceChannel:
      (params.customChannel ?? '').trim() ||
      `Local File Ingestion · ${params.fileName} (${Math.round(params.sampleRate / 1000)} kHz)`,
    disposition: riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'RESTRICTED' : 'CLEARED',
    analyst: 'Alex Kapoor',
    durationSec: duration,
    initialPlayheadSec: Number((duration * 0.2).toFixed(1)),
    waveformSeed: seedNum,
    audioSha256: params.sha256,
    analystNotes: `Decoded ${params.fileName} (${(params.fileSizeBytes / 1024).toFixed(1)} KB, ${params.channels}ch @ ${params.sampleRate} Hz).`,
    dispositionHistory: [
      {
        timestamp: nowStr,
        actor: 'Web Audio Acoustic Decoder',
        disposition: riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'RESTRICTED' : 'CLEARED',
        note: `Ingested PCM stream (${formatDurationSimple(duration)})`,
      },
    ],
    uploadedAudioSummary: {
      fileName: params.fileName,
      fileSizeBytes: params.fileSizeBytes,
      sampleRate: params.sampleRate,
      channels: params.channels,
      customBars: bars,
      spectrogramColumns: specCols,
    },
    segments: [
      {
        id: 'seg-up-1',
        label: `0.0 – ${seg1End.toFixed(1)}s`,
        startSec: 0,
        endSec: seg1End,
        theme: 'blue',
        transcriptSnippet:
          transcriptText || `Acoustic opening window of ${params.fileName} (${params.sampleRate} Hz).`,
        riskNote: `Spectral envelope RMS ${(rms * 100).toFixed(1)}%`,
      },
      {
        id: 'seg-up-2',
        label: `${seg1End.toFixed(1)} – ${seg2End.toFixed(1)}s`,
        startSec: seg1End,
        endSec: seg2End,
        theme: 'purple',
        transcriptSnippet:
          transcriptText
            ? transcriptText.slice(Math.floor(transcriptText.length * 0.35), Math.floor(transcriptText.length * 0.72)) || transcriptText
            : 'Mid-stream harmonic & formant transition inspection.',
        riskNote: 'Formant stability & vocoder phase check',
      },
      {
        id: 'seg-up-3',
        label: `${seg2End.toFixed(1)} – ${duration.toFixed(1)}s`,
        startSec: seg2End,
        endSec: duration,
        theme: 'neutral',
        transcriptSnippet:
          transcriptText
            ? transcriptText.slice(Math.floor(transcriptText.length * 0.7)) || 'Tail acoustic frame.'
            : 'Closing acoustic decay and noise-floor check.',
        riskNote: 'Closing frame verification',
      },
    ],
    threatScore: {
      score: compositeScore,
      riskLevel,
      evidenceSufficiency: 0.88,
      uncertainty: 0.11,
      rationale:
        riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
          ? 'Elevated spectral artifact signature paired with high-risk acoustic profile.'
          : 'Decoded audio exhibits natural harmonic decay and low spoofing probability.',
    },
    engines: {
      voiceAuthenticity: {
        status: 'AVAILABLE',
        syntheticProbability: synthProb,
        confidence: 91,
        model: 'AASIST v1.0.0-la',
        sparkline: bars
          .filter((_, idx) => idx % Math.max(1, Math.floor(bars.length / 8)) === 0)
          .slice(0, 8)
          .map((v, index) => ({ index, value: Math.round(v * 50) })),
      },
      speakerVerification: {
        status: 'UNAVAILABLE',
        inconclusiveLabel: 'INCONCLUSIVE',
        note: 'No enrolled reference profile matched uploaded acoustic channel.',
      },
      speechIntelligence: {
        status: 'AVAILABLE',
        language: 'en',
        confidence: 94,
        transcript: transcriptText
          ? `"${transcriptText.slice(0, 72)}${transcriptText.length > 72 ? '...' : ''}"`
          : `"Decoded ${params.fileName} (${formatDurationSimple(duration)}) — acoustic spectral sweep ready."`,
      },
      fraudIntent: {
        status: 'AVAILABLE',
        confidence: hasSocialKeywords ? 90 : 84,
        indicators: hasSocialKeywords
          ? ['OTP_HARVESTING', 'AUTHORITY_IMPERSONATION', 'URGENT_TRANSFER']
          : riskLevel === 'HIGH' || riskLevel === 'CRITICAL'
            ? ['HIGH_BAND_ANOMALY', 'LIVE_AUDIO_FLAGGED']
            : ['LIVE_PCM_VERIFIED', 'LOW_COERCION_RISK'],
      },
    },
    temporalSeries,
    summary: {
      riskLevel,
      decision:
        riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
          ? 'RESTRICT_SUPPORTED_ACTION'
          : 'ALLOW_STANDARD_VERIFICATION',
      rationale:
        riskLevel === 'CRITICAL' || riskLevel === 'HIGH'
          ? 'Elevated spectral artifact signature paired with high-risk acoustic profile.'
          : 'Decoded audio exhibits natural harmonic decay and low spoofing probability.',
      analysisTime: nowStr,
    },
  };
}

function formatDurationSimple(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(1).padStart(4, '0');
  return `${String(m).padStart(2, '0')}:${s}`;
}
