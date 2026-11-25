import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_REPORTS,
  INITIAL_SPEAKERS,
  PRIMARY_ASSESSMENT_CASE,
  SECONDARY_CASES,
} from '../data';
import {
  buildForensicExportPayload,
  computeFrequencyBarScale,
  computeGaugeArc,
  computeLogoTilt,
  computeOverviewMetrics,
  filterAnalyses,
  filterInvestigations,
  filterReports,
  filterSpeakers,
  findActiveSegment,
  findPeakRisk,
  formatDuration,
  generateWaveformBars,
  getLogoReactiveTheme,
} from './forensics';

test('generateWaveformBars produces deterministic bounded bars', () => {
  const first = generateWaveformBars(220, 4219);
  const second = generateWaveformBars(220, 4219);
  assert.equal(first.length, 220);
  assert.deepEqual(first, second);
  for (const amp of first) {
    assert.ok(amp >= 0.08 && amp <= 1.0, `Amplitude ${amp} out of bounds`);
  }
});

test('formatDuration formats seconds into MM:SS.d', () => {
  assert.equal(formatDuration(12.4), '00:12.4');
  assert.equal(formatDuration(4.0), '00:04.0');
  assert.equal(formatDuration(75.3), '01:15.3');
  assert.equal(formatDuration(-3), '00:00.0');
});

test('findActiveSegment matches time ranges cleanly including boundaries', () => {
  const segs = PRIMARY_ASSESSMENT_CASE.segments;
  assert.equal(findActiveSegment(0.0, segs)?.id, 'seg-1');
  assert.equal(findActiveSegment(3.9, segs)?.id, 'seg-1');
  assert.equal(findActiveSegment(4.0, segs)?.id, 'seg-2');
  assert.equal(findActiveSegment(8.0, segs)?.id, 'seg-3');
  assert.equal(findActiveSegment(12.4, segs)?.id, 'seg-3');
});

test('computeGaugeArc clamps score and places knob at end of arc', () => {
  const g92 = computeGaugeArc(92.4, 90, 90, 68);
  assert.equal(g92.clampedScore, 92.4);
  assert.ok(g92.trackPath.startsWith('M '));
  assert.ok(g92.activePath.startsWith('M '));
  assert.ok(g92.knob.x > 90);

  const gOver = computeGaugeArc(130, 90, 90, 68);
  assert.equal(gOver.clampedScore, 100);
});

test('findPeakRisk identifies 94.2 at 9.2s in primary case', () => {
  const peak = findPeakRisk(PRIMARY_ASSESSMENT_CASE.temporalSeries);
  assert.ok(peak);
  assert.equal(peak.riskScore, 94.2);
  assert.equal(peak.time, 9.2);
});

test('filterAnalyses finds matching cases by transcript or indicator', () => {
  const otpMatches = filterAnalyses(SECONDARY_CASES, 'OTP_HARVESTING');
  assert.equal(otpMatches.length, 1);
  assert.equal(otpMatches[0].id, 'VS-2026-8841');

  const treasuryMatches = filterAnalyses(SECONDARY_CASES, 'treasury');
  assert.equal(treasuryMatches.length, 1);
  assert.equal(treasuryMatches[0].id, 'VS-2026-8839');
});

test('filterInvestigations filters by risk level and query combined', () => {
  const criticalOnly = filterInvestigations(SECONDARY_CASES, '', 'CRITICAL');
  assert.equal(criticalOnly.length, 2);

  const highBank = filterInvestigations(SECONDARY_CASES, 'token', 'HIGH');
  assert.equal(highBank.length, 1);
  assert.equal(highBank[0].id, 'VS-2026-8828');
});

test('computeOverviewMetrics aggregates totals, average score, and restricted rate', () => {
  const metrics = computeOverviewMetrics(SECONDARY_CASES);
  assert.equal(metrics.totalCases, 5);
  assert.equal(metrics.criticalOrHighCount, 3);
  assert.equal(metrics.restrictedRatePct, 40);
  assert.ok(metrics.avgThreatScore > 50 && metrics.avgThreatScore < 65);
});

