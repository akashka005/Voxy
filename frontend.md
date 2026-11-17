# VoxSentinel — Frontend UI Engineering Prompt & Specification

> **Tagline:** Detect. Verify. Protect.  
> **System:** Voice Communication Threat Assessment & Forensic Audio Intelligence  
> **Backend Integration:** Fast, typed REST API on `http://localhost:8000/api/v1`  
> **Version:** 1.0.0

---

## 1. Master Frontend UI Prompt (Copy & Paste Ready)

```markdown
You are a senior frontend architect specializing in cybersecurity, forensic intelligence, and mission-critical threat visualization interfaces (inspired by Palantir Foundry, CrowdStrike Falcon, and Datadog Security).

Your mission is to build the complete, production-grade frontend dashboard for **VoxSentinel** — an advanced voice communication threat assessment platform that answers four independent questions about audio recordings:
1. **Is this voice authentic?** (Anti-spoofing / synthetic voice cloning detection)
2. **Who does it resemble?** (Biometric speaker verification against consented profiles)
3. **What is being said?** (ASR transcription & timestamped semantic intent)
4. **How trustworthy is the interaction?** (Temporal analysis, uncertainty-aware risk fusion & security decision recommendations)

### Design Aesthetic & Theme
- **Theme:** High-density, professional Cyber-Forensics Dark Mode.
- **Palette:** Slate-950 background (`#020617`), Slate-900 card surfaces (`#0f172a`), subtle slate borders (`#1e293b`), with crisp cybernetic accents:
  - Cyan/Sky (`#06b6d4` / `#38bdf8`) for primary telemetry, audio timelines, and waveforms.
  - Emerald (`#10b981`) for `LOW_CONCERN` / Bonafide / Verified.
  - Amber (`#f59e0b`) for `MONITOR` / Inconclusive / Moderate Risk.
  - Orange/Rose (`#f97316` / `#f43f5e`) for `WARNING` / `REQUIRE_VERIFICATION`.
  - Crimson/Red (`#ef4444`) for `RESTRICT_SUPPORTED_ACTION` / Critical Fraud / Spoof Alert.
  - Violet/Purple (`#a855f7`) for AI/Engine metadata & uncertainty indicators.
- **Typography:** Inter or JetBrains Mono for metrics, timestamps, and confidence scores; clean sans-serif for prose.

---

### Key Product Principles (Non-Negotiable)
1. **Never a naive "Fake or Real" binary label:** Threat assessment combines 4 distinct orthogonal engines.
2. **Uncalibrated Heuristics Badge:** All risk scores (0–100) are uncalibrated baselines and MUST display a clear provenance pill: `UNCALIBRATED_HEURISTIC`.
3. **Missing Evidence ≠ Zero Risk:** If an engine is `UNAVAILABLE` (e.g. missing weights or disabled), render an amber `UNAVAILABLE` warning badge with its reported limitations — NEVER hide it or pretend it scored 0.
4. **Async Polling State Machine:** Analysis runs asynchronously in worker threads. UI must handle `QUEUED` -> `PROCESSING` -> `COMPLETED` / `FAILED` via polling every 1–2 seconds with clean skeleton loaders and progress steps.

---

### Core Views & Modules to Implement

#### 1. Threat Assessment Studio (Upload & Live Inspection)
- **Audio Ingestion Dropzone:** Drag-and-drop supporting WAV, FLAC, MP3, M4A up to 25 MB / 300s. Displays real-time file metadata (codec, sample rate, duration, channels).
- **Interactive Audio Waveform (via Wavesurfer.js):** 
  - Visual audio timeline with zoom, pan, and playback controls.
  - Color-coded regions for VAD (Voice Activity Detection) speech segments.
  - Segment-level hover cards showing anti-spoofing score for that 4.0s slice.
- **Threat Assessment Hero Card:**
  - Radial or semi-circular Threat Meter (0–100 score).
  - Prominent Decision Badge (`LOW_CONCERN`, `MONITOR`, `WARNING`, `REQUIRE_VERIFICATION`, `RESTRICT_SUPPORTED_ACTION`).
  - Evidence Sufficiency Gauge (`0.00 – 1.00`) and Fusion Uncertainty Bar.
  - Plain-language Security Rationale explaining *why* the decision was reached.
- **Multimodal Evidence Quadrant (4 Independent Engine Panels):**
  - **A. Authenticity (Anti-Spoofing):** Synthetic/cloned probability, model version, per-segment timeline breakdown, and known engine limitations.
  - **B. Speaker Verification:** Matched profile name, cosine similarity bar, threshold comparison, or `INCONCLUSIVE` badge if profile is unassigned.
  - **C. Speech Intelligence (ASR):** Full timestamped transcript with detected language and audio clarity confidence.
  - **D. Fraud Intent & Social Engineering:** Detected category chips (e.g., `OTP_HARVESTING`, `URGENT_TRANSFER`, `AUTHORITY_IMPERSONATION`), confidence score, and clickable transcript quotes that jump audio playback to that exact second.
