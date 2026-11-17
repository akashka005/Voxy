# VoxSentinel — Model Setup Guide

## 1. AASIST Anti-Spoofing Engine

AASIST (Audio Anti-Spoofing using Integrated Spectro-Temporal graph attention networks) is the
primary deepfake / voice-cloning detector in VoxSentinel.

### Status
Until a checkpoint is configured, the engine returns `UNAVAILABLE` with null scores.
**No predictions are fabricated.**

### Download

The reference checkpoint is published by CLOVA AI:

```bash
# Official repo
git clone https://github.com/clovaai/aasist
cd aasist

# Download the pre-trained LA model checkpoint (~12 MB)
# Direct link (as of the original paper release):
# https://github.com/clovaai/aasist/releases/download/v1.0.0/AASIST.pth
wget https://github.com/clovaai/aasist/releases/download/v1.0.0/AASIST.pth -O AASIST.pth
```

> **Windows alternative** — download via browser:
> `https://github.com/clovaai/aasist/releases/download/v1.0.0/AASIST.pth`

### SHA-256 Verification

```bash
# Linux / macOS
sha256sum AASIST.pth

# Windows PowerShell
Get-FileHash AASIST.pth -Algorithm SHA256
```

Expected hash: `a4e8f1d0...` *(verify against the clovaai/aasist releases page — hash changes with
each release)*

### Configuration

Copy the checkpoint to the models directory and set the environment variable:

```bash
# Create directory
mkdir -p backend/models/aasist

# Move checkpoint
mv AASIST.pth backend/models/aasist/AASIST.pth

# In backend/.env (copy from .env.example)
AASIST_CHECKPOINT_PATH=backend/models/aasist/AASIST.pth
AASIST_DEVICE=cuda   # or cpu
```

### Architecture Contract

The VoxSentinel AASIST adapter (`backend/app/engines/authenticity/aasist.py`) expects:

| Property | Value |
|---|---|
| Input | `torch.Tensor` shape `(1, N)` float32, 16 kHz mono |
| Output | logits shape `(1, 2)` — `[spoof_logit, bonafide_logit]` |
| Checkpoint key | `state_dict` or top-level dict of model weights |
| Config | `backend/models/aasist/config.conf` (optional, uses defaults) |

### Running Evaluation

```bash
# Evaluate on ASVspoof 2019 LA eval set
python backend/scripts/eval_antispoof.py \
  --dataset-dir /path/to/asvspoof2019_LA/eval \
  --checkpoint backend/models/aasist/AASIST.pth \
  --output eval_results.json
```

Expected EER on ASVspoof 2019 LA: **~0.83%** (reference paper result).

---

## 2. Whisper Speech-to-Text Engine

Powered by **faster-whisper** (CTranslate2-converted Whisper weights).

### Install

```bash
pip install faster-whisper
```

faster-whisper downloads model weights automatically on first use:

```python
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu")  # downloads ~74 MB
```

### Configuration

```bash
# backend/.env
WHISPER_MODEL_SIZE=base       # tiny, base, small, medium, large-v2, large-v3
WHISPER_DEVICE=cpu            # cpu or cuda
WHISPER_COMPUTE_TYPE=int8     # int8 (CPU), float16 (GPU)
```

GPU acceleration requires CUDA 11.8+ and the `cudnn` package:
```bash
pip install ctranslate2[cuda]
```

### Models and Sizes

| Model | Params | VRAM | WER (en) | Speed (RTX 3090) |
|---|---|---|---|---|
| tiny | 39M | ~1 GB | ~12% | ~32× |
| base | 74M | ~1 GB | ~8% | ~16× |
| small | 244M | ~2 GB | ~5% | ~6× |
| medium | 769M | ~5 GB | ~3% | ~2× |
| large-v3 | 1550M | ~10 GB | ~2% | ~1× |

> **RTX 2050 (4 GB VRAM):** Use `small` or `base`. Large models will OOM.

---

## 3. ECAPA-TDNN Speaker Verification (Phase 2)

> **Phase 2 feature** — the enrollment/delete API endpoints exist but embedding inference is not
> yet implemented. The engine returns `UNAVAILABLE`.

ECAPA-TDNN via SpeechBrain will be used for speaker identity verification.

### Planned Integration

```bash
pip install speechbrain
```

```python
from speechbrain.pretrained import SpeakerRecognition
model = SpeakerRecognition.from_hparams(
    source="speechbrain/spkrec-ecapa-voxceleb",
    savedir="backend/models/ecapa"
)
```

### Configuration (Phase 2)

```bash
SPEAKER_MODEL_PATH=backend/models/ecapa
SPEAKER_THRESHOLD=0.25        # cosine similarity threshold
```

---

## 4. FFmpeg (Optional — for MP3/M4A support)

FFmpeg is **not required** for WAV and FLAC files (handled by `soundfile`).
It is required for MP3, M4A, AAC, OGG, and other compressed formats.

### Windows Install

```powershell
# winget
winget install Gyan.FFmpeg

# Or download from https://ffmpeg.org/download.html
# Add the bin/ folder to your PATH
```

### Verify

```powershell
ffmpeg -version
```

After FFmpeg is on PATH, restart the VoxSentinel server and compressed audio uploads will work.
