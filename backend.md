# VoxSentinel --- Backend Engineering Specification

**Project:** VoxSentinel\
**Tagline:** Detect. Verify. Protect.\
**Document:** Complete backend scope, architecture, implementation plan,
contracts, research and verification requirements\
**Version:** 1.0\
**Date:** 17 November 2026

------------------------------------------------------------------------

## 1. Project definition

VoxSentinel is a voice communication threat assessment system. It
evaluates independent evidence about an audio recording or voice
interaction rather than returning a simplistic "fake or real" label.

It answers four separate questions:

1.  **Is this voice authentic?** Detect evidence of synthetic or
    converted speech.
2.  **Who does it resemble?** Compare the voice with a consented speaker
    profile.
3.  **What is being said?** Transcribe speech and identify potential
    social-engineering intent.
4.  **How trustworthy is the interaction?** Combine evidence over time,
    account for uncertainty and recommend a proportionate response.

The engines must remain independent. A cloned voice can resemble an
enrolled speaker; a genuine speaker can conduct a scam; an unfamiliar
voice is not automatically malicious.

### 1.1 Explicit product boundaries

VoxSentinel:

-   Does not prove a speaker's real-world identity from voice
    similarity.
-   Does not autonomously terminate calls or block transactions.
-   Does not present heuristic scores as calibrated probabilities.
-   Does not claim live microphone, VoIP or telephony support until
    implemented and tested.
-   Does not treat missing model output as evidence of safety.
-   Does not claim replay detection in the MVP; replay detection
    requires a separately trained and evaluated presentation-attack
    model.

### 1.2 MVP scope

The first working release is **offline audio-file analysis**. It
includes:

-   Audio upload, validation and preprocessing.
-   A verified anti-spoofing checkpoint, if one passes Stage 0
    verification.
-   Timestamped speech transcription.
-   Rule-based social-engineering analysis.
-   An explainable, explicitly uncalibrated baseline risk assessment.
-   SQLite persistence, analysis status, history and evidence reports.
-   Typed REST API and automated tests.

Speaker verification is Phase 2. Temporal and uncertainty-aware research
extensions follow the reliable file pipeline. Live streaming and
simulated calls are later phases.

------------------------------------------------------------------------

## 2. Architecture at a glance

``` text
Audio file
   |
   v
API / Upload Gateway
   |
   v
Validation and safe temporary storage
   |
   v
Decode -> mono/resample -> VAD -> timestamped segments
   |
   +--------------------+---------------------+---------------------+
   |                    |                     |                     |
   v                    v                     v                     v
Authenticity       Speaker verification   Speech / ASR        Fraud intent
engine             (Phase 2)               engine              engine
   |                    |                     |                     |
   +--------------------+---------------------+---------------------+
                             |
                             v
                    Temporal analysis
                       (later phase)
                             |
                             v
                 Uncertainty-aware risk fusion
                             |
                             v
                   Security decision engine
                             |
                             v
                Explanation and evidence report
                             |
                             v
                  Persistence and REST response
```

Each engine returns its own status, model metadata, evidence and
limitations. The orchestrator must not hide engine failures or
manufacture substitute predictions.

### 2.1 Analysis job state machine

``` text
QUEUED -> PROCESSING -> COMPLETED
                    \-> FAILED
```

The MVP uses status polling. Long-running inference must not block the
FastAPI event loop.

------------------------------------------------------------------------

## 3. Technology stack and runtime constraints

  -----------------------------------------------------------------------
  Layer                   Choice                  Implementation notes
  ----------------------- ----------------------- -----------------------
  API                     FastAPI, Uvicorn        Version all routes
                                                  under `/api/v1`

  Contracts               Pydantic v2             Explicit enums,
                                                  nullable fields and
                                                  validation

  Jobs                    Thread/process executor Keep blocking inference
                          and job state machine   off the event loop

  ML                      PyTorch 2.5.1           CUDA optional; CPU
                                                  fallback first-class

  Audio                   FFmpeg, librosa,        FFmpeg must be
                          soundfile, torchaudio   installed and available
                                                  on PATH for MP3/M4A
                                                  decoding

  Anti-spoofing           AASIST, verified        Verify exact
                          ASVspoof 2019 LA        architecture, weights,
                          checkpoint              license and
                                                  preprocessing

  Speaker verification    SpeechBrain ECAPA-TDNN  Phase 2

  ASR                     faster-whisper          CPU int8 default; GPU
                          small/base              optional

  Fraud intent            Rule-based baseline,    Separate from
                          later Transformers      authenticity
                          classifier              

  Database                SQLAlchemy 2, Alembic,  PostgreSQL can replace
                          SQLite first            SQLite later

  Cache / streaming       Redis                   Later phase only

  Observability           Prometheus, Grafana     Later phase only

  Testing                 Pytest, mocked engines  Real-checkpoint tests
                          in CI                   separate

  Packaging               Docker Compose          Production/deployment
                                                  phase
  -----------------------------------------------------------------------

