import type {
  AssessmentCase,
  AudioSegment,
  EnrolledSpeaker,
  ForensicReportItem,
  RiskLevel,
  SpeakerStatus,
  TemporalDataPoint,
} from '../data';

/**
 * Deterministic seeded PRNG (Mulberry32) so waveform bars render identically
 * across server/client/re-renders.
 */
export function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates deterministic mirrored waveform bar heights in [0.08, 1.0]
 * modulated by a realistic multi-syllable speech amplitude envelope.
 */
export function generateWaveformBars(count: number, seed: number): number[] {
  if (count <= 0) return [];
  const rand = createSeededRng(seed);
  const bars: number[] = [];

  for (let i = 0; i < count; i++) {
    const progress = i / Math.max(1, count - 1);
    const syllableWave =
      0.52 +
      0.28 * Math.sin(progress * Math.PI * 14) +
      0.16 * Math.cos(progress * Math.PI * 29);
    const boundaryDip1 = 1 - 0.55 * Math.exp(-Math.pow((progress - 0.325) / 0.028, 2));
    const boundaryDip2 = 1 - 0.5 * Math.exp(-Math.pow((progress - 0.655) / 0.028, 2));
    const edgeTaper = Math.min(1, progress * 14 + 0.18) * Math.min(1, (1 - progress) * 14 + 0.22);

    const jitter = 0.45 + rand() * 0.65;
    const raw = syllableWave * boundaryDip1 * boundaryDip2 * edgeTaper * jitter;
    const clamped = Math.max(0.08, Math.min(1.0, Number(raw.toFixed(4))));
    bars.push(clamped);
  }

  return bars;
}

export interface FrequencyBarScaleInput {
  baseAmplitude: number;
  barIndex: number;
  barCount: number;
  volume: number;
  isPlaying: boolean;
  playheadRatio: number;
  phaseSec: number;
}

/**
 * Computes frequency-reactive vertical scale and opacity for an individual
 * waveform bar, correlated directly with audio volume and playback phase.
 */
export function computeFrequencyBarScale({
  baseAmplitude,
  barIndex,
  barCount,
  volume,
  isPlaying,
  playheadRatio,
  phaseSec,
}: FrequencyBarScaleInput): { scaleY: number; opacity: number } {
  const safeVol = Math.max(0, Math.min(1, Number.isFinite(volume) ? volume : 0));
  const safeAmp = Math.max(0.08, Math.min(1, Number.isFinite(baseAmplitude) ? baseAmplitude : 0.5));
  const pos = barCount > 1 ? barIndex / (barCount - 1) : 0.5;

  // Volume baseline: 0.18 when muted -> ~0.95 at 0.75 -> 1.15 at 1.0
  const volumeFactor = 0.18 + Math.pow(safeVol, 0.82) * 0.97;

  if (!isPlaying || safeVol === 0) {
    const pausedScale = Math.max(0.14, Math.min(1.22, volumeFactor * (0.94 + safeAmp * 0.12)));
    const pausedOpacity = safeVol === 0 ? 0.42 : 0.62 + safeVol * 0.28;
    return {
      scaleY: Number(pausedScale.toFixed(4)),
      opacity: Number(pausedOpacity.toFixed(3)),
    };
  }

  // Multi-band frequency harmonic modulation (formant low, vocal mid, sibilance high)
  const lowBand = Math.sin(pos * 18 - phaseSec * 5.2);
  const midBand = Math.sin(pos * 43 + phaseSec * 9.4 + safeAmp * 4.0);
  const highBand = Math.cos(pos * 89 - phaseSec * 15.6 + barIndex * 0.37);
  const harmonicMix = 0.48 * lowBand + 0.34 * midBand + 0.18 * highBand;

  // Acoustic surge centered at the moving playhead
  const distFromHead = pos - Math.max(0, Math.min(1, playheadRatio));
  const playheadPulse = Math.exp(-Math.pow(distFromHead / 0.055, 2));

  const dynamicGain =
    1 +
    safeVol * (0.26 * harmonicMix * (0.55 + safeAmp * 0.7) + 0.32 * playheadPulse);

  const scaleY = Math.max(0.14, Math.min(1.32, volumeFactor * dynamicGain));
  const opacity = Math.min(1, 0.72 + safeVol * 0.18 + playheadPulse * 0.12);

  return {
    scaleY: Number(scaleY.toFixed(4)),
    opacity: Number(opacity.toFixed(3)),
  };
}

