# VoxSentinel — Architecture Decision Log

## ADR-001: SQLite for Development, PostgreSQL-ready for Production

**Date:** 2026-11-17  
**Status:** Accepted

**Context:** Need a relational store for analysis results, speaker profiles, and audit trails.

**Decision:** Use SQLAlchemy 2.0 with async-compatible session management and SQLite for dev.
The `DATABASE_URL` env var switches to any SQLAlchemy-supported DB without code changes.
Alembic handles schema migrations for both engines.

**Consequences:**
- Dev: zero infra, one file
- Prod: set `DATABASE_URL=postgresql+asyncpg://...` and run `alembic upgrade head`
- Avoid SQLite-specific constructs (e.g., `ON CONFLICT DO NOTHING` → use `merge()`)

---

## ADR-002: Heuristic Risk Fusion with Explicit Uncertainty

**Date:** 2026-11-17  
**Status:** Accepted

**Context:** No labeled fusion training data exists at project start. Need a risk score that is
safe to deploy without calibration data.

**Decision:** Use weighted heuristic fusion with explicit `score_type: UNCALIBRATED_HEURISTIC`
label. Missing modalities → MONITOR (not zero-risk). Confidence intervals reported.

**Consequences:**
- Cannot claim calibrated probabilities
- Clear audit trail — every score carries a provenance label
- Phase 3 can replace with learned fusion on accumulated data

---

## ADR-003: AASIST Returns UNAVAILABLE Without Checkpoint

**Date:** 2026-11-17  
**Status:** Accepted

**Context:** ML model checkpoint is a large binary not shipped in the repo.

**Decision:** Engine checks for checkpoint at startup. Returns `EngineStatus.UNAVAILABLE` with
null scores if not found. Never fabricates predictions.

**Consequences:**
- Backend is fully deployable without model weights
- Security: no false sense of safety from fabricated scores
- Ops must provision checkpoints before the authenticity engine becomes useful

---

## ADR-004: soundfile as Primary Audio Decoder

**Date:** 2026-11-17  
**Status:** Accepted

**Context:** torchaudio cannot decode audio on Windows without FFmpeg. FFmpeg is not installed
on the target machine. Need reliable WAV/FLAC support.

**Decision:** Use `soundfile` (libsndfile wrapper) as the primary decoder. Document FFmpeg as
an optional prerequisite for MP3/M4A.

**Consequences:**
- WAV and FLAC work out of the box
- MP3/M4A require FFmpeg on PATH
- torchaudio kept as a future alternative

---

## ADR-005: Thread Worker for Analysis Pipeline

**Date:** 2026-11-17  
**Status:** Accepted

**Context:** ML inference (PyTorch, Whisper) is CPU/GPU-bound and blocks the event loop.

**Decision:** `ThreadPoolExecutor(max_workers=2)` runs the analysis pipeline in a worker thread.
Job status is polled via GET /analysis/{id}. Max 2 concurrent jobs prevents GPU OOM.

**Consequences:**
- API stays responsive during inference
- Max concurrency is configurable via `MAX_WORKER_THREADS` env var (Phase 5)
- Phase 4 streaming will need a dedicated async producer

---

## ADR-006: API-Key Authentication Only (Phase 1)

**Date:** 2026-11-17  
**Status:** Accepted

**Context:** Need a simple, auditable auth layer for the first phase.

**Decision:** `X-API-Key` header validated against `API_KEY` env var. JWT + RBAC is Phase 3.

**Consequences:**
- Simple to integrate
- No per-user identity yet
- Rotate the key via env var restart

---

## ADR-007: Rate Limiting via slowapi

**Date:** 2026-11-17  
**Status:** Accepted

**Context:** Need to prevent abuse of the analysis endpoint (audio upload + ML inference).

**Decision:** Use `slowapi` (Starlette-compatible `limits` wrapper). Apply `10/minute` to the
POST /analyze endpoint and `60/minute` to GET endpoints globally.

**Consequences:**
- Simple in-process rate limiting (no Redis needed for Phase 1)
- Upgrade to Redis-backed `limits` storage in Phase 5

---

## ADR-008: Explicit 501 Stubs for Phase 4 Features

**Date:** 2026-11-17  
**Status:** Accepted

**Context:** Real-time streaming and session management are Phase 4. Routes must exist in the
API spec but must not silently do nothing.

**Decision:** Return HTTP 501 Not Implemented with a clear `phase` label in the response body.

**Consequences:**
- Clients get actionable error messages
- OpenAPI spec shows the full surface area
- Prevents accidental use of unimplemented features