### 3.1 Target development machine

-   Windows 11
-   Python 3.10.6
-   PyTorch 2.5.1 with CUDA 12.1 build
-   NVIDIA RTX 2050, 4 GB VRAM
-   CPU fallback required

### 3.2 Hardware rules

1.  Run inference sequentially by default. Parallel engine execution is
    an opt-in setting for larger machines.
2.  Load models lazily.
3.  Keep at most one large model resident on the GPU at a time.
4.  Unload models after use when practical.
5.  Use CPU int8 for ASR by default.
6.  Use fp16 only after validating checkpoint behavior and numerical
    stability.
7.  Never require paid cloud inference.

------------------------------------------------------------------------

## 4. Repository structure

Use this structure as the target. Implement it incrementally; do not
create empty modules just to imitate the tree.

``` text
voxsentinel/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── logging.py
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── router.py
│   │   │       └── endpoints/
│   │   │           ├── health.py
│   │   │           ├── analyze.py
│   │   │           ├── history.py
│   │   │           ├── speakers.py
│   │   │           └── reports.py
│   │   ├── schemas/
│   │   │   ├── common.py
│   │   │   ├── analysis.py
│   │   │   ├── authenticity.py
│   │   │   ├── speaker.py
│   │   │   ├── speech.py
│   │   │   ├── fraud.py
│   │   │   └── risk.py
│   │   ├── services/
│   │   │   ├── audio_service.py
│   │   │   ├── analysis_service.py
│   │   │   ├── report_service.py
│   │   │   └── storage_service.py
│   │   ├── audio/
│   │   │   ├── decoder.py
│   │   │   ├── preprocessing.py
│   │   │   ├── vad.py
│   │   │   └── segmentation.py
│   │   ├── engines/
│   │   │   ├── base.py
│   │   │   ├── authenticity/
│   │   │   │   ├── aasist.py
│   │   │   │   └── rawnet2.py
│   │   │   ├── speaker/
│   │   │   │   └── ecapa.py
│   │   │   ├── speech/
│   │   │   │   └── whisper.py
│   │   │   └── fraud/
│   │   │       ├── rules.py
│   │   │       └── classifier.py
│   │   ├── intelligence/
│   │   │   ├── temporal_analyzer.py
│   │   │   ├── uncertainty.py
│   │   │   ├── fusion.py
│   │   │   ├── decision_engine.py
│   │   │   └── explanations.py
│   │   ├── db/
│   │   │   ├── models.py
│   │   │   ├── session.py
│   │   │   └── repositories/
│   │   └── workers/
│   │       └── analysis_worker.py
│   ├── tests/
│   ├── scripts/
│   ├── models/                 # checkpoints; git-ignored
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── experiments/
│   ├── configs/
│   ├── results/
│   └── README.md
├── docs/
│   ├── API.md
│   ├── MODELS.md
│   ├── DATASETS.md
│   └── DECISIONS.md
├── .github/workflows/backend-ci.yml
├── docker-compose.yml
├── CLAUDE.md
└── README.md
```

------------------------------------------------------------------------

## 5. Common engine interface

All inference engines must implement the same lifecycle and result
contract. Keep model loading separate from inference.

Suggested conceptual interface:

``` python
from abc import ABC, abstractmethod
from typing import Any

class BaseEngine(ABC):
    engine_name: str

    @abstractmethod
    def load(self) -> None:
        """Load and validate model resources."""

    @abstractmethod
    def infer(self, payload: Any) -> Any:
        """Run inference and return a typed result."""

    @abstractmethod
    def availability(self) -> str:
        """Return AVAILABLE, UNAVAILABLE, FAILED or INCONCLUSIVE."""

    @abstractmethod
    def metadata(self) -> dict:
        """Return model name, version, device and checkpoint metadata."""

    @abstractmethod
    def limitations(self) -> list[str]:
        """Return known limitations for this result."""
```

Use concrete Pydantic result models rather than untyped dictionaries in
the finished implementation. The pseudocode above communicates the
interface shape; it is not a requirement to use `Any` in production
contracts.