- **Temporal Anomaly Graph:** Line chart showing segment-by-segment score fluctuations, marking abrupt shifts (>0.35 drop).

#### 2. Threat Intelligence History & Audit Log
- Paginated table of all past analyses (`GET /api/v1/history?skip=0&limit=20`).
- Columns: Audio Filename, Date/Time, Duration, Risk Level Badge, Score, Decision, Status, Actions.
- Quick Actions: "View Detailed Forensic Report", "Re-run Analysis", "Export PDF/JSON", "Delete Record".

#### 3. Forensic Evidence Report Modal / Dedicated Page
- Full dossier exportable to JSON or print-ready PDF (`GET /api/v1/analysis/{id}/report`).
- Detailed audit trail: input audio SHA-256 / metadata, engine version checksums, complete evidence items table, and legal disclaimer on biometric voiceprints.

#### 4. Speaker Profile Registry (Phase 2)
- Enrolled voice identity directory (`GET /api/v1/speakers`).
- Profile cards displaying owner ID, enrollment date, and mandatory "Recorded Consent" badge.
- "Enroll New Speaker" modal with explicit legal consent checkbox (`POST /api/v1/speakers/enroll`).

#### 5. System Status & Engine Telemetry Bar
- Live pulse indicator polling `GET /api/v1/health`.
- Status indicators for all 4 engines (AASIST Anti-spoofing, Whisper ASR, Fraud Classifier, ECAPA-TDNN Biometrics).
```

---

## 2. API Contract & Integration Reference

The frontend interacts with the backend via HTTP REST on `http://localhost:8000/api/v1` (or relative `/api/v1` if reverse-proxied).

### 2.1 Backend Health & Telemetry
```http
GET /api/v1/health
```
**Response (200 OK):**
```json
{
  "status": "healthy",
  "app_name": "VoxSentinel",
  "version": "1.0.0",
  "engines": {
    "authenticity_aasist": "UNAVAILABLE",
    "speech_whisper": "AVAILABLE",
    "fraud_rule_engine": "AVAILABLE",
    "speaker_ecapa": "UNAVAILABLE"
  }
}
```

### 2.2 Submit Audio for Threat Assessment
```http
POST /api/v1/analyze
Content-Type: multipart/form-data
```
**Form Fields:**
- `file`: Binary audio file (`audio/wav`, `audio/flac`, `audio/mp3`, `audio/m4a`). Max 25 MB / 300s.
- `analysis_options`: *(Optional JSON string)* e.g. `{"speaker_profile_id": "uuid-here"}`

**Response (202 Accepted):**
```json
{
  "analysis_id": "78b4a8e2-c430-4e0a-a035-7c5efbead9b2",
  "status": "QUEUED",
  "created_at": "2026-11-17T07:45:00Z",
  "message": "Audio received and queued for sequential threat assessment."
}
```

### 2.3 Poll Analysis Status & Result
```http
GET /api/v1/analysis/{analysis_id}
```
**Response States:**
- `status: "QUEUED"` — Job is waiting in worker thread pool.
- `status: "PROCESSING"` — Audio is decoding, preprocessing, or running inference.
- `status: "COMPLETED"` — Full threat report ready (see payload below).
- `status: "FAILED"` — Error occurred, check `error_message`.

