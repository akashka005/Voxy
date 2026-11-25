export type EngineAvailability = 'AVAILABLE' | 'UNAVAILABLE';
export type TopEngineState = 'Available' | 'Degraded';
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
export type InvestigationDisposition = 'RESTRICTED' | 'ESCALATED' | 'CLEARED' | 'UNDER_REVIEW';
export type SpeakerStatus = 'VERIFIED' | 'WATCHLIST' | 'PENDING';

export interface TopEngineStatus {
  id: string;
  name: string;
  status: TopEngineState;
}

export interface AudioSegment {
  id: string;
  label: string;
  startSec: number;
  endSec: number;
  theme: 'blue' | 'purple' | 'neutral';
  transcriptSnippet: string;
  riskNote: string;
}

export interface TemporalDataPoint {
  time: number;
  label: string;
  authenticity: number;
  fraudIntent: number;
  riskScore: number;
  threshold: number;
}

export interface SparklinePoint {
  index: number;
  value: number;
}

export interface AssessmentCase {
  id: string;
  title: string;
  sourceChannel: string;
  disposition: InvestigationDisposition;
  analyst: string;
  durationSec: number;
  initialPlayheadSec: number;
  waveformSeed: number;
  segments: AudioSegment[];
  threatScore: {
    score: number;
    riskLevel: RiskLevel;
    evidenceSufficiency: number;
    uncertainty: number;
    rationale: string;
  };
  engines: {
    voiceAuthenticity: {
      status: EngineAvailability;
      syntheticProbability: number;
      confidence: number;
      model: string;
      sparkline: SparklinePoint[];
    };
    speakerVerification: {
      status: EngineAvailability;
      inconclusiveLabel: string;
      note: string;
      matchedSpeaker?: string;
      similarityScore?: number;
    };
    speechIntelligence: {
      status: EngineAvailability;
      language: string;
      confidence: number;
      transcript: string;
    };
    fraudIntent: {
      status: EngineAvailability;
      confidence: number;
      indicators: string[];
    };
  };
  temporalSeries: TemporalDataPoint[];
  summary: {
    riskLevel: RiskLevel;
    decision: string;
    rationale: string;
    analysisTime: string;
  };
  audioSha256?: string;
  analystNotes?: string;
  dispositionHistory?: {
    timestamp: string;
    actor: string;
    disposition: InvestigationDisposition;
    note?: string;
  }[];
  uploadedAudioSummary?: {
    fileName: string;
    fileSizeBytes: number;
    sampleRate: number;
    channels: number;
    customBars?: number[];
    spectrogramColumns?: number[][];
  };
}

export interface ForensicReportItem {
  reportId: string;
  caseId: string;
  title: string;
  riskLevel: RiskLevel;
  decision: string;
  generatedAt: string;
  author: string;
  sha256: string;
  sizeLabel: string;
  signed: boolean;
}

export interface EnrolledSpeaker {
  id: string;
  name: string;
  role: string;
  department: string;
  status: SpeakerStatus;
  embeddingVersion: string;
  similarityBaseline: number;
  sampleCount: number;
  lastVerified: string;
  voiceSeed: number;
}

export interface EngineTelemetryMetric {
  id: string;
  name: string;
  subtitle: string;
  status: TopEngineState;
  latencyMs: number;
  throughputRps: number;
  gpuUtilization: number;
  accuracyMetric: string;
  uptimePct: number;
  series: { tick: string; latency: number; load: number }[];
}

export const TOP_ENGINE_STATUSES: TopEngineStatus[] = [
  { id: 'aasist', name: 'AASIST', status: 'Available' },
  { id: 'whisper', name: 'Whisper', status: 'Available' },
  { id: 'fraud-engine', name: 'Fraud Engine', status: 'Degraded' },
  { id: 'ecapa-tdnn', name: 'ECAPA-TDNN', status: 'Available' },
];

export const SIDEBAR_SPARKLINE: SparklinePoint[] = [
  { index: 0, value: 28 },
  { index: 1, value: 42 },
  { index: 2, value: 35 },
  { index: 3, value: 48 },
  { index: 4, value: 64 },
  { index: 5, value: 52 },
  { index: 6, value: 38 },
  { index: 7, value: 46 },
  { index: 8, value: 68 },
  { index: 9, value: 54 },
  { index: 10, value: 40 },
];

