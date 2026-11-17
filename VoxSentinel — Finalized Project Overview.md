# VoxSentinel — Finalized Project Overview

Nov 17, 2026 · @Ace

## Vision and positioning

VoxSentinel is a voice communication threat assessment system: it weighs independent evidence about a call or recording instead of returning one "fake or real" label. Tagline: **Detect. Verify. Protect.**

It answers four distinct questions, each by its own engine.

| Question | Engine | Output |
| --- | --- | --- |
| Is this voice authentic? | Authenticity (anti-spoofing) | Synthetic/spoof evidence per segment |
| Who does it resemble? | Speaker verification | Match, mismatch or inconclusive against a consented profile |
| What is being said? | ASR + fraud intent | Timestamped transcript, social-engineering categories |
| How trustworthy is the interaction? | Temporal analysis + risk fusion | Risk level, uncertainty, recommended action |

The engines stay independent because the evidence is independent: a cloned voice can pass a speaker check, a genuine speaker can run a scam, and an unfamiliar voice is not automatically malicious.

**What VoxSentinel is not:**

- It does not prove a speaker's real-world identity from voice similarity.
- It does not terminate calls or block transactions on its own; it recommends, and enforcement needs explicit integration and authorization.
- It does not present heuristic scores as calibrated probabilities.
- It does not claim live or telephony support before that support is built and tested.

## Architecture

The pipeline runs audio through preprocessing, four independent engines, temporal analysis, fusion and a decision stage.

&#91;embedded content: pipeline architecture · 4 engines, 4 downstream stages\]

Each engine reports its own status and evidence. Fusion treats a missing engine as missing evidence, and the decision stage only recommends an action; the long-job state machine is queued, processing, completed or failed.

## Tech stack and hardware strategy

The stack is chosen for a Windows 11 machine with Python 3.10.6, PyTorch 2.5.1 + CUDA 12.1 and an RTX 2050 with 4 GB VRAM, so CPU fallback is a first-class path.

| Layer | Choice | Note |
| --- | --- | --- |
| API | FastAPI, Uvicorn, Pydantic v2 | Typed, versioned `/api/v1` |
| Jobs | Thread/process executor with a state machine | Keeps blocking inference off the event loop |
| ML | PyTorch 2.5.1 (CUDA 12.1) | Per-engine device setting, CPU fallback |
| Audio | FFmpeg (on PATH), librosa, soundfile, torchaudio | M4A/MP3 decoding fails without FFmpeg |
| Anti-spoofing | AASIST with verified ASVspoof 2019 LA weights | SSL front-end variant (wav2vec2/XLS-R) as an upgrade if VRAM allows |
| Speaker verification | SpeechBrain ECAPA-TDNN | Phase 2 |
| ASR | faster-whisper, `small` or `base`, int8 on CPU by default | GPU optional; needs matching cuDNN/cuBLAS |
| Fraud intent | Rule-based baseline, then a Transformers classifier | Pluggable interface |
| Database | SQLAlchemy 2 + Alembic; SQLite first, PostgreSQL later | UUID keys |
| Later phases | Redis, Prometheus, Grafana, Docker Compose | Phase 5 only |
| Testing | Pytest, mocked engines in CI, GitHub Actions from Stage 1 | Real-checkpoint tests kept separate |

**Hardware rules:**

- Inference is sequential by default; parallel engine execution is an opt-in setting for larger machines.
- Models load lazily and unload after use, with at most one large model resident on the GPU.
- Prefer fp16 only after checking it does not change checkpoint behavior.
- No mandatory cloud inference or paid services.

## Backend modules

Every engine implements a common interface (load, infer, availability status, metadata, limitations) so models can be swapped without touching the pipeline.

### A. Audio ingestion and preprocessing

- Validate the real codec by decoding, never by filename or MIME type; reject corrupted or unsupported audio safely.
- Limits: 25 MB and 5 minutes by default, configurable through environment variables.
- Convert to mono 16 kHz, run VAD, and cut overlapping segments sized to the model window (AASIST takes about 4 s, 64,600 samples; start with 4 s windows and a 2 s hop).
- Keep timestamps on every segment; delete temporary files after processing; never pass uploaded filenames to a shell.

### B. Authenticity engine

