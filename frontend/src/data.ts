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

export const SECONDARY_CASES: AssessmentCase[] = [
  PRIMARY_ASSESSMENT_CASE,
  {
    id: 'VS-2026-8839',
    title: 'Executive Wire Callback #8839',
    sourceChannel: 'WebRTC · Verified Client App',
    disposition: 'CLEARED',
    analyst: 'Alex Kapoor',
    durationSec: 12.0,
    initialPlayheadSec: 3.0,
    waveformSeed: 7312,
    segments: [
      {
        id: 'seg-b1',
        label: '0.0 – 4.0s',
        startSec: 0.0,
        endSec: 4.0,
        theme: 'blue',
        transcriptSnippet: 'Hi, this is Maya confirming our scheduled treasury settlement.',
        riskNote: 'Baseline acoustic profile matches enrolled speaker',
      },
      {
        id: 'seg-b2',
        label: '4.0 – 8.0s',
        startSec: 4.0,
        endSec: 8.0,
        theme: 'purple',
        transcriptSnippet: 'Reference ID is 4409-B as documented in the portal.',
        riskNote: 'No social engineering pressure markers',
      },
      {
        id: 'seg-b3',
        label: '8.0 – 12.0s',
        startSec: 8.0,
        endSec: 12.0,
        theme: 'neutral',
        transcriptSnippet: 'Let me know once compliance signs off on the invoice.',
        riskNote: 'Low composite threat score',
      },
    ],
    threatScore: {
      score: 18.6,
      riskLevel: 'LOW',
      evidenceSufficiency: 0.92,
      uncertainty: 0.06,
      rationale: 'Natural vocal tract harmonics with zero coercive fraud intent.',
    },
    engines: {
      voiceAuthenticity: {
        status: 'AVAILABLE',
        syntheticProbability: 4.2,
        confidence: 96,
        model: 'AASIST v1.0.0-la',
        sparkline: [
          { index: 0, value: 12 },
          { index: 1, value: 10 },
          { index: 2, value: 14 },
          { index: 3, value: 11 },
          { index: 4, value: 9 },
          { index: 5, value: 12 },
          { index: 6, value: 10 },
          { index: 7, value: 8 },
        ],
      },
      speakerVerification: {
        status: 'AVAILABLE',
        inconclusiveLabel: 'VERIFIED',
        note: 'ECAPA-TDNN cosine similarity 0.91 against enrolled voiceprint.',
        matchedSpeaker: 'Maya Lin (Treasury)',
        similarityScore: 0.91,
      },
      speechIntelligence: {
        status: 'AVAILABLE',
        language: 'en',
        confidence: 98,
        transcript: '"Hi, this is Maya confirming our scheduled treasury settlement..."',
      },
      fraudIntent: {
        status: 'AVAILABLE',
        confidence: 95,
        indicators: ['BENIGN_WORKFLOW', 'STANDARD_CALLBACK'],
      },
    },
    temporalSeries: [
      { time: 0.0, label: '0s', authenticity: 92, fraudIntent: 14, riskScore: 16, threshold: 65 },
      { time: 1.0, label: '1s', authenticity: 93, fraudIntent: 15, riskScore: 17, threshold: 65 },
      { time: 2.0, label: '2s', authenticity: 94, fraudIntent: 18, riskScore: 19, threshold: 65 },
      { time: 3.0, label: '3s', authenticity: 93, fraudIntent: 16, riskScore: 18, threshold: 65 },
      { time: 4.0, label: '4s', authenticity: 95, fraudIntent: 14, riskScore: 17, threshold: 65 },
      { time: 5.0, label: '5s', authenticity: 94, fraudIntent: 17, riskScore: 19, threshold: 65 },
      { time: 6.0, label: '6s', authenticity: 95, fraudIntent: 20, riskScore: 21.4, threshold: 65 },
      { time: 7.0, label: '7s', authenticity: 94, fraudIntent: 16, riskScore: 18, threshold: 65 },
      { time: 8.0, label: '8s', authenticity: 95, fraudIntent: 15, riskScore: 17, threshold: 65 },
      { time: 9.2, label: '9.2s', authenticity: 96, fraudIntent: 14, riskScore: 16.5, threshold: 65 },
      { time: 10.4, label: '10.4s', authenticity: 95, fraudIntent: 13, riskScore: 15.8, threshold: 65 },
      { time: 12.0, label: '12s', authenticity: 96, fraudIntent: 14, riskScore: 16.2, threshold: 65 },
    ],
    summary: {
      riskLevel: 'LOW',
      decision: 'ALLOW_STANDARD_VERIFICATION',
      rationale: 'Natural vocal tract harmonics with zero coercive fraud intent.',
      analysisTime: 'Nov 17, 2026 • 07:12:38 UTC',
    },
  },
  {
    id: 'VS-2026-8834',
    title: 'Synthetic Voice Clone Probe #8834',
    sourceChannel: 'PSTN Gateway · +44 20 7946 0821',
    disposition: 'ESCALATED',
    analyst: 'Priya Nair',
    durationSec: 12.4,
    initialPlayheadSec: 5.2,
    waveformSeed: 9103,
    segments: [
      {
        id: 'seg-c1',
        label: '0.0 – 4.0s',
        startSec: 0.0,
        endSec: 4.0,
        theme: 'blue',
        transcriptSnippet: 'I am authorizing an emergency vendor update right now.',
        riskNote: 'Vocoder phase artifact in 4–8 kHz band',
      },
      {
        id: 'seg-c2',
        label: '4.0 – 8.0s',
        startSec: 4.0,
        endSec: 8.0,
        theme: 'purple',
        transcriptSnippet: 'Bypass dual control and route funds to the new IBAN.',
        riskNote: 'Policy bypass directive flagged',
      },
      {
        id: 'seg-c3',
        label: '8.0 – 12.4s',
        startSec: 8.0,
        endSec: 12.4,
        theme: 'neutral',
        transcriptSnippet: 'Confirm once wired, I am boarding a flight.',
        riskNote: 'Availability pressure tactic',
      },
    ],
    threatScore: {
      score: 86.8,
      riskLevel: 'CRITICAL',
      evidenceSufficiency: 0.89,
      uncertainty: 0.09,
      rationale: 'High synthetic vocoder probability combined with policy bypass request.',
    },
    engines: {
      voiceAuthenticity: {
        status: 'AVAILABLE',
        syntheticProbability: 84.5,
        confidence: 93,
        model: 'AASIST v1.0.0-la',
        sparkline: [
          { index: 0, value: 62 },
          { index: 1, value: 74 },
          { index: 2, value: 82 },
          { index: 3, value: 88 },
          { index: 4, value: 85 },
          { index: 5, value: 90 },
          { index: 6, value: 86 },
          { index: 7, value: 84 },
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
        confidence: 91,
        transcript: '"Bypass dual control and route funds to the new IBAN..."',
      },
      fraudIntent: {
        status: 'AVAILABLE',
        confidence: 89,
        indicators: ['VOICE_CLONE_SUSPECT', 'POLICY_BYPASS', 'URGENT_TRANSFER'],
      },
    },
    temporalSeries: [
      { time: 0.0, label: '0s', authenticity: 38, fraudIntent: 58, riskScore: 69, threshold: 65 },
      { time: 2.0, label: '2s', authenticity: 31, fraudIntent: 72, riskScore: 79, threshold: 65 },
      { time: 4.0, label: '4s', authenticity: 25, fraudIntent: 81, riskScore: 85, threshold: 65 },
      { time: 6.0, label: '6s', authenticity: 22, fraudIntent: 86, riskScore: 88.5, threshold: 65 },
      { time: 8.0, label: '8s', authenticity: 20, fraudIntent: 84, riskScore: 87.2, threshold: 65 },
      { time: 9.2, label: '9.2s', authenticity: 19, fraudIntent: 88, riskScore: 90.4, threshold: 65 },
      { time: 11.0, label: '11s', authenticity: 21, fraudIntent: 82, riskScore: 85.8, threshold: 65 },
      { time: 12.0, label: '12s', authenticity: 23, fraudIntent: 80, riskScore: 84.9, threshold: 65 },
    ],
    summary: {
      riskLevel: 'CRITICAL',
      decision: 'BLOCK_AND_ESCALATE_SOC',
      rationale: 'High synthetic vocoder probability combined with policy bypass request.',
      analysisTime: 'Nov 17, 2026 • 06:58:19 UTC',
    },
  },
  {
    id: 'VS-2026-8828',
    title: 'Card Replacement Verification #8828',
    sourceChannel: 'SIP Trunk · +1 (312) 555-0177',
    disposition: 'UNDER_REVIEW',
    analyst: 'Alex Kapoor',
    durationSec: 12.0,
    initialPlayheadSec: 4.5,
    waveformSeed: 5518,
    segments: [
      {
        id: 'seg-d1',
        label: '0.0 – 4.0s',
        startSec: 0.0,
        endSec: 4.0,
        theme: 'blue',
        transcriptSnippet: 'Calling to update my billing address before card dispatch.',
        riskNote: 'Minor background codec compression artifacts',
      },
      {
        id: 'seg-d2',
        label: '4.0 – 8.0s',
        startSec: 4.0,
        endSec: 8.0,
        theme: 'purple',
        transcriptSnippet: 'Can you read back the last four digits on file?',
        riskNote: 'Information elicitation probe',
      },
      {
        id: 'seg-d3',
        label: '8.0 – 12.0s',
        startSec: 8.0,
        endSec: 12.0,
        theme: 'neutral',
        transcriptSnippet: 'I lost my security token earlier this morning.',
        riskNote: 'MFA reset trigger',
      },
    ],
    threatScore: {
      score: 68.2,
      riskLevel: 'HIGH',
      evidenceSufficiency: 0.78,
      uncertainty: 0.16,
      rationale: 'MFA reset attempt paired with elevated background noise masking.',
    },
    engines: {
      voiceAuthenticity: {
        status: 'AVAILABLE',
        syntheticProbability: 24.5,
        confidence: 84,
        model: 'AASIST v1.0.0-la',
        sparkline: [
          { index: 0, value: 18 },
          { index: 1, value: 24 },
          { index: 2, value: 29 },
          { index: 3, value: 27 },
          { index: 4, value: 31 },
          { index: 5, value: 26 },
          { index: 6, value: 22 },
          { index: 7, value: 25 },
        ],
      },
      speakerVerification: {
        status: 'AVAILABLE',
        inconclusiveLabel: 'MISMATCH',
        note: 'Cosine similarity 0.44 below 0.72 enrollment threshold.',
        matchedSpeaker: 'Devon Brooks (Unconfirmed)',
        similarityScore: 0.44,
      },
      speechIntelligence: {
        status: 'AVAILABLE',
        language: 'en',
        confidence: 92,
        transcript: '"I lost my security token earlier this morning..."',
      },
      fraudIntent: {
        status: 'AVAILABLE',
        confidence: 79,
        indicators: ['MFA_RESET_ATTEMPT', 'RECONNAISSANCE_PROBE'],
      },
    },
    temporalSeries: [
      { time: 0.0, label: '0s', authenticity: 78, fraudIntent: 42, riskScore: 54, threshold: 65 },
      { time: 2.0, label: '2s', authenticity: 76, fraudIntent: 50, riskScore: 59, threshold: 65 },
      { time: 4.0, label: '4s', authenticity: 74, fraudIntent: 61, riskScore: 66, threshold: 65 },
      { time: 6.0, label: '6s', authenticity: 72, fraudIntent: 69, riskScore: 71.5, threshold: 65 },
      { time: 8.0, label: '8s', authenticity: 75, fraudIntent: 67, riskScore: 69.8, threshold: 65 },
      { time: 9.2, label: '9.2s', authenticity: 74, fraudIntent: 72, riskScore: 73.4, threshold: 65 },
      { time: 11.0, label: '11s', authenticity: 76, fraudIntent: 65, riskScore: 68.1, threshold: 65 },
      { time: 12.0, label: '12s', authenticity: 77, fraudIntent: 63, riskScore: 67.2, threshold: 65 },
    ],
    summary: {
      riskLevel: 'HIGH',
      decision: 'STEP_UP_BIOMETRIC_CHALLENGE',
      rationale: 'MFA reset attempt paired with elevated background noise masking.',
      analysisTime: 'Nov 17, 2026 • 06:14:52 UTC',
    },
  },
  {
    id: 'VS-2026-8821',
    title: 'Institutional Custody Inquiry #8821',
    sourceChannel: 'Mobile VoIP · iOS Client v4.2',
    disposition: 'CLEARED',
    analyst: 'Elena Rostova',
    durationSec: 12.0,
    initialPlayheadSec: 2.0,
    waveformSeed: 3109,
    segments: [
      {
        id: 'seg-e1',
        label: '0.0 – 4.0s',
        startSec: 0.0,
        endSec: 4.0,
        theme: 'blue',
        transcriptSnippet: 'Good morning, checking settlement status for Batch 19.',
        riskNote: 'Clear acoustic signature',
      },
      {
        id: 'seg-e2',
        label: '4.0 – 8.0s',
        startSec: 4.0,
        endSec: 8.0,
        theme: 'purple',
        transcriptSnippet: 'No changes needed, just confirming the cutoff window.',
        riskNote: 'Zero urgency or credential request',
      },
      {
        id: 'seg-e3',
        label: '8.0 – 12.0s',
        startSec: 8.0,
        endSec: 12.0,
        theme: 'neutral',
        transcriptSnippet: 'Thanks, have a great rest of your Tuesday.',
        riskNote: 'Routine call wrap-up',
      },
    ],
    threatScore: {
      score: 12.4,
      riskLevel: 'LOW',
      evidenceSufficiency: 0.95,
      uncertainty: 0.04,
      rationale: 'High-confidence human voiceprint match and benign inquiry.',
    },
    engines: {
      voiceAuthenticity: {
        status: 'AVAILABLE',
        syntheticProbability: 2.1,
        confidence: 98,
        model: 'AASIST v1.0.0-la',
        sparkline: [
          { index: 0, value: 8 },
          { index: 1, value: 7 },
          { index: 2, value: 9 },
          { index: 3, value: 8 },
          { index: 4, value: 10 },
          { index: 5, value: 7 },
          { index: 6, value: 6 },
          { index: 7, value: 8 },
        ],
      },
      speakerVerification: {
        status: 'AVAILABLE',
        inconclusiveLabel: 'VERIFIED',
        note: 'ECAPA-TDNN cosine similarity 0.94 against enrolled voiceprint.',
        matchedSpeaker: 'Marcus Vance (CFO)',
        similarityScore: 0.94,
      },
      speechIntelligence: {
        status: 'AVAILABLE',
        language: 'en',
        confidence: 99,
        transcript: '"Good morning, checking settlement status for Batch 19..."',
      },
      fraudIntent: {
        status: 'AVAILABLE',
        confidence: 97,
        indicators: ['BENIGN_INQUIRY', 'VERIFIED_CHANNEL'],
      },
    },
    temporalSeries: [
      { time: 0.0, label: '0s', authenticity: 96, fraudIntent: 10, riskScore: 11, threshold: 65 },
      { time: 2.0, label: '2s', authenticity: 97, fraudIntent: 12, riskScore: 12, threshold: 65 },
      { time: 4.0, label: '4s', authenticity: 96, fraudIntent: 11, riskScore: 12.4, threshold: 65 },
      { time: 6.0, label: '6s', authenticity: 97, fraudIntent: 14, riskScore: 13.8, threshold: 65 },
      { time: 8.0, label: '8s', authenticity: 96, fraudIntent: 11, riskScore: 12, threshold: 65 },
      { time: 9.2, label: '9.2s', authenticity: 97, fraudIntent: 10, riskScore: 11.5, threshold: 65 },
      { time: 11.0, label: '11s', authenticity: 98, fraudIntent: 9, riskScore: 10.8, threshold: 65 },
      { time: 12.0, label: '12s', authenticity: 97, fraudIntent: 10, riskScore: 11.2, threshold: 65 },
    ],
    summary: {
      riskLevel: 'LOW',
      decision: 'ALLOW_STANDARD_VERIFICATION',
      rationale: 'High-confidence human voiceprint match and benign inquiry.',
      analysisTime: 'Nov 17, 2026 • 05:49:10 UTC',
    },
  },
];

export const INITIAL_REPORTS: ForensicReportItem[] = [
  {
    reportId: 'RPT-2026-0419',
    caseId: 'VS-2026-8841',
    title: 'Inbound Retail Banking Call #8841 — Incident Dossier',
    riskLevel: 'CRITICAL',
    decision: 'RESTRICT_SUPPORTED_ACTION',
    generatedAt: 'Nov 17, 2026 • 07:46:10 UTC',
    author: 'Alex Kapoor',
    sha256: '8f4c19a2d7e0...b319a4f8',
    sizeLabel: '1.8 MB · JSON + Spectrogram',
    signed: true,
  },
  {
    reportId: 'RPT-2026-0418',
    caseId: 'VS-2026-8834',
    title: 'Synthetic Voice Clone Probe #8834 — SOC Escalation Brief',
    riskLevel: 'CRITICAL',
    decision: 'BLOCK_AND_ESCALATE_SOC',
    generatedAt: 'Nov 17, 2026 • 07:02:44 UTC',
    author: 'Priya Nair',
    sha256: '3d91b7c4e120...f88102d1',
    sizeLabel: '2.4 MB · Evidentiary Bundle',
    signed: true,
  },
  {
    reportId: 'RPT-2026-0417',
    caseId: 'VS-2026-8828',
    title: 'Card Replacement Verification #8828 — Step-Up Audit',
    riskLevel: 'HIGH',
    decision: 'STEP_UP_BIOMETRIC_CHALLENGE',
    generatedAt: 'Nov 17, 2026 • 06:18:05 UTC',
    author: 'Alex Kapoor',
    sha256: 'a91e40f2c81b...7720cc4e',
    sizeLabel: '1.1 MB · JSON Summary',
    signed: false,
  },
  {
    reportId: 'RPT-2026-0416',
    caseId: 'VS-2026-8839',
    title: 'Executive Wire Callback #8839 — Verification Attestation',
    riskLevel: 'LOW',
    decision: 'ALLOW_STANDARD_VERIFICATION',
    generatedAt: 'Nov 17, 2026 • 07:15:20 UTC',
    author: 'Alex Kapoor',
    sha256: 'e720a18b49d2...91c4e08a',
    sizeLabel: '940 KB · Signed Attestation',
    signed: true,
  },
];

export const INITIAL_SPEAKERS: EnrolledSpeaker[] = [
  {
    id: 'SPK-1042',
    name: 'Maya Lin',
    role: 'VP, Treasury Operations',
    department: 'Corporate Treasury',
    status: 'VERIFIED',
    embeddingVersion: 'ECAPA-TDNN v2.4',
    similarityBaseline: 0.91,
    sampleCount: 14,
    lastVerified: 'Nov 17, 2026 • 07:12 UTC',
    voiceSeed: 2201,
  },
  {
    id: 'SPK-1038',
    name: 'Marcus Vance',
    role: 'Chief Financial Officer',
    department: 'Executive Office',
    status: 'VERIFIED',
    embeddingVersion: 'ECAPA-TDNN v2.4',
    similarityBaseline: 0.94,
    sampleCount: 22,
    lastVerified: 'Nov 17, 2026 • 05:49 UTC',
    voiceSeed: 4418,
  },
  {
    id: 'SPK-1091',
    name: 'Unknown Actor #A7',
    role: 'Suspected Social Engineer',
    department: 'Threat Watchlist',
    status: 'WATCHLIST',
    embeddingVersion: 'ECAPA-TDNN v2.4',
    similarityBaseline: 0.87,
    sampleCount: 6,
    lastVerified: 'Nov 17, 2026 • 07:45 UTC',
    voiceSeed: 8832,
  },
  {
    id: 'SPK-1055',
    name: 'Devon Brooks',
    role: 'Senior Wire Specialist',
    department: 'Settlement Desk',
    status: 'PENDING',
    embeddingVersion: 'ECAPA-TDNN v2.3',
    similarityBaseline: 0.76,
    sampleCount: 4,
    lastVerified: 'Nov 16, 2026 • 21:08 UTC',
    voiceSeed: 6190,
  },
  {
    id: 'SPK-1024',
    name: 'Elena Rostova',
    role: 'Director, Risk Operations',
    department: 'Fraud Prevention',
    status: 'VERIFIED',
    embeddingVersion: 'ECAPA-TDNN v2.4',
    similarityBaseline: 0.93,
    sampleCount: 18,
    lastVerified: 'Nov 17, 2026 • 04:30 UTC',
    voiceSeed: 1745,
  },
];

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