export const PRIMARY_ASSESSMENT_CASE: AssessmentCase = {
  id: 'VS-2026-8841',
  title: 'Inbound Retail Banking Call #8841',
  sourceChannel: 'SIP Trunk · +1 (415) 555-0194',
  disposition: 'RESTRICTED',
  analyst: 'Alex Kapoor',
  durationSec: 12.4,
  initialPlayheadSec: 4.0,
  waveformSeed: 4219,
  segments: [
    {
      id: 'seg-1',
      label: '0.0 – 4.0s',
      startSec: 0.0,
      endSec: 4.0,
      theme: 'blue',
      transcriptSnippet: 'Hello this is Fraud Prevention from your bank.',
      riskNote: 'Authority impersonation opener detected',
    },
    {
      id: 'seg-2',
      label: '4.0 – 8.0s',
      startSec: 4.0,
      endSec: 8.0,
      theme: 'purple',
      transcriptSnippet: 'We need your one-time verification code immediately.',
      riskNote: 'OTP harvesting & urgency trigger',
    },
    {
      id: 'seg-3',
      label: '8.0 – 12.4s',
      startSec: 8.0,
      endSec: 12.4,
      theme: 'neutral',
      transcriptSnippet: 'Please authorize the urgent security transfer now.',
      riskNote: 'Peak composite risk window (94.2)',
    },
  ],
  threatScore: {
    score: 92.4,
    riskLevel: 'CRITICAL',
    evidenceSufficiency: 0.85,
    uncertainty: 0.12,
    rationale: 'High-confidence social engineering indicators detected.',
  },
  engines: {
    voiceAuthenticity: {
      status: 'AVAILABLE',
      syntheticProbability: 15.0,
      confidence: 88,
      model: 'AASIST v1.0.0-la',
      sparkline: [
        { index: 0, value: 14 },
        { index: 1, value: 22 },
        { index: 2, value: 36 },
        { index: 3, value: 32 },
        { index: 4, value: 39 },
        { index: 5, value: 41 },
        { index: 6, value: 33 },
        { index: 7, value: 29 },
      ],
    },
    speakerVerification: {
      status: 'UNAVAILABLE',
      inconclusiveLabel: 'INCONCLUSIVE',
      note: 'ECAPA-TDNN embedding inference not available.',
    },
    speechIntelligence: {
      status: 'AVAILABLE',
      language: 'en',
      confidence: 94,
      transcript: '"Hello this is Fraud Prevention from your bank. We need your..."',
    },
    fraudIntent: {
      status: 'AVAILABLE',
      confidence: 92,
      indicators: [
        'OTP_HARVESTING',
        'AUTHORITY_IMPERSONATION',
        'URGENT_TRANSFER',
      ],
    },
  },
  temporalSeries: [
    { time: 0.0, label: '0s', authenticity: 65.0, fraudIntent: 45.0, riskScore: 76.0, threshold: 65 },
    { time: 0.5, label: '0.5s', authenticity: 67.5, fraudIntent: 51.0, riskScore: 80.5, threshold: 65 },
    { time: 1.0, label: '1s', authenticity: 71.0, fraudIntent: 58.0, riskScore: 84.0, threshold: 65 },
    { time: 1.5, label: '1.5s', authenticity: 74.5, fraudIntent: 67.0, riskScore: 89.0, threshold: 65 },
    { time: 2.0, label: '2s', authenticity: 83.0, fraudIntent: 76.0, riskScore: 93.0, threshold: 65 },
    { time: 2.5, label: '2.5s', authenticity: 82.0, fraudIntent: 78.0, riskScore: 92.2, threshold: 65 },
    { time: 3.0, label: '3s', authenticity: 84.0, fraudIntent: 73.5, riskScore: 91.5, threshold: 65 },
    { time: 3.5, label: '3.5s', authenticity: 83.5, fraudIntent: 69.0, riskScore: 92.0, threshold: 65 },
    { time: 4.0, label: '4s', authenticity: 82.0, fraudIntent: 67.0, riskScore: 92.5, threshold: 65 },
    { time: 4.5, label: '4.5s', authenticity: 83.0, fraudIntent: 67.5, riskScore: 93.0, threshold: 65 },
    { time: 5.0, label: '5s', authenticity: 84.5, fraudIntent: 69.5, riskScore: 93.5, threshold: 65 },
    { time: 5.5, label: '5.5s', authenticity: 85.0, fraudIntent: 72.0, riskScore: 93.8, threshold: 65 },
    { time: 6.0, label: '6s', authenticity: 86.0, fraudIntent: 74.0, riskScore: 94.0, threshold: 65 },
    { time: 6.5, label: '6.5s', authenticity: 84.5, fraudIntent: 72.5, riskScore: 91.0, threshold: 65 },
    { time: 7.0, label: '7s', authenticity: 86.0, fraudIntent: 70.5, riskScore: 89.2, threshold: 65 },
    { time: 7.5, label: '7.5s', authenticity: 85.0, fraudIntent: 69.0, riskScore: 88.5, threshold: 65 },
    { time: 8.0, label: '8s', authenticity: 86.5, fraudIntent: 70.0, riskScore: 91.0, threshold: 65 },
    { time: 8.5, label: '8.5s', authenticity: 87.2, fraudIntent: 72.0, riskScore: 93.1, threshold: 65 },
    { time: 9.2, label: '9.2s', authenticity: 88.0, fraudIntent: 73.5, riskScore: 94.2, threshold: 65 },
    { time: 9.8, label: '9.8s', authenticity: 85.5, fraudIntent: 69.5, riskScore: 90.5, threshold: 65 },
    { time: 10.4, label: '10.4s', authenticity: 84.0, fraudIntent: 67.0, riskScore: 88.4, threshold: 65 },
    { time: 11.0, label: '11s', authenticity: 86.0, fraudIntent: 68.5, riskScore: 90.2, threshold: 65 },
    { time: 11.5, label: '11.5s', authenticity: 87.2, fraudIntent: 71.0, riskScore: 93.2, threshold: 65 },
    { time: 12.0, label: '12s', authenticity: 88.0, fraudIntent: 74.0, riskScore: 94.0, threshold: 65 },
  ],
  summary: {
    riskLevel: 'CRITICAL',
    decision: 'RESTRICT_SUPPORTED_ACTION',
    rationale: 'High-confidence social engineering indicators detected.',
    analysisTime: 'Nov 17, 2026 • 07:45:04 UTC',
  },
  audioSha256: '8f4c19a2d7e041bc9028e64a12d4b0f9e2c18a77d5e9f012a4b6c8d1b319a4f8',
  analystNotes:
    'Caller attempted urgent OTP solicitation under spoofed Fraud Prevention pretext. Escalated for carrier SIP trace.',
  dispositionHistory: [
    {
      timestamp: 'Nov 17, 2026 • 07:45:42 UTC',
      actor: 'Alex Kapoor',
      disposition: 'RESTRICTED',
      note: 'Action restricted pending step-up callback verification',
    },
    {
      timestamp: 'Nov 17, 2026 • 07:45:04 UTC',
      actor: 'VoxSentinel Policy Engine',
      disposition: 'UNDER_REVIEW',
      note: 'Automated threshold breach (>85.0 composite risk)',
    },
  ],
};