Every engine result must distinguish:

-   `AVAILABLE`: valid inference completed.
-   `UNAVAILABLE`: model/checkpoint/dependency is not configured or
    cannot be loaded.
-   `FAILED`: inference attempted but failed.
-   `INCONCLUSIVE`: inference ran but evidence was insufficient for a
    defensible result.

A missing output is missing evidence, never a zero-risk score.

------------------------------------------------------------------------

## 6. Audio ingestion and preprocessing

### 6.1 Supported input

Initial formats:

-   WAV
-   MP3
-   FLAC
-   M4A, where installed FFmpeg supports the codec

Initial configurable defaults:

-   Maximum file size: 25 MB.
-   Maximum duration: 5 minutes.
-   Model input: mono, 16 kHz where the model requires it.

### 6.2 Validation

-   Validate the decoded audio, not only the extension or MIME type.
-   Reject malformed, empty, corrupted and unsupported audio.
-   Check actual duration, sample rate, channel count and codec.
-   Enforce upload limits before expensive inference.
-   Generate server-side temporary names; never use an uploaded filename
    in a shell command.
-   Use safe temporary directories and deterministic cleanup.
-   Do not expose local filesystem paths in API responses.

### 6.3 Processing sequence

1.  Receive upload into a controlled temporary location.
2.  Decode through a safe library/FFmpeg invocation.
3.  Inspect metadata and duration.
4.  Convert to the internal waveform representation.
5.  Convert to mono and resample as required.
6.  Run voice activity detection.
7.  Create overlapping, timestamped segments.
8.  Route segments to engines using each model's required sample rate
    and shape.
9.  Delete temporary audio after processing unless explicit retention is
    enabled.

For the initial AASIST configuration, begin with approximately 4-second
windows (about 64,600 samples at 16 kHz) and a 2-second hop, but confirm
the exact checkpoint's expected input length and preprocessing before
inference. Do not assume all AASIST variants share the same input
contract.

### 6.4 Segment schema

Each segment should retain:

-   Segment index.
-   Start and end time in seconds.
-   Sample rate.
-   Number of samples.
-   VAD speech/non-speech status.
-   Quality metadata where available.
-   Engine-specific results.

------------------------------------------------------------------------

## 7. Engine specifications

### 7.1 Authenticity / anti-spoofing engine --- MVP

**Primary candidate:** AASIST using a verified ASVspoof 2019 Logical
Access checkpoint. An SSL front-end variant such as wav2vec2/XLS-R is a
possible upgrade if memory and evaluation justify it.

Responsibilities:

-   Load a verified model checkpoint lazily.
-   Validate checkpoint provenance, license, architecture and expected
    preprocessing.
-   Run inference on timestamped segments.
-   Return raw model score, prediction, confidence if meaningfully
    defined, model ID/version and limitations.
-   Aggregate segment findings without hiding segment-level evidence.
-   Support CPU and optional CUDA.

Important boundaries:

-   MVP scope is synthetic and converted speech detection.
-   Replay/presentation-attack detection is a separate later engine
    requiring suitable PA-trained data and evaluation.
-   Raw model scores are uncalibrated until evaluated and calibrated on
    held-out data.
-   If no verified compatible checkpoint exists, return `UNAVAILABLE`;
    never generate a placeholder score.

### 7.2 Speaker verification engine --- Phase 2

**Candidate:** SpeechBrain ECAPA-TDNN.

Responsibilities:

-   Enroll voice samples only after explicit consent.
-   Extract speaker embeddings.
-   Compare incoming speech with a selected enrolled profile.
-   Apply configurable, empirically selected thresholds.
-   Return `MATCH`, `MISMATCH` or `INCONCLUSIVE`.
-   Return similarity and quality metadata.
-   Treat short, noisy or poor-quality samples as inconclusive.
-   Support profile revocation and deletion.

Voice embeddings are sensitive biometric data. Encrypt them at rest,
restrict access, document retention and provide deletion.

Voice similarity does not prove a person's real-world identity.

### 7.3 Speech intelligence / ASR --- MVP

**Candidate:** faster-whisper, initially small or base. CPU int8 is the
default; GPU is optional and requires compatible CUDA/cuDNN/cuBLAS
dependencies.

Responsibilities:

-   Produce timestamped transcription segments.
-   Identify language where supported.
-   Preserve segment timing.
-   Return confidence metadata only where the library/model actually
    provides it.
-   Handle unintelligible or low-quality speech.
-   Keep ASR confidence separate from authenticity evidence.