- Abstract interface with separate model loading and inference; lazy loading; CPU or CUDA.
- Returns score, confidence, model id and version, segment-level evidence and limitations.
- Scope: synthetic and converted speech. Replay detection needs a PA-trained model and is a separate, later engine, not part of the MVP claim.
- If no verified checkpoint is available, the engine reports `unavailable`; it never substitutes a made-up prediction. Raw scores are uncalibrated until measured on our own evaluation data.

### C. Speaker verification engine

- ECAPA-TDNN embeddings, consent-based enrollment, configurable thresholds.
- Returns match, mismatch or inconclusive; short or poor audio gives inconclusive.
- Embeddings are biometric data: encrypted at rest, access-controlled, deletable.

### D. Speech intelligence engine

- faster-whisper transcription with timestamps, language and segment confidence where available.
- ASR confidence is never treated as evidence of authenticity.

### E. Fraud-intent engine

- Rule-based baseline for OTP and credential requests, urgent transfers, emergency pressure, secrecy, authority impersonation and attempts to bypass verification.
- Returns categories, transcript excerpts, timestamps, confidence and explanation; a pluggable classifier interface follows later.
- Fully independent of authenticity: a genuine voice can trigger it.

### F. Temporal trust analysis

- Tracks authenticity, speaker similarity, recording quality and suspicious content across consecutive segments and flags sudden changes with timestamps.
- Thresholds are configurable and tuned empirically; ordinary shifts in volume, emotion or background noise are not treated as cloning evidence.

### G. Uncertainty-aware risk fusion

- Starts as an interpretable weighted baseline that accounts for model confidence, audio quality, missing modalities, disagreement between engines and evidence sufficiency.
- A missing engine output is missing evidence, never a zero-risk score.
- Returns risk score (0-100), risk level, uncertainty, evidence sufficiency, contributing factors, disagreement and fusion version, labeled as an uncalibrated heuristic until calibrated.
- Built so a learned fusion model can replace the baseline.

### H. Decision engine

| Decision | Meaning |
| --- | --- |
| LOW\_CONCERN | No significant threat evidence |
| MONITOR | Incomplete or inconclusive evidence |
| WARNING | Suspicious signals detected |
| REQUIRE\_VERIFICATION | Independent identity verification recommended |
| RESTRICT\_SUPPORTED\_ACTION | A supported automated action should be held pending verification |

Thresholds are configurable. Decisions are recommendations with evidence, and separate synthetic-speech, speaker-mismatch, semantic-intent and missing-evidence findings.

## API design

The API is versioned under `/api/v1`, fully typed with Pydantic v2, and documented through generated OpenAPI. The MVP implements file analysis only; streaming and sessions are stubs that return 501 until they are built.

| Method | Endpoint | Function | Phase |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | Backend and engine availability | MVP |
| POST | `/api/v1/analyze` | Upload audio, create analysis job | MVP |
| GET | `/api/v1/analysis/{id}` | Status and result | MVP |
| GET | `/api/v1/analysis/{id}/report` | Full evidence report | MVP |
| GET | `/api/v1/history` | Analysis history | MVP |
| DELETE | `/api/v1/analysis/{id}` | Delete analysis | MVP |
| POST | `/api/v1/speakers/enroll` | Consent-based enrollment | Phase 2 |
| GET | `/api/v1/speakers` | List profiles | Phase 2 |
| DELETE | `/api/v1/speakers/{id}` | Delete profile | Phase 2 |
| WS | `/api/v1/stream/{session_id}` | Live analysis | Phase 4 |
| POST | `/api/v1/sessions` | Simulated-call session | Phase 4 |

**Analyze request** (multipart): `file`, optional `speaker_profile_id`, optional `analysis_options`.

**Analyze response fields:** `analysis_id`, `status`, `created_at`, `overall_assessment` (risk level, risk score 0-100, confidence 0-1, decision), `authenticity`, `speaker_verification`, `speech_intelligence`, `fraud_intelligence`, `temporal_analysis`, `evidence`, `limitations`, `processing_time_ms`.

**Contract rules:**

- Job states: QUEUED, PROCESSING, COMPLETED, FAILED; the frontend polls in the MVP.
- Every engine block carries an availability status (AVAILABLE, UNAVAILABLE, FAILED, INCONCLUSIVE), model metadata and limitations.
- Values come from real inference only; unavailable results are null with a status, never filled with placeholders.
- Confidence is a model's certainty in its own output; uncertainty is the fusion engine's estimate that the overall assessment could be wrong; evidence sufficiency is the share of expected evidence that was available and reliable.
- The MVP runs in single-user mode with an API key from the environment; no user-account system is built.