/**
 * Formats seconds as MM:SS.d (e.g. 12.4 -> "00:12.4").
 */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safe / 60);
  const secs = safe - mins * 60;
  const minsStr = String(mins).padStart(2, '0');
  const secsStr = secs.toFixed(1).padStart(4, '0');
  return `${minsStr}:${secsStr}`;
}

/**
 * Finds the audio segment covering a given timestamp in seconds.
 */
export function findActiveSegment(
  currentSec: number,
  segments: AudioSegment[],
): AudioSegment | null {
  if (segments.length === 0) return null;
  const match = segments.find(
    (seg, idx) =>
      currentSec >= seg.startSec &&
      (currentSec < seg.endSec || (idx === segments.length - 1 && currentSec <= seg.endSec)),
  );
  return match ?? segments[0];
}

export interface GaugePoint {
  x: number;
  y: number;
}

/**
 * Computes polar-to-cartesian coordinates for an SVG arc.
 * Angle 0° is 12 o'clock (top), increasing clockwise.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): GaugePoint {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: Number((cx + radius * Math.cos(angleRad)).toFixed(3)),
    y: Number((cy + radius * Math.sin(angleRad)).toFixed(3)),
  };
}

/**
 * Builds SVG arc path and active knob position for a 240° sweep gauge (-120° to +120°).
 */