### 7.4 Fraud-intent engine --- MVP

Start with an explainable rule-based baseline. Later add a pluggable
Transformers classifier trained and evaluated on an appropriately
designed dataset.

Detect indicators such as:

-   OTP, password or credential requests.
-   Urgent financial transfer requests.
-   Emergency pressure or emotional manipulation.
-   Secrecy or isolation instructions.
-   Authority-impersonation indicators.
-   Attempts to bypass normal verification.

Return:

-   Category.
-   Supporting transcript excerpt.
-   Timestamp or segment reference.
-   Rule/classifier identifier.
-   Confidence or severity only when its meaning is defined.
-   Explanation and limitations.

This engine is independent of authenticity. A genuine human voice can
produce a high fraud-intent finding.

### 7.5 Temporal trust analysis --- research phase

Track evidence across consecutive segments:

-   Authenticity score changes.
-   Speaker similarity changes when speaker verification is enabled.
-   Recording-quality changes.
-   Appearance and progression of suspicious content.
-   Abrupt evidence shifts and contradictions.

Return timestamped findings and the evidence used. Tune thresholds
empirically. Ordinary changes in volume, emotion or background noise
must not automatically be treated as cloning evidence.

### 7.6 Uncertainty-aware risk fusion --- research phase

Start with a transparent weighted baseline, not an opaque learned model.

Inputs may include:

-   Authenticity evidence.
-   Speaker verification evidence, when available.
-   Fraud-intent evidence.
-   Audio quality.
-   Model confidence and calibration metadata.
-   Missing modalities.
-   Model disagreement.
-   Temporal consistency.
-   Evidence sufficiency.

Rules:

1.  Missing evidence is not zero risk.
2.  Do not average incompatible raw scores without a justified
    transformation.
3.  Do not call an uncalibrated heuristic score a probability.
4.  Preserve the contribution and reliability of each evidence source.
5.  Return uncertainty and evidence sufficiency separately from model
    confidence.
6.  Version every fusion configuration.

Required output:

-   Risk score, 0--100.
-   Risk level.
-   Uncertainty estimate.
-   Evidence sufficiency.
-   Contributing factors.
-   Engine disagreement.
-   Fusion version.
-   Calibration status.

A learned fusion model may replace the baseline only after an
appropriate labeled evaluation set exists.

### 7.7 Security decision engine

Supported recommendations:

  -----------------------------------------------------------------------
  Decision                            Meaning
  ----------------------------------- -----------------------------------
  `LOW_CONCERN`                       No significant threat evidence was
                                      detected by available engines

  `MONITOR`                           Evidence is incomplete, missing or
                                      inconclusive

  `WARNING`                           Suspicious signals were detected

  `REQUIRE_VERIFICATION`              Recommend independent identity
                                      verification

  `RESTRICT_SUPPORTED_ACTION`         Recommend holding a supported
                                      automated action pending
                                      verification
  -----------------------------------------------------------------------

The decision must include evidence and rationale. Keep separate findings
for synthetic speech, speaker mismatch, semantic intent and missing
evidence.

The backend recommends actions. It must not terminate calls or block
financial transactions without a separately authorized integration and
explicit safeguards.

------------------------------------------------------------------------

## 8. API specification

All routes are under `/api/v1`. FastAPI OpenAPI documentation must
reflect the real request and response schemas.

### 8.1 MVP routes

  -----------------------------------------------------------------------------------------
  Method                  Route                                     Purpose
  ----------------------- ----------------------------------------- -----------------------
  GET                     `/api/v1/health`                          Backend and engine
                                                                    availability

  POST                    `/api/v1/analyze`                         Upload audio and create
                                                                    an analysis job

  GET                     `/api/v1/analysis/{analysis_id}`          Retrieve status and
                                                                    result

  GET                     `/api/v1/analysis/{analysis_id}/report`   Retrieve full evidence
                                                                    report

  GET                     `/api/v1/history`                         List analysis history

  DELETE                  `/api/v1/analysis/{analysis_id}`          Delete analysis and
                                                                    retained related data
  -----------------------------------------------------------------------------------------

### 8.2 Phase 2 routes

  ---------------------------------------------------------------------------------
  Method                  Route                             Purpose
  ----------------------- --------------------------------- -----------------------
  POST                    `/api/v1/speakers/enroll`         Consent-based profile
                                                            enrollment

  GET                     `/api/v1/speakers`                List accessible
                                                            profiles

  DELETE                  `/api/v1/speakers/{speaker_id}`   Delete a profile and
                                                            embedding
  ---------------------------------------------------------------------------------