## Data model, privacy and security

Raw audio is not stored by default, and speaker embeddings are treated as sensitive biometric data.

| Table | Key fields |
| --- | --- |
| `analyses` | id, filename, status, risk\_score, risk\_level, created\_at |
| `audio_metadata` | analysis\_id, duration, sample\_rate, channels, codec |
| `authenticity_results` | analysis\_id, model, score, confidence, availability |
| `speaker_profiles` | id, owner\_id, consent\_status, encrypted\_embedding\_reference |
| `speaker_results` | analysis\_id, profile\_id, similarity, verification\_status |
| `transcripts` | analysis\_id, language, transcript, segments (subject to retention) |
| `fraud_results` | analysis\_id, categories, evidence |
| `risk_assessments` | analysis\_id, fusion\_version, score, uncertainty, decision |
| `evidence_items` | analysis\_id, category, timestamp, description, severity |
| `model_registry` | model\_name, version, checksum, configuration |

All tables use UUID keys, timestamps, indexes and foreign keys, with Alembic migrations.

**Privacy and security requirements:**

- Retention is opt-in; deletion endpoints remove analyses, transcripts and speaker profiles.
- Enrollment requires recorded consent; profiles are access-controlled and embeddings encrypted.
- Never log raw audio, credentials or sensitive transcript content by default.
- Validate file type, size and duration; use safe temporary files and no shell calls with uploaded filenames.
- Use the ORM for all queries, sanitize error responses, keep secrets in environment variables, and add CORS and rate-limit hooks.
- Document that voice recordings and voiceprints need appropriate consent and legal basis.

## Project structure

The layout keeps API, audio, engines and fusion logic in separate packages so each can be tested alone.

```
voxsentinel/
  backend/
    app/
      main.py
      core/            config.py, security.py, logging.py
      api/v1/          router.py, endpoints/ (health, analyze, history, speakers, reports)
      schemas/         analysis.py, authenticity.py, speaker.py, risk.py
      services/        audio_service.py, analysis_service.py, report_service.py, storage_service.py
      audio/           decoder.py, preprocessing.py, vad.py, segmentation.py
      engines/
        authenticity/  base.py, aasist.py, rawnet2.py
        speaker/       base.py, ecapa.py
        speech/        whisper.py
        fraud/         rules.py, classifier.py
      intelligence/    temporal_analyzer.py, uncertainty.py, fusion.py,
                       decision_engine.py, explanations.py
      db/              models.py, session.py, repositories/
      workers/         analysis_worker.py
    tests/
    scripts/           evaluation and dataset tools
    models/            checkpoints (git-ignored)
    requirements.txt, Dockerfile, .env.example
  experiments/         evaluation configs and results
  docs/                API, model setup, datasets, decisions
  docker-compose.yml
  .github/workflows/backend-ci.yml
  CLAUDE.md, README.md
```

## Research and evaluation plan

The research claim has to be demonstrated, not asserted: combining existing models is not novel by itself. Working title: *Beyond Deepfake Detection: An Uncertainty-Aware, Temporally Adaptive Framework for Voice Impersonation Threat Assessment.*

| Dataset | Purpose |
| --- | --- |
| ASVspoof 2019 (LA) | Anti-spoofing baseline and the checkpoint's training domain |
| ASVspoof 2021 | Generalization under channel and codec conditions |
| WaveFake | Vocoder-generated speech |
| In-the-Wild | Real-world deepfake generalization |
| LibriSpeech | ASR experiments |
| A speaker-verification set (for example VoxCeleb) | Speaker engine experiments |

**Stage 0 baseline.** Before building the API, run the chosen checkpoint on In-the-Wild and record EER. Pretrained anti-spoofing models often degrade sharply outside their training domain, and that result shapes every later decision.

**The gap to fill: a multimodal evaluation set.** No public dataset labels authenticity, speaker identity and scam intent together, so fusion cannot be evaluated without building one. Use a factorial design with consented voices:

- Authenticity: genuine speech or speech from several TTS and cloning systems.
- Intent: benign script or scripted social-engineering script.
- Speaker: enrolled speaker or a different speaker.

This lets the evaluation separate the cases the system must keep apart, such as a genuine speaker running a scam and a cloned voice reading a harmless script.

