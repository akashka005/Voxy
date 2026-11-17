# VoxSentinel - Standing Rules

Project: voice trust verification and impersonation threat assessment backend.
Tagline: Detect. Verify. Protect.
Stack: Python 3.10, FastAPI, Pydantic v2, SQLAlchemy 2, PyTorch, SpeechBrain, faster-whisper.
Environment: Windows 11, PowerShell, RTX 2050 (4 GB VRAM). CPU fallback required.

## Rules
1. Never fabricate model outputs, metrics or checkpoints. If a model is unavailable,
   return status UNAVAILABLE. A missing output is missing evidence, never zero risk.
2. Typed code, Pydantic v2 schemas, stable versioned API contracts under `/api/v1`.
3. Every engine implements the common interface (`load`, `infer`, `availability`, `metadata`, `limitations`). Engines stay independent.
4. Sequential inference by default, lazy model loading, at most one large model on GPU at a time.
5. Raw audio and speaker embeddings are sensitive: no default retention, no logging.
6. Never trust filename or MIME type. No shell calls with uploaded filenames.
7. Do not describe heuristic scores as calibrated probabilities.
8. Do not claim a feature is done without running its tests.
9. Work one stage at a time. Inspect the repo first. Run tests after each stage.
10. Report each feature as: TESTED / IMPLEMENTED_UNVALIDATED / PARTIAL / NOT_STARTED.
