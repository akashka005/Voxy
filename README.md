# VoxSentinel

> **Detect. Verify. Protect.**\
> A voice communication threat assessment system that evaluates independent evidence instead of returning an oversimplified "fake or real" label.

---

## Architecture Overview

VoxSentinel answers four distinct questions via independent engines:

| Question | Engine | Output |
| :--- | :--- | :--- |
| **Is this voice authentic?** | Authenticity (Anti-spoofing) | Synthetic/spoof evidence per segment |
| **Who does it resemble?** | Speaker Verification (Phase 2) | Match, mismatch or inconclusive against consented profile |
| **What is being said?** | Speech Intelligence (ASR + Fraud Intent) | Timestamped transcript, social-engineering categories |
| **How trustworthy is the interaction?** | Temporal Analysis & Risk Fusion | Risk score (0-100), uncertainty, recommended security decision |

---

## Repository Structure

```text
voxsentinel/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint & lifespan
│   │   ├── core/                    # Config, security, and structured logging
│   │   ├── api/v1/                  # Versioned router and endpoints (health, etc.)
│   │   ├── schemas/                 # Pydantic v2 schemas and explicit enums
│   │   ├── engines/                 # BaseEngine lifecycle contract & engine modules
│   │   └── db/                      # SQLAlchemy 2 models, session, and SQLite setup
│   ├── tests/                       # Pytest test suite
│   ├── requirements.txt             # Pinned backend dependencies
│   └── .env.example                 # Environment configuration template
├── .github/workflows/
│   └── backend-ci.yml               # Automated CI test pipeline
├── CLAUDE.md                        # Standing development rules and guidelines
├── .gitignore                       # Git ignore rules for models, audio, envs
└── README.md                        # Documentation and PowerShell setup guide
```

---

## Windows 11 PowerShell Quick Start

### 1. Prerequisites
- Python 3.10.6
- Git
- FFmpeg on PATH (required for audio decoding)

### 2. Environment Setup
```powershell
# Navigate to project root
cd d:\Voxy

# Create and activate virtual environment (optional if using global Python 3.10)
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r backend/requirements.txt

# Copy environment configuration
Copy-Item backend\.env.example backend\.env
```

### 3. Run Backend Server
```powershell
# Start Uvicorn development server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

The interactive API documentation is available at:
- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/api/v1/health`

### 4. Run Test Suite
```powershell
python -m pytest -v backend/tests
```

---

## Feature Status Report

As specified by project standing rules, each capability is explicitly tracked and verified by tests:

| Feature / Component | Status | Verification / Notes |
| :--- | :--- | :--- |
| **App Skeleton & Lifespan** | `TESTED` | FastAPI startup, CORS, sanitized error handling verified |
| **Configuration (`config.py`)** | `TESTED` | Environment-based loading, bounds, CORS parsing tested |
| **Structured Logging (`logging.py`)** | `TESTED` | JSON formatting with sensitive data & credential redaction |
| **Pydantic v2 Schemas** | `TESTED` | Explicit enums, nullable fields, bounds checks tested |
| **SQLAlchemy 2 DB Models** | `TESTED` | 10 relational tables, UUID keys, SQLite cascading tested |
| **Health Endpoint (`GET /api/v1/health`)** | `TESTED` | Returns real engine availability & db status |
| **BaseEngine Contract (`base.py`)** | `TESTED` | Common lifecycle (`load`, `infer`, `availability`, etc.) |
| **Audio Ingestion & Decoder (`decoder.py`)** | `TESTED` | Real stream decode, limits (25MB, 300s), corrupt rejection |
| **Audio Preprocessing (`preprocessing.py`)** | `TESTED` | Mono conversion, 16 kHz polyphase resampling, peak normalize |
| **VAD & Segmentation (`vad.py`, `segmentation.py`)** | `TESTED` | Frame energy VAD, 4.0s window / 2.0s hop overlapping segments |
| **Safe Storage (`storage_service.py`)** | `TESTED` | Randomized UUID temp storage, deterministic safe cleanup |
| **AASIST Authenticity Adapter (`aasist.py`)** | `TESTED` | Lazy loading, PyTorch CPU/CUDA, uncalibrated score contract |
| **Speech Intelligence Adapter (`whisper.py`)** | `TESTED` | faster-whisper interface with ASR/authenticity separation |
| **Fraud-Intent Engine (`classifier.py`, `rules.py`)** | `TESTED` | 6 threat categories: OTP, wire urgency, secrecy, coercion |
| **Temporal Trust Analyzer (`temporal_analyzer.py`)** | `TESTED` | Multi-segment score transition and drop tracking |
| **Uncertainty & Evidence Sufficiency (`uncertainty.py`)** | `TESTED` | Missing evidence penalty, speech ratio, disagreement |
| **Risk Fusion Baseline (`fusion.py`)** | `TESTED` | Weighted heuristic, Rule 1 compliance, score 0-100 |
| **Decision Engine (`decision_engine.py`)** | `TESTED` | 5 security decisions with audit trail rationale |
| **Asynchronous Worker (`analysis_worker.py`)** | `TESTED` | Bounded thread executor keeps inference off async event loop |
| **Analysis Endpoints (`analyze.py`)** | `TESTED` | `POST /analyze`, `GET /analysis/{id}`, `DELETE /analysis/{id}` |
| **Audit Reports (`reports.py`)** | `TESTED` | `GET /analysis/{id}/report` with full findings & metadata |
| **History (`history.py`)** | `TESTED` | `GET /history` with pagination |
| **Speaker Profiles (`speakers.py`)** | `TESTED` | Biometric consent-checked profile enrollment & deletion |
| **Live Streaming & Session Stubs** | `TESTED` | Explicit HTTP 501 per specification section 8.3 |
| **CI Workflow (`backend-ci.yml`)** | `TESTED` | Automated GitHub Actions pipeline configured |
