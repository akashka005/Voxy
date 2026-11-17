# VoxSentinel API Reference

**Base URL:** `http://127.0.0.1:8000/api/v1`  
**Interactive Docs:** http://127.0.0.1:8000/docs

---

## Authentication

All endpoints accept an optional `X-API-Key` header. Configure the key via the `API_KEY` environment variable.

```
X-API-Key: your_api_key_here
```

---

## Endpoints

### GET /health

Returns application health, database connectivity, and real-time engine availability.

**Response:**
```json
{
  "status": "ok",
  "app_name": "VoxSentinel",
  "app_version": "0.1.0",
  "environment": "development",
  "timestamp": "2026-11-17T07:14:18Z",
  "database": "connected",
  "engines": {
    "authenticity": {
      "engine_name": "Authenticity / Anti-spoofing",
      "status": "UNAVAILABLE",
      "details": "Checkpoint not configured or disabled in settings",
      "limitations": ["Synthetic/converted speech only; replay detection not supported in MVP."]
    },
    "speech_intelligence": { "status": "UNAVAILABLE", "..." },
    "fraud_intelligence":  { "status": "UNAVAILABLE", "..." }
  }
}
```

---

### POST /analyze

Accepts audio upload, creates asynchronous threat assessment job.

**Request:** `multipart/form-data`
- `file` *(required)*: Audio file (WAV, FLAC recommended; MP3/M4A requires FFmpeg)
- `analysis_options` *(optional)*: JSON string
  ```json
  {
    "enable_authenticity": true,
    "enable_speech": true,
    "enable_fraud": true
  }
  ```

**Response (202 Accepted):**
```json
{
  "analysis_id": "3c75c698-d32f-498d-a537-b1cb68249fcb",
  "status": "QUEUED",
  "created_at": "2026-11-17T07:00:00Z",
  "message": "Audio received and queued for sequential threat assessment."
}
```

---

### GET /analysis/{analysis_id}

Polls analysis status and results. Poll until `status` is `COMPLETED` or `FAILED`.

**Response (200 OK):**
```json
{
  "analysis_id": "3c75c698-...",
  "status": "COMPLETED",
  "created_at": "...",
  "completed_at": "...",
  "overall_assessment": {
    "risk_level": "MEDIUM",
    "risk_score": 45.0,
    "confidence": 0.6,
    "uncertainty": 0.4,
    "evidence_sufficiency": 0.33,
    "decision": "MONITOR",
    "score_type": "UNCALIBRATED_HEURISTIC"
  },
  "authenticity": { "availability": "UNAVAILABLE", "score": null, "segments": [] },
  "speech_intelligence": { "availability": "UNAVAILABLE", "transcript": null },
  "fraud_intelligence": { "availability": "AVAILABLE", "categories": [], "evidence": [] },
  "evidence": [],
  "processing_time_ms": 42
}
```

**Job States:** `QUEUED → PROCESSING → COMPLETED` or `FAILED`  
**Engine States:** `AVAILABLE | UNAVAILABLE | FAILED | INCONCLUSIVE`

---

### GET /analysis/{analysis_id}/report

Returns full audit and evidence explanation report with metadata.

---

### GET /history

Lists past analyses with pagination.

**Query Parameters:**
- `page` (default: 1)
- `size` (default: 20, max: 100)

---

### DELETE /analysis/{analysis_id}

Deletes an analysis and all associated records (audio metadata, transcript, evidence items).

---

### POST /speakers/enroll

Creates a consented speaker profile for future verification (Phase 2).

**Body:**
```json
{
  "name": "Alice",
  "owner_id": "optional-owner-ref",
  "consent_recorded": true
}
```

> `consent_recorded` **must be `true`**. Without consent, enrollment returns HTTP 400.

---

### GET /speakers

Lists all speaker profiles.

---

### DELETE /speakers/{speaker_id}

Deletes a speaker profile and its biometric embedding reference.

---

### POST /sessions *(Phase 4 — 501)*

Returns HTTP 501 until live telephony integration is built.

---

## Decision Reference

| Decision | Meaning |
|---|---|
| `LOW_CONCERN` | No significant threat evidence from active engines |
| `MONITOR` | Incomplete or inconclusive evidence; insufficient modalities |
| `WARNING` | Suspicious signals detected |
| `REQUIRE_VERIFICATION` | Independent identity verification recommended |
| `RESTRICT_SUPPORTED_ACTION` | Hold automated action pending human verification |

> **Note:** All decisions are advisory recommendations. VoxSentinel does not autonomously terminate calls or block transactions.

---

## Score Interpretation

- **`risk_score`** (0–100): Uncalibrated heuristic composite threat score.
- **`confidence`** (0–1): Engine's self-certainty in its own output.
- **`uncertainty`** (0–1): Fusion engine estimate of how likely the overall assessment is wrong.
- **`evidence_sufficiency`** (0–1): Fraction of expected modalities that produced valid evidence.

**A missing engine output is missing evidence — not a zero-risk signal.**
