import test from 'node:test';
import assert from 'node:assert/strict';
import { PRIMARY_ASSESSMENT_CASE, INITIAL_REPORTS, INITIAL_SPEAKERS, SECONDARY_CASES } from '../data';
import {
  buildAssessmentFromDecodedAudio,
  computeMelSpectrogramColumns,
  computeSha256Hex,
  extractWaveformEnvelopeFromPcm,
  generateDeterministicSpectrogram,
} from './audioAnalyzer';
import { buildForensicExportPayload } from './forensics';
import {
  clearWorkspaceState,
  loadWorkspaceState,
  saveWorkspaceState,
  VOX_STORAGE_KEY,
} from './persistence';
import { filterCommandPaletteItems, type CommandPaletteItem } from './shortcuts';

test('extractWaveformEnvelopeFromPcm normalizes PCM samples into bounded bars', () => {
  const samples = new Float32Array(2200);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = i > 1100 ? Math.sin(i * 0.1) * 0.9 : Math.sin(i * 0.1) * 0.1;
  }
  const bars = extractWaveformEnvelopeFromPcm(samples, 110);
  assert.equal(bars.length, 110);
  assert.ok(bars.every((b) => b >= 0.08 && b <= 1.0));
  assert.ok(bars[90] > bars[15], 'louder second half should produce taller bars');
});

test('computeMelSpectrogramColumns and generateDeterministicSpectrogram produce bounded matrices', () => {
  const samples = new Float32Array(4000);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin((2 * Math.PI * 1000 * i) / 16000) * 0.7;
  }
  const realSpec = computeMelSpectrogramColumns(samples, 16000, 32, 16);
  assert.equal(realSpec.length, 32);
  assert.equal(realSpec[0].length, 16);
  assert.ok(realSpec.every((col) => col.every((v) => v >= 0 && v <= 1)));

  const synthSpec = generateDeterministicSpectrogram(4219, 48, 24, true);
  assert.equal(synthSpec.length, 48);
  assert.equal(synthSpec[0].length, 24);
  assert.ok(synthSpec.every((col) => col.every((v) => v >= 0.03 && v <= 1)));
});

test('computeSha256Hex returns deterministic 64-character hex digest', async () => {
  const buf = new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4]).buffer;
  const hash1 = await computeSha256Hex(buf);
  const hash2 = await computeSha256Hex(buf);
  assert.equal(hash1.length, 64);
  assert.equal(hash1, hash2);
  assert.match(hash1, /^[0-9a-f]{64}$/);
});

test('buildAssessmentFromDecodedAudio produces complete forensic case with spectrogram & SHA-256', () => {
  const samples = new Float32Array(16000 * 6);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin(i * 0.08) * 0.6;
  }
  const sha = 'a'.repeat(64);
  const built = buildAssessmentFromDecodedAudio({
    fileName: 'urgent-wire.wav',
    fileSizeBytes: 192044,
    durationSec: 6.0,
    sampleRate: 16000,
    channels: 1,
    samples,
    sha256: sha,
    customTitle: 'Wire Probe #991',
    customTranscript: 'Please verify your OTP code for an urgent transfer.',
  });

  assert.equal(built.title, 'Wire Probe #991');
  assert.equal(built.audioSha256, sha);
  assert.equal(built.durationSec, 6.0);
  assert.equal(built.segments.length, 3);
  assert.equal(built.uploadedAudioSummary?.customBars?.length, 220);
  assert.equal(built.uploadedAudioSummary?.spectrogramColumns?.length, 96);
  assert.ok(built.threatScore.score >= 70);
});

test('persistence round-trip saves and restores cases, dispositions, notes, reports, and speakers', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
  };

  const defaults = {
    cases: SECONDARY_CASES,
    activeCaseId: SECONDARY_CASES[0].id,
    reports: INITIAL_REPORTS,
    speakers: INITIAL_SPEAKERS,
  };

  const modifiedCases = SECONDARY_CASES.map((c, idx) =>
    idx === 0 ? { ...c, disposition: 'ESCALATED' as const, analystNotes: 'Verified spoof trace' } : c,
  );
  const saved = saveWorkspaceState(
    {
      cases: modifiedCases,
      activeCaseId: SECONDARY_CASES[1].id,
      reports: INITIAL_REPORTS.map((r) => ({ ...r, signed: true })),
      speakers: INITIAL_SPEAKERS,
    },
    mockStorage,
  );
  assert.equal(saved, true);

  const restored = loadWorkspaceState(defaults, mockStorage);
  assert.equal(restored.activeCaseId, SECONDARY_CASES[1].id);
  assert.equal(restored.cases[0].disposition, 'ESCALATED');
  assert.equal(restored.cases[0].analystNotes, 'Verified spoof trace');
  assert.ok(restored.reports.every((r) => r.signed === true));

  // Corrupt storage falls back cleanly to defaults
  mockStorage.setItem(VOX_STORAGE_KEY, '{not-valid-json');
  const recovered = loadWorkspaceState(defaults, mockStorage);
  assert.equal(recovered.activeCaseId, defaults.activeCaseId);

  clearWorkspaceState(mockStorage);
  assert.equal(store.has(VOX_STORAGE_KEY), false);
});

test('buildForensicExportPayload includes analystNotes, audioSha256, and dispositionHistory', () => {
  const json = buildForensicExportPayload({
    ...PRIMARY_ASSESSMENT_CASE,
    analystNotes: 'Escalated to fraud desk',
  });
  const parsed = JSON.parse(json) as Record<string, unknown>;
  assert.equal(parsed.analystNotes, 'Escalated to fraud desk');
  assert.equal(parsed.audioSha256, PRIMARY_ASSESSMENT_CASE.audioSha256);
  assert.ok(Array.isArray(parsed.dispositionHistory));
});

test('filterCommandPaletteItems matches across categories and multi-word queries', () => {
  const items: CommandPaletteItem[] = [
    {
      id: 'case-1',
      category: 'Cases',
      title: 'Inbound Retail Banking Call #8841',
      subtitle: 'VS-2026-8841 · SIP Trunk',
      badge: '92.4',
      keywords: 'critical otp',
    },
    {
      id: 'spk-1',
      category: 'Speakers',
      title: 'Maya Lin',
      subtitle: 'VP, Treasury Operations',
      badge: 'VERIFIED',
      keywords: 'ecapa',
    },
    {
      id: 'act-1',
      category: 'Actions',
      title: 'Export Active Report',
      subtitle: 'Download forensic JSON dossier',
      keywords: 'json download',
    },
  ];

  assert.equal(filterCommandPaletteItems(items, '').length, 3);
  assert.equal(filterCommandPaletteItems(items, 'maya treasury').length, 1);
  assert.equal(filterCommandPaletteItems(items, 'export json')[0].id, 'act-1');
});