**Completed Payload Example:**
```json
{
  "analysis_id": "78b4a8e2-c430-4e0a-a035-7c5efbead9b2",
  "filename": "suspicious_bank_call.wav",
  "status": "COMPLETED",
  "created_at": "2026-11-17T07:45:00Z",
  "completed_at": "2026-11-17T07:45:04Z",
  "overall_assessment": {
    "risk_score": 85.5,
    "risk_level": "CRITICAL",
    "decision": "RESTRICT_SUPPORTED_ACTION",
    "uncertainty": 0.12,
    "evidence_sufficiency": 0.85,
    "score_type": "UNCALIBRATED_HEURISTIC",
    "rationale": "High-confidence social engineering indicators detected alongside urgent financial credential requests."
  },
  "authenticity": {
    "availability": "AVAILABLE",
    "synthetic_probability": 0.15,
    "confidence": 0.88,
    "model_name": "AASIST",
    "model_version": "v1.0.0-la",
    "segments": [
      { "segment_index": 0, "start_time": 0.0, "end_time": 4.0, "score": 0.12 },
      { "segment_index": 1, "start_time": 2.0, "end_time": 6.0, "score": 0.18 }
    ],
    "limitations": ["Evaluated for logical access spoofing; does not assess acoustic replay attacks."]
  },
  "speaker_verification": {
    "availability": "UNAVAILABLE",
    "status": "INCONCLUSIVE",
    "similarity": null,
    "enrolled_profile_id": null,
    "limitations": ["ECAPA-TDNN embedding inference not implemented in Phase 1."]
  },
  "speech_intelligence": {
    "availability": "AVAILABLE",
    "model_id": "faster-whisper",
    "language": "en",
    "transcript": "Hello this is Fraud Prevention from your bank. We need your six digit one time password immediately to stop an unauthorized transfer.",
    "segments": [
      {
        "segment_index": 0,
        "start_time": 0.0,
        "end_time": 6.2,
        "text": "Hello this is Fraud Prevention from your bank. We need your six digit one time password immediately to stop an unauthorized transfer.",
        "confidence": 0.94
      }
    ],
    "limitations": ["Transcription confidence reflects acoustic clarity only; never evidence of authenticity."]
  },
  "fraud_intelligence": {
    "availability": "AVAILABLE",
    "fraud_detected": true,
    "confidence": 0.92,
    "categories": ["OTP_HARVESTING", "AUTHORITY_IMPERSONATION", "URGENT_TRANSFER"],
    "evidence": [
      {
        "category": "OTP_HARVESTING",
        "quote": "six digit one time password",
        "severity": "CRITICAL"
      },
      {
        "category": "AUTHORITY_IMPERSONATION",
        "quote": "Fraud Prevention from your bank",
        "severity": "HIGH"
      }
    ]
  },
  "temporal_analysis": {
    "abrupt_shifts_detected": false,
    "shift_count": 0,
    "max_score_delta": 0.06
  }
}
```

### 2.4 Historical Dossiers & Deletion
- `GET /api/v1/history?skip=0&limit=20` — Retrieve list of past jobs with pagination.
- `GET /api/v1/analysis/{analysis_id}/report` — Comprehensive forensic evidence audit report.
- `DELETE /api/v1/analysis/{analysis_id}` — Hard delete record, cascades and cleans up all associated tables.

### 2.5 Speaker Profiles (Biometrics)
- `GET /api/v1/speakers` — List enrolled profiles.
- `POST /api/v1/speakers/enroll` — Body: `{ "speaker_id": "spk_123", "owner_id": "user_456", "consent_recorded": true }`.
  *(Fails with `400 Bad Request` if `consent_recorded` is false)*
- `DELETE /api/v1/speakers/{speaker_id}` — Delete profile and wipe encrypted biometric records.

---

## 3. Recommended Frontend Tech Stack

| Tier | Technology | Purpose |
|---|---|---|
| **Framework** | **Next.js 14+ (App Router)** or **Vite + React 18** | High-performance SPA with client-side polling |
| **Language** | **TypeScript (Strict mode)** | Fully typed schema parity with Pydantic backend |
| **Styling** | **Tailwind CSS + Tailwind Animate** | High-density cyber-forensics dark mode |
| **Components** | **shadcn/ui + Radix UI** | Accessible, headless dialogs, tabs, progress, and tooltips |
| **Icons** | **Lucide React** | Consistent cyber/security iconography (`ShieldAlert`, `Waveform`, etc.) |
| **Audio Player** | **Wavesurfer.js (v7)** | Interactive timeline, waveform rendering, and region highlights |
| **Charts** | **Recharts** or **Tremor** | Temporal anomaly line graphs, threat radar, and uncertainty bars |
| **State & Polling**| **TanStack Query (React Query v5)** | Automatic exponential backoff polling for `status !== 'COMPLETED'` |

---

## 4. Polling Implementation Pattern (React Query)

```typescript
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export function useAnalysisPolling(analysisId: string | null) {
  return useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: async () => {
      const { data } = await axios.get(`/api/v1/analysis/${analysisId}`);
      return data;
    },
    enabled: !!analysisId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling once terminal state is reached
      if (status === 'COMPLETED' || status === 'FAILED') {
        return false;
      }
      return 1500; // Poll every 1.5 seconds while QUEUED or PROCESSING
    },
    refetchIntervalInBackground: true,
  });
}
```

---

## 5. Security & UI UX Guardrails
1. **Never mock or fabricate inference data in production:** If the backend says an engine is `UNAVAILABLE`, show an informative warning banner with a link to `docs/MODELS.md`.
2. **Audio scrubbing sync:** Clicking an evidence quote in the Fraud Intent panel should call `wavesurfer.seekTo(timestamp / totalDuration)` and trigger playback.
3. **Redaction by default:** Never display raw biometric vectors or unredacted user credentials in the UI.
4. **Rate limit awareness:** The backend limits `POST /analyze` to 10 requests/minute. Handle HTTP 429 gracefully with a countdown retry toast.
