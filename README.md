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

As specified by project standing rules, each capability is explicitly tracked:

| Feature / Component | Status | Verification / Notes |
| :--- | :--- | :--- |
| **App Skeleton & Lifespan** | `TESTED` | FastAPI startup, CORS, sanitized error handling verified |
| **Configuration (`config.py`)** | `TESTED` | Environment-based loading, CORS parsing tested |
| **Structured Logging (`logging.py`)** | `TESTED` | JSON formatting with sensitive data redaction |
| **Pydantic v2 Schemas** | `TESTED` | Explicit enums, nullable fields, bounds checks tested |
| **SQLAlchemy 2 DB Models** | `TESTED` | 10 tables, UUID keys, SQLite cascading tested |
| **Health Endpoint (`GET /api/v1/health`)** | `TESTED` | Returns real engine availability & db status |
| **BaseEngine Contract (`base.py`)** | `TESTED` | Common lifecycle (`load`, `infer`, `availability`, etc.) |
| **CI Workflow (`backend-ci.yml`)** | `TESTED` | GitHub Actions workflow configuration |
| **Audio Preprocessing & Decoder** | `NOT_STARTED` | Scheduled for Stage 2 |
| **AASIST Authenticity Engine** | `NOT_STARTED` | Stage 0 baseline & Stage 3 adapter pending |
| **Speech (Whisper) & Fraud Rules** | `NOT_STARTED` | Scheduled for Stage 4 |
| **Risk Fusion & Decision Engine** | `NOT_STARTED` | Scheduled for Stage 5 |
| **Speaker Verification (ECAPA-TDNN)** | `NOT_STARTED` | Scheduled for Phase 2 (Stage 7) |
| **Temporal Analysis** | `NOT_STARTED` | Scheduled for Research Phase (Stage 8) |