export function computeGaugeArc(
  score: number,
  cx: number,
  cy: number,
  radius: number,
): {
  trackPath: string;
  activePath: string;
  knob: GaugePoint;
  clampedScore: number;
} {
  const clampedScore = Math.max(0, Math.min(100, score));
  const startAngle = -120;
  const totalSweep = 240;
  const endAngle = startAngle + totalSweep;
  const activeEndAngle = startAngle + (totalSweep * clampedScore) / 100;

  const describeArc = (fromDeg: number, toDeg: number): string => {
    const start = polarToCartesian(cx, cy, radius, fromDeg);
    const end = polarToCartesian(cx, cy, radius, toDeg);
    const largeArcFlag = toDeg - fromDeg <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const trackPath = describeArc(startAngle, endAngle);
  const activePath =
    clampedScore <= 0.1
      ? describeArc(startAngle, startAngle + 0.2)
      : describeArc(startAngle, activeEndAngle);
  const knob = polarToCartesian(cx, cy, radius, activeEndAngle);

  return { trackPath, activePath, knob, clampedScore };
}

/**
 * Finds the point with maximum riskScore in a temporal anomaly series.
 */
export function findPeakRisk(series: TemporalDataPoint[]): TemporalDataPoint | null {
  if (series.length === 0) return null;
  return series.reduce((peak, pt) => (pt.riskScore > peak.riskScore ? pt : peak), series[0]);
}

/**
 * Filters assessment cases by matching query against id, title, transcript,
 * indicators, rationale, or decision.
 */
export function filterAnalyses(cases: AssessmentCase[], query: string): AssessmentCase[] {
  const q = query.trim().toLowerCase();
  if (!q) return cases;
  return cases.filter((c) => {
    const haystack = [
      c.id,
      c.title,
      c.sourceChannel,
      c.analyst,
      c.threatScore.riskLevel,
      c.threatScore.rationale,
      c.engines.speechIntelligence.transcript,
      c.summary.decision,
      ...c.engines.fraudIntent.indicators,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * Filters investigation history cases by search query and risk level pill.
 */
export function filterInvestigations(
  cases: AssessmentCase[],
  query: string,
  riskFilter: RiskLevel | 'ALL',
): AssessmentCase[] {
  const byQuery = filterAnalyses(cases, query);
  if (riskFilter === 'ALL') return byQuery;
  return byQuery.filter((c) => c.threatScore.riskLevel === riskFilter);
}

/**
 * Derives live overview metrics from the active cases list.
 */
export function computeOverviewMetrics(cases: AssessmentCase[]): {
  totalCases: number;
  criticalOrHighCount: number;
  avgThreatScore: number;
  restrictedRatePct: number;
  distribution: { level: RiskLevel; count: number }[];
} {
  const totalCases = cases.length;
  if (totalCases === 0) {
    return {
      totalCases: 0,
      criticalOrHighCount: 0,
      avgThreatScore: 0,
      restrictedRatePct: 0,
      distribution: [
        { level: 'CRITICAL', count: 0 },
        { level: 'HIGH', count: 0 },
        { level: 'MODERATE', count: 0 },
        { level: 'LOW', count: 0 },
      ],
    };
  }

  const criticalOrHighCount = cases.filter(
    (c) => c.threatScore.riskLevel === 'CRITICAL' || c.threatScore.riskLevel === 'HIGH',
  ).length;
  const avgThreatScore = Number(
    (cases.reduce((sum, c) => sum + c.threatScore.score, 0) / totalCases).toFixed(1),
  );
  const restrictedCount = cases.filter(
    (c) => c.disposition === 'RESTRICTED' || c.disposition === 'ESCALATED',
  ).length;
  const restrictedRatePct = Math.round((restrictedCount / totalCases) * 100);

  const levels: RiskLevel[] = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
  const distribution = levels.map((level) => ({
    level,
    count: cases.filter((c) => c.threatScore.riskLevel === level).length,
  }));

  return {
    totalCases,
    criticalOrHighCount,
    avgThreatScore,
    restrictedRatePct,
    distribution,
  };
}

/**
 * Filters enrolled speaker registry by query and status filter.
 */
export function filterSpeakers(
  speakers: EnrolledSpeaker[],
  query: string,
  statusFilter: SpeakerStatus | 'ALL',
): EnrolledSpeaker[] {
  const q = query.trim().toLowerCase();
  return speakers.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (!q) return true;
    const haystack = `${s.id} ${s.name} ${s.role} ${s.department} ${s.status}`.toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * Filters forensic reports by query and signature filter.
 */
export function filterReports(
  reports: ForensicReportItem[],
  query: string,
  signedOnly: boolean,
): ForensicReportItem[] {
  const q = query.trim().toLowerCase();
  return reports.filter((r) => {
    if (signedOnly && !r.signed) return false;
    if (!q) return true;
    const haystack = `${r.reportId} ${r.caseId} ${r.title} ${r.decision} ${r.author}`.toLowerCase();
    return haystack.includes(q);
  });
}

/**
 * Builds a structured forensic export JSON object for download.
 */
export function buildForensicExportPayload(assessment: AssessmentCase): string {
  const peak = findPeakRisk(assessment.temporalSeries);
  return JSON.stringify(
    {
      platform: 'VoxSentinel Forensic Intelligence',
      version: '1.0.0',
      caseId: assessment.id,
      title: assessment.title,
      sourceChannel: assessment.sourceChannel,
      disposition: assessment.disposition,
      analyst: assessment.analyst,
      audioSha256: assessment.audioSha256 ?? null,
      durationFormatted: formatDuration(assessment.durationSec),
      threatScore: assessment.threatScore.score,
      riskLevel: assessment.summary.riskLevel,
      decision: assessment.summary.decision,
      rationale: assessment.summary.rationale,
      analystNotes: assessment.analystNotes ?? '',
      dispositionHistory: assessment.dispositionHistory ?? [],
      analysisTime: assessment.summary.analysisTime,
      peakRiskPoint: peak ? { timeSec: peak.time, riskScore: peak.riskScore } : null,
      engines: assessment.engines,
      segments: assessment.segments,
    },
    null,
    2,
  );
}

/**
 * Computes bounded 3D perspective tilt and specular glare coordinates
 * from normalized pointer coordinates relX, relY in [0, 1].
 */
export function computeLogoTilt(
  relX: number,
  relY: number,
  maxTiltDeg = 12,
): { rotateX: number; rotateY: number; glareX: number; glareY: number } {
  const cx = Math.max(0, Math.min(1, Number.isFinite(relX) ? relX : 0.5));
  const cy = Math.max(0, Math.min(1, Number.isFinite(relY) ? relY : 0.5));
  const dx = cx - 0.5;
  const dy = cy - 0.5;

  return {
    rotateX: Number((-dy * 2 * maxTiltDeg).toFixed(2)),
    rotateY: Number((dx * 2 * maxTiltDeg).toFixed(2)),
    glareX: Number((15 + cx * 70).toFixed(1)),
    glareY: Number((15 + cy * 70).toFixed(1)),
  };
}

export type LogoReactiveMode = 'standby' | 'active-playback' | 'sentinel-alert';

/**
 * Maps live risk level and audio playback state to logo reactive accents and mode.
 */
export function getLogoReactiveTheme(
  riskLevel: RiskLevel,
  isAudioPlaying: boolean,
): { mode: LogoReactiveMode; accentHex: string; ringHex: string } {
  if (isAudioPlaying) {
    return {
      mode: 'active-playback',
      accentHex: '#38BDF8',
      ringHex: '#14B89A',
    };
  }
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    return {
      mode: 'sentinel-alert',
      accentHex: '#60A5FA',
      ringHex: '#F43F5E',
    };
  }
  return {
    mode: 'standby',
    accentHex: '#38BDF8',
    ringHex: '#14B89A',
  };
}