### 8.3 Later live-analysis routes

  Method   Route                           Purpose
  -------- ------------------------------- ---------------------------------
  WS       `/api/v1/stream/{session_id}`   Incremental live audio analysis
  POST     `/api/v1/sessions`              Create a simulated-call session

Until implemented, streaming and session routes may return HTTP 501 with
an explicit not-implemented response. Do not make a stub look like
working functionality.

### 8.4 Analyze request

`POST /api/v1/analyze` uses multipart form data:

-   `file`: required audio file.
-   `speaker_profile_id`: optional profile identifier; relevant when
    speaker verification is implemented.
-   `analysis_options`: optional validated JSON configuration.

The endpoint should validate and register a job, then return an analysis
ID and current state. Do not run lengthy model inference directly on the
async request event loop.

### 8.5 Analysis response contract

Illustrative shape only; actual values must come from real engine
execution.

``` json
{
  "analysis_id": "uuid",
  "status": "COMPLETED",
  "created_at": "2026-11-17T12:00:00Z",
  "overall_assessment": {
    "risk_level": "HIGH",
    "risk_score": 82,
    "confidence": null,
    "uncertainty": null,
    "evidence_sufficiency": null,
    "decision": "REQUIRE_VERIFICATION",
    "score_type": "UNCALIBRATED_HEURISTIC"
  },
  "authenticity": {
    "availability": "AVAILABLE",
    "model_id": "aasist",
    "model_version": "verified-version",
    "segments": [],
    "limitations": []
  },
  "speaker_verification": {
    "availability": "UNAVAILABLE",
    "status": "INCONCLUSIVE",
    "similarity": null,
    "limitations": ["Speaker verification is not enabled in this phase."]
  },
  "speech_intelligence": {
    "availability": "AVAILABLE",
    "language": "en",
    "segments": []
  },
  "fraud_intelligence": {
    "availability": "AVAILABLE",
    "categories": [],
    "evidence": []
  },
  "temporal_analysis": {
    "availability": "UNAVAILABLE",
    "findings": []
  },
  "evidence": [],
  "limitations": [],
  "processing_time_ms": 0
}
```

This is a schema example, not a prediction or expected score.

### 8.6 Contract rules