test('filterSpeakers and filterReports narrow records deterministically', () => {
  const watchlist = filterSpeakers(INITIAL_SPEAKERS, '', 'WATCHLIST');
  assert.equal(watchlist.length, 1);
  assert.equal(watchlist[0].id, 'SPK-1091');

  const signedReports = filterReports(INITIAL_REPORTS, 'Priya', true);
  assert.equal(signedReports.length, 1);
  assert.equal(signedReports[0].reportId, 'RPT-2026-0418');
});

test('buildForensicExportPayload produces valid JSON containing decision and peak risk', () => {
  const raw = buildForensicExportPayload(PRIMARY_ASSESSMENT_CASE);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.caseId, 'VS-2026-8841');
  assert.equal(parsed.decision, 'RESTRICT_SUPPORTED_ACTION');
  assert.equal(parsed.peakRiskPoint.riskScore, 94.2);
});

test('computeLogoTilt bounds 3D angles and glare coordinates', () => {
  const center = computeLogoTilt(0.5, 0.5, 12);
  assert.equal(center.rotateX, 0);
  assert.equal(center.rotateY, 0);
  assert.equal(center.glareX, 50);

  const topRight = computeLogoTilt(1.5, -0.5, 12);
  assert.equal(topRight.rotateX, 12);
  assert.equal(topRight.rotateY, 12);
  assert.equal(topRight.glareX, 85);
  assert.equal(topRight.glareY, 15);
});

test('getLogoReactiveTheme prioritizes active playback over alert standby', () => {
  assert.equal(getLogoReactiveTheme('CRITICAL', true).mode, 'active-playback');
  assert.equal(getLogoReactiveTheme('CRITICAL', false).mode, 'sentinel-alert');
  assert.equal(getLogoReactiveTheme('LOW', false).mode, 'standby');
});

test('computeFrequencyBarScale scales monotonically with volume and stays bounded', () => {
  const muted = computeFrequencyBarScale({
    baseAmplitude: 0.7,
    barIndex: 55,
    barCount: 220,
    volume: 0,
    isPlaying: false,
    playheadRatio: 0.25,
    phaseSec: 0,
  });
  const halfVol = computeFrequencyBarScale({
    baseAmplitude: 0.7,
    barIndex: 55,
    barCount: 220,
    volume: 0.5,
    isPlaying: false,
    playheadRatio: 0.25,
    phaseSec: 0,
  });
  const maxVol = computeFrequencyBarScale({
    baseAmplitude: 0.7,
    barIndex: 55,
    barCount: 220,
    volume: 1.0,
    isPlaying: false,
    playheadRatio: 0.25,
    phaseSec: 0,
  });

  assert.ok(muted.scaleY < halfVol.scaleY && halfVol.scaleY < maxVol.scaleY);
  assert.ok(muted.opacity < maxVol.opacity);
  assert.ok(muted.scaleY >= 0.14 && maxVol.scaleY <= 1.32);
});

test('computeFrequencyBarScale boosts bars near playhead and varies over phase while playing', () => {
  const atPlayhead = computeFrequencyBarScale({
    baseAmplitude: 0.65,
    barIndex: 110,
    barCount: 220,
    volume: 0.85,
    isPlaying: true,
    playheadRatio: 0.5,
    phaseSec: 1.2,
  });
  const farFromPlayhead = computeFrequencyBarScale({
    baseAmplitude: 0.65,
    barIndex: 10,
    barCount: 220,
    volume: 0.85,
    isPlaying: true,
    playheadRatio: 0.5,
    phaseSec: 1.2,
  });
  const laterPhase = computeFrequencyBarScale({
    baseAmplitude: 0.65,
    barIndex: 110,
    barCount: 220,
    volume: 0.85,
    isPlaying: true,
    playheadRatio: 0.5,
    phaseSec: 2.1,
  });

  assert.ok(atPlayhead.scaleY > farFromPlayhead.scaleY);
  assert.notEqual(atPlayhead.scaleY, laterPhase.scaleY);
  assert.ok(laterPhase.scaleY >= 0.14 && laterPhase.scaleY <= 1.32);
});