**Metrics:** EER, FAR, FRR, precision, recall, F1, ROC-AUC, calibration error, end-to-end latency, and robustness to noise, compression and replay.

**Ablations:** without temporal analysis, without uncertainty handling, without semantic analysis, without speaker verification, and baseline fusion versus averaging.

Report every number from real runs with the configuration that produced it.

## Roadmap

The work runs in five phases, and no phase starts until the previous gate is met with measured results.

&#91;embedded content: roadmap · 5 phases, 4 gates\]

The MVP (highlighted) is authenticity, transcription and fraud intelligence with SQLite storage and a reportable evidence trail. Speaker verification, temporal and uncertainty-aware research, and live analysis follow once the file pipeline is reliable.

## Coding-agent kit

The long spec is split in two so an agent does not drift: standing rules live in `CLAUDE.md`, and each stage gets its own short prompt.

### CLAUDE.md (standing rules)

```markdown
# VoxSentinel - standing rules

Project: voice trust verification and impersonation threat assessment backend.
Stack: Python 3.10, FastAPI, Pydantic v2, SQLAlchemy 2, PyTorch, SpeechBrain, faster-whisper.
Environment: Windows 11, PowerShell, RTX 2050 (4 GB VRAM). CPU fallback required.

## Rules
1. Never fabricate model outputs, metrics or checkpoints. If a model is unavailable,
   return status UNAVAILABLE. A missing output is missing evidence, never zero risk.
2. Typed code, Pydantic v2 schemas, stable versioned API contracts.
3. Every engine implements the common interface. Engines stay independent.
4. Sequential inference, lazy model loading, one large model on GPU at a time.
5. Raw audio and speaker embeddings are sensitive: no default retention, no logging.
6. Never trust filename or MIME type. No shell calls with uploaded filenames.
7. Do not describe heuristic scores as calibrated probabilities.
8. Do not claim a feature is done without running its tests.
9. Work one stage at a time. Inspect the repo first. Run tests after each stage.
10. Report each feature as: tested / implemented-unvalidated / partial / not started.
```

### Stage 0 prompt (baseline evaluation)

```markdown
Read CLAUDE.md. Do Stage 0 only: an evaluation script, no API.
1. Find a public AASIST checkpoint; verify source, license, architecture and the
   expected input length and preprocessing before using it.
2. Write scripts/eval_antispoof.py that loads it (CPU default, CUDA optional) and
   scores a dataset folder.
3. Run it on a small In-the-Wild subset and report EER with the exact config.
4. Report anything unverified. Do not invent results.
```

### Stage 1 prompt (backend foundation)

```markdown
Read CLAUDE.md. Do Stage 1 only: app skeleton, config from environment, structured
logging, Pydantic schemas with explicit enums and nullable fields, SQLAlchemy models
with SQLite, GET /api/v1/health listing engine availability, router, a Pytest
suite, and a GitHub Actions workflow that runs the tests. No ML code yet.
Show the PowerShell commands to install, run and test. Run the tests and report the
result before stopping.
```

Later stages reuse the same pattern: one stage, its verification commands, and an honest status report.

## Key risks and open decisions

The biggest risk is that the pretrained anti-spoofing model generalizes poorly, so Stage 0 comes before any API work.

| Risk | Why it matters | Mitigation |
| --- | --- | --- |
| Weak real-world anti-spoofing | LA-trained weights often degrade on unseen generators and channels | Stage 0 baseline on In-the-Wild; consider an SSL front-end variant |
| 4 GB VRAM | Several models cannot stay resident | Sequential inference, lazy load/unload, CPU int8 for ASR |
| No labeled fusion data | Uncertainty-aware fusion cannot be validated | Build the factorial evaluation set |
| Scope creep | Ten stages is a lot for one developer | MVP is authenticity, transcription and fraud intent; SQLite; no Redis or Grafana until Phase 5 |
| Biometric privacy | Voiceprints and recordings are sensitive | No default retention, consent records, deletion endpoints |
| Windows ML tooling | CUDA, cuDNN and FFmpeg setup problems | CPU-first defaults and documented setup steps |

**Open decisions:**

- Which AASIST checkpoint, once its license and preprocessing are verified.
- Whether to add an SSL-based anti-spoofing model after the Stage 0 result.
- Which TTS and cloning systems to use for the evaluation set, and who consents to supply voices.
- Whether replay detection is in scope for the research paper or deferred.