-   Job states: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`.
-   Engine states: `AVAILABLE`, `UNAVAILABLE`, `FAILED`, `INCONCLUSIVE`.
-   Use explicit enums and nullable fields.
-   Every engine block includes availability, model metadata where
    applicable and limitations.
-   Unavailable output is null or an explicitly unavailable result,
    never a fabricated value.
-   **Model confidence:** certainty associated with an engine's output.
-   **Fusion uncertainty:** estimate of how uncertain the overall
    assessment is.
-   **Evidence sufficiency:** proportion/quality of expected evidence
    actually available and reliable.
-   Confidence, uncertainty and evidence sufficiency must not be
    conflated.
-   MVP is single-user with an API key configured through environment
    variables; no account system is required.

------------------------------------------------------------------------

## 9. Database and persistence

Use SQLAlchemy 2 and Alembic. Begin with SQLite for local development.
Keep database-specific code portable so PostgreSQL can be introduced
later.

Use UUID primary keys, timestamps, foreign keys, indexes and explicit
constraints.

  -----------------------------------------------------------------------
  Table                               Key fields
  ----------------------------------- -----------------------------------
  `analyses`                          id, filename/display name, status,
                                      risk_score, risk_level, created_at

  `audio_metadata`                    analysis_id, duration, sample_rate,
                                      channels, codec

  `authenticity_results`              analysis_id, model, score,
                                      confidence, availability

  `speaker_profiles`                  id, owner_id, consent_status,
                                      encrypted_embedding_reference

  `speaker_results`                   analysis_id, profile_id,
                                      similarity, verification_status

  `transcripts`                       analysis_id, language, transcript,
                                      segments

  `fraud_results`                     analysis_id, categories, evidence

  `risk_assessments`                  analysis_id, fusion_version, score,
                                      uncertainty, decision

  `evidence_items`                    analysis_id, category, timestamp,
                                      description, severity

  `model_registry`                    model_name, version, checksum,
                                      configuration
  -----------------------------------------------------------------------

Raw audio is not stored by default. Transcript retention is configurable
and opt-in. Deletion must remove permitted retained artifacts and
related records consistently.

------------------------------------------------------------------------

## 10. Privacy, security and safety

Treat voice recordings and voice embeddings as sensitive data.

Required controls:

-   No raw audio retention by default.
-   Explicit consent for speaker enrollment.
-   Encryption at rest for embeddings and retained sensitive artifacts.
-   Access control for speaker profiles.
-   Deletion for analyses, transcripts and profiles.
-   No raw audio, credentials or sensitive transcript text in ordinary
    logs.
-   Validate file format, size and duration.
-   Use safe temporary files and cleanup.
-   Never interpolate uploaded filenames into shell commands.
-   Use SQLAlchemy ORM/query parameters.
-   Keep secrets in environment variables.
-   Configure CORS explicitly.
-   Add rate-limit hooks.
-   Sanitize error responses.
-   Document consent, retention and legal-basis responsibilities.

The MVP uses an API key from environment configuration and does not
implement a full user-account system.

------------------------------------------------------------------------

## 11. Analysis orchestration and job execution

Create an `AnalysisService` that coordinates the pipeline.

1.  Validate request and create an analysis record.
2.  Mark job `PROCESSING`.
3.  Decode and preprocess audio.
4.  Create timestamped speech segments.
5.  Run available engines using the configured execution policy.
6.  Capture each engine's status, evidence, metadata and limitations.
7.  Run temporal analysis when enabled.
8.  Run risk fusion using only valid available evidence.
9.  Generate decision rationale and evidence report.
10. Persist allowed results.
11. Mark job `COMPLETED`, or `FAILED` with a sanitized failure reason.

### Execution policy

-   Use sequential inference by default.
-   Keep blocking inference off the event loop.
-   Use a bounded thread or process executor as appropriate to the
    model/runtime.
-   Avoid unbounded background tasks.
-   Track job state persistently so status polling survives API request
    completion.
-   A failure in one engine must not silently become a safe prediction.
-   Decide explicitly which engine failures permit a partial report and
    which make the analysis fail.

For a single-machine MVP, a simple bounded executor and database-backed
job state are sufficient. Redis and a distributed task queue are not MVP
requirements.

------------------------------------------------------------------------

## 12. Observability and deployment

Later production phase:

-   Dockerfile.
-   Docker Compose.
-   PostgreSQL service.
-   Optional Redis service.
-   Prometheus metrics endpoint.
-   Grafana dashboards.
-   GitHub Actions CI.
-   Structured logs.

Measure:

-   Request count and error rate.
-   Audio preprocessing duration.
-   Per-engine inference latency.
-   Total analysis latency.
-   Engine availability/failure.
-   Job queue duration.
-   CPU and memory use.
-   GPU utilization when available.

Do not log raw audio or sensitive transcript contents.

------------------------------------------------------------------------

## 13. Testing strategy

### 13.1 Unit tests

-   Configuration loading.
-   Audio metadata validation.
-   Decoder behavior.
-   Preprocessing and resampling.
-   VAD and segment timestamps.
-   Engine availability states.
-   Schema validation.
-   Fraud rules.
-   Temporal analysis.
-   Fusion with missing evidence.
-   Fusion with model disagreement.
-   Decision thresholds.
-   Explanation generation.

### 13.2 API and integration tests

-   Health endpoint.
-   Valid audio upload.
-   Invalid extension and mismatched codec.
-   Corrupted audio.
-   Oversized and over-duration audio.
-   Job state transitions.
-   Analysis status polling.
-   Report endpoint.
-   History pagination.
-   Analysis deletion.
-   Database persistence.
-   Sanitized error behavior.

### 13.3 Test policy

-   Use small synthetic fixtures and mocked engines in ordinary CI.
-   Keep real-checkpoint integration tests separate.
-   Do not require large model downloads for every test run.
-   Do not claim real model validation based only on mocked tests.
-   Run the test suite after each implementation stage.

------------------------------------------------------------------------

## 14. Research and evaluation plan

The research claim must be demonstrated experimentally. Combining
existing models is not, by itself, a novel contribution.

**Working title:** *Beyond Deepfake Detection: An Uncertainty-Aware,
Temporally Adaptive Framework for Voice Impersonation Threat
Assessment.*

### 14.1 Datasets and purpose

  -----------------------------------------------------------------------
  Dataset                             Purpose
  ----------------------------------- -----------------------------------
  ASVspoof 2019 LA                    Anti-spoofing baseline and
                                      checkpoint training domain

  ASVspoof 2021                       Generalization under channel and
                                      codec conditions

  WaveFake                            Vocoder-generated speech

  In-the-Wild                         Real-world deepfake generalization

  LibriSpeech                         ASR experiments

  VoxCeleb or another suitable        Speaker verification experiments
  speaker set                         
  -----------------------------------------------------------------------

Dataset licenses, terms, splits and permitted use must be checked before
use.

### 14.2 Stage 0: checkpoint baseline before API work

Before building the API:

1.  Find a public AASIST checkpoint.
2.  Verify source, license, architecture and expected preprocessing.
3.  Implement `scripts/eval_antispoof.py`.
4.  Run CPU by default, with optional CUDA.
5.  Evaluate a small In-the-Wild subset.
6.  Record EER and the exact configuration.
7.  Document failure cases and domain mismatch.
8.  If the checkpoint cannot be verified or run, report that honestly
    and evaluate alternatives.

Pretrained anti-spoofing models may degrade on unseen generators and
channels. The baseline must guide the engineering decision.

### 14.3 Multimodal evaluation set

Public datasets do not jointly label authenticity, speaker identity and
scam intent. Build a consent-based evaluation set with a factorial
design:

-   Authenticity: genuine speech versus speech generated by several
    TTS/voice-cloning systems.
-   Intent: benign script versus scripted social-engineering script.
-   Speaker: enrolled speaker versus a different speaker.

This separates important cases, including genuine speakers reading scam
scripts and synthetic voices reading harmless scripts.

Use speaker-disjoint and generation-method-disjoint splits where
possible to reduce leakage. Document consent, data provenance and
licensing.

### 14.4 Metrics

-   EER.
-   FAR and FRR.
-   Precision, recall and F1.
-   ROC-AUC.
-   Calibration error.
-   End-to-end latency.
-   Robustness to noise, compression and replay.

Define the positive class and operating threshold for every reported
metric. Do not mix spoof-detection and speaker-verification error
definitions.

### 14.5 Ablations

Compare:

-   Full system.
-   Without temporal analysis.
-   Without uncertainty handling.
-   Without semantic analysis.
-   Without speaker verification.
-   Baseline fusion versus naive averaging.

Report every number from real runs with dataset split, model/checkpoint
version, configuration and environment.

------------------------------------------------------------------------

## 15. Development roadmap and acceptance gates

### Stage 0 --- Anti-spoofing feasibility baseline

**Build:** Evaluation script only; no API yet.

**Acceptance gate:** - Checkpoint provenance and license recorded. -
Architecture and preprocessing verified. - Evaluation script runs
reproducibly. - EER reported on a documented subset, or the blocker is
explicitly documented. - No fabricated metrics.

### Stage 1 --- Backend foundation

**Build:** - FastAPI app skeleton. - Environment-based configuration. -
Structured logging. - Pydantic schemas and explicit enums. - SQLAlchemy
models with SQLite. - `GET /api/v1/health` with engine availability. -
API router. - Pytest suite. - GitHub Actions workflow.

**Acceptance gate:** tests pass; PowerShell install/run/test commands
documented. No ML code yet.

### Stage 2 --- Audio pipeline

**Build:** upload validation, decoding, preprocessing, VAD, segmentation
and temporary-file cleanup.

**Acceptance gate:** valid and invalid audio tests pass; segment
timestamps are correct; resource limits enforced.

### Stage 3 --- Authenticity engine

**Build:** verified AASIST adapter and real checkpoint inference.

**Acceptance gate:** real checkpoint runs on CPU; CUDA optional; model
metadata and limitations returned; unavailable state tested; no
placeholder prediction.

### Stage 4 --- Speech and fraud intelligence

**Build:** faster-whisper integration and rule-based fraud intent.

**Acceptance gate:** timestamped transcript and evidence-backed
categories returned; ASR and authenticity remain separate.

### Stage 5 --- Fusion, decisions and reports

**Build:** interpretable uncalibrated fusion baseline, missing-evidence
handling, decisions, explanations and reports.

**Acceptance gate:** unit tests prove missing engine output cannot be
interpreted as zero risk; output identifies heuristic score and
limitations.

### Stage 6 --- Persistence and history

**Build:** complete database persistence, history, report retrieval and
deletion.

**Acceptance gate:** persistence and deletion integration tests pass.

### Stage 7 --- Speaker verification

**Build:** ECAPA-TDNN, consented enrollment, encrypted embeddings and
deletion.

**Acceptance gate:** real-checkpoint evaluation and threshold rationale
documented; insufficient audio returns inconclusive.

### Stage 8 --- Research extensions

**Build:** temporal analysis, uncertainty-aware fusion, calibration and
evaluation scripts.

**Acceptance gate:** documented experiments and ablations support any
research claims.

### Stage 9 --- Production engineering

**Build:** Docker, CI, monitoring, metrics, PostgreSQL and optional
Redis.

**Acceptance gate:** reproducible container deployment and integration
tests.

### Stage 10 --- Live streaming

**Build:** WebSocket chunk ingestion, incremental processing and session
management. Simulated WebRTC calling can be integrated at the
application layer.

**Acceptance gate:** measured latency, resource use, reconnect handling
and tested streaming behavior.

No phase should be described as complete until its acceptance gate
passes.

------------------------------------------------------------------------

## 16. Environment configuration

Create `.env.example` with documented settings similar to:

``` dotenv
APP_ENV=development
APP_NAME=VoxSentinel
API_V1_PREFIX=/api/v1
API_KEY=replace_me
CORS_ORIGINS=http://localhost:3000