export const SECONDARY_CASES: AssessmentCase[] = [];

export const INITIAL_REPORTS: ForensicReportItem[] = [];

export const INITIAL_SPEAKERS: EnrolledSpeaker[] = [];

export const INITIAL_ENGINE_TELEMETRY: EngineTelemetryMetric[] = [
  {
    id: 'aasist',
    name: 'AASIST',
    subtitle: 'Anti-Spoofing Neural Graph',
    status: 'Available',
    latencyMs: 42,
    throughputRps: 184,
    gpuUtilization: 48,
    accuracyMetric: '98.4% EER-AUC',
    uptimePct: 99.98,
    series: [
      { tick: '07:40', latency: 41, load: 44 },
      { tick: '07:41', latency: 44, load: 49 },
      { tick: '07:42', latency: 39, load: 46 },
      { tick: '07:43', latency: 43, load: 51 },
      { tick: '07:44', latency: 40, load: 47 },
      { tick: '07:45', latency: 42, load: 48 },
    ],
  },
  {
    id: 'whisper',
    name: 'Whisper',
    subtitle: 'Speech Intelligence (ASR)',
    status: 'Available',
    latencyMs: 118,
    throughputRps: 132,
    gpuUtilization: 62,
    accuracyMetric: '3.1% WER',
    uptimePct: 99.95,
    series: [
      { tick: '07:40', latency: 112, load: 58 },
      { tick: '07:41', latency: 121, load: 64 },
      { tick: '07:42', latency: 115, load: 60 },
      { tick: '07:43', latency: 124, load: 65 },
      { tick: '07:44', latency: 119, load: 61 },
      { tick: '07:45', latency: 118, load: 62 },
    ],
  },
  {
    id: 'fraud-engine',
    name: 'Fraud Engine',
    subtitle: 'Intent & Social Engineering Classifier',
    status: 'Degraded',
    latencyMs: 286,
    throughputRps: 74,
    gpuUtilization: 86,
    accuracyMetric: '94.1% F1',
    uptimePct: 98.42,
    series: [
      { tick: '07:40', latency: 190, load: 71 },
      { tick: '07:41', latency: 224, load: 77 },
      { tick: '07:42', latency: 258, load: 83 },
      { tick: '07:43', latency: 304, load: 89 },
      { tick: '07:44', latency: 292, load: 87 },
      { tick: '07:45', latency: 286, load: 86 },
    ],
  },
  {
    id: 'ecapa-tdnn',
    name: 'ECAPA-TDNN',
    subtitle: 'Speaker Embedding Inference',
    status: 'Available',
    latencyMs: 54,
    throughputRps: 162,
    gpuUtilization: 39,
    accuracyMetric: '0.82% EER',
    uptimePct: 99.91,
    series: [
      { tick: '07:40', latency: 52, load: 36 },
      { tick: '07:41', latency: 56, load: 41 },
      { tick: '07:42', latency: 53, load: 38 },
      { tick: '07:43', latency: 55, load: 40 },
      { tick: '07:44', latency: 51, load: 37 },
      { tick: '07:45', latency: 54, load: 39 },
    ],
  },
];

export interface NavItemConfig {
  path: string;
  label: string;
  iconName: 'home' | 'waveform' | 'history' | 'reports' | 'users' | 'telemetry';
}

export const SIDEBAR_NAV_ITEMS: NavItemConfig[] = [
  { path: '/overview', label: 'Overview', iconName: 'home' },
  { path: '/', label: 'Threat Assessment', iconName: 'waveform' },
];