DATABASE_URL=sqlite:///./voxsentinel.db

MAX_UPLOAD_MB=25
MAX_AUDIO_DURATION_SECONDS=300
TEMP_AUDIO_DIR=./tmp/audio
RETAIN_RAW_AUDIO=false
RETAIN_TRANSCRIPTS=false

DEFAULT_DEVICE=cpu
ALLOW_CUDA=true
SEQUENTIAL_INFERENCE=true
MAX_GPU_MODELS=1

AASIST_ENABLED=false
AASIST_CHECKPOINT_PATH=
AASIST_MODEL_VERSION=

WHISPER_MODEL=base
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8

SPEAKER_VERIFICATION_ENABLED=false
REDIS_URL=
```

Validate configuration at startup. Do not commit real secrets or
checkpoints. The exact environment variable names may be refined during
implementation, but document them consistently.

------------------------------------------------------------------------

## 17. Coding-agent standing rules

Keep a `CLAUDE.md` or equivalent project instruction file containing
these rules:

1.  Never fabricate model outputs, metrics or checkpoints.
2.  If a model is unavailable, return `UNAVAILABLE`.
3.  Missing evidence is never zero risk.
4.  Use typed code, Pydantic v2 and stable versioned API contracts.
5.  Keep engines independent behind common interfaces.
6.  Use sequential inference, lazy loading and CPU fallback.
7.  Keep at most one large model resident on the GPU.
8.  Treat raw audio and voice embeddings as sensitive; no default
    retention or logging.
9.  Validate decoded audio, not just filenames or MIME types.
10. Never pass uploaded filenames into shell commands.
11. Never describe heuristic scores as calibrated probabilities.
12. Do not claim a feature is done without running its tests.
13. Work one stage at a time; inspect the repository first.
14. Report each feature as `TESTED`, `IMPLEMENTED_UNVALIDATED`,
    `PARTIAL` or `NOT_STARTED`.
15. Update documentation when behavior or API contracts change.

------------------------------------------------------------------------

## 18. Required deliverables

At completion, the backend repository must contain:

-   Complete source code for implemented stages.
-   Clean modular project structure.
-   Compatible pinned dependencies.
-   `.env.example`.
-   Database models and Alembic migrations.
-   Dockerfile and Docker Compose when deployment phase is reached.
-   Generated OpenAPI documentation.
-   API examples.
-   Unit and integration tests.
-   Model/checkpoint setup guide.
-   Dataset and evaluation documentation.
-   Experiment configurations and results.
-   README with exact Windows PowerShell setup instructions.
-   Clear feature-status report.

Every feature must be labeled:

-   **TESTED:** implemented and verified by the relevant tests.
-   **IMPLEMENTED_UNVALIDATED:** code exists but real model/data
    validation is incomplete.
-   **PARTIAL:** some behavior exists, but the feature is incomplete.
-   **NOT_STARTED:** not implemented.

------------------------------------------------------------------------

## 19. First coding-agent task

Do not attempt to build the entire system in one pass.

Start with **Stage 0 only**:

> Read the project specification and inspect the repository. Find a
> public AASIST checkpoint and verify its source, license, architecture,
> expected input length and preprocessing. Implement
> `scripts/eval_antispoof.py` with CPU as the default and optional CUDA.
> Run it on a small In-the-Wild subset and report EER with the exact
> configuration. Do not build the API yet. Do not invent results. If any
> checkpoint detail cannot be verified, document the blocker and stop
> rather than pretending the evaluation succeeded.

After Stage 0 is reviewed, proceed to Stage 1 using a separate
implementation task.

**The guiding standard:** VoxSentinel must be a real, reproducible
voice-security research system---not a polished interface backed by mock
predictions.
