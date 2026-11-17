# VoxSentinel — Dataset Guide

## Anti-Spoofing Evaluation Datasets

### ASVspoof 2019 LA (Primary)

The standard benchmark for logical access (voice synthesis/conversion) spoofing detection.

| Property | Value |
|---|---|
| Task | Logical Access (LA) |
| Languages | English |
| Bonafide speakers | 107 |
| Spoof systems | 19 TTS/VC systems |
| Eval set size | ~71,000 utterances |
| Metric | Equal Error Rate (EER), min-tDCF |

**Download:**
1. Register at [ASVspoof.org](https://www.asvspoof.org/)
2. Download `LA.zip` (~10 GB)
3. Extract to a local path and set `--dataset-dir` in `eval_antispoof.py`

**Expected directory layout for `eval_antispoof.py`:**
```
<dataset-dir>/
  bonafide/
    LA_E_1000147.flac
    ...
  spoof/
    LA_E_1000243.flac
    ...
```

Alternatively provide a `labels.csv`:
```csv
filename,label
LA_E_1000147.flac,bonafide
LA_E_1000243.flac,spoof
```

---

### WaveFake (Secondary)

Deepfake speech dataset covering 6 modern vocoders.

| Property | Value |
|---|---|
| Vocoders | MelGAN, Parallel WaveGAN, MB-MelGAN, HiFi-GAN, Full-Band MelGAN, WaveGlow |
| Languages | English, Japanese |
| Size | ~117 GB (full) |

**Paper:** Lavrentyeva et al. 2021 — [arXiv:2111.02813](https://arxiv.org/abs/2111.02813)

**Download:** `https://zenodo.org/record/5642694`

---

### In-the-Wild

Real-world spoofed speech samples collected from public sources (YouTube, social media).
Useful for domain adaptation evaluation.

**Paper:** Yi et al. 2022 — [arXiv:2203.16263](https://arxiv.org/abs/2203.16263)

**Download:** `https://deepfake-total.com/in_the_wild`

---

## Speech Recognition Datasets

### LibriSpeech

Standard English ASR benchmark, used to validate Whisper transcription quality.

| Subset | Size | Hours |
|---|---|---|
| test-clean | ~346 MB | 5.4 h |
| test-other | ~328 MB | 5.1 h |
| dev-clean | ~337 MB | 5.4 h |

**Download:** `https://www.openslr.org/12`

---

## Speaker Verification Datasets (Phase 2)

### VoxCeleb1 / VoxCeleb2

Standard speaker recognition benchmarks used to train ECAPA-TDNN.

| Dataset | Speakers | Utterances |
|---|---|---|
| VoxCeleb1 | 1,251 | 153,516 |
| VoxCeleb2 | 5,994 | 1,128,246 |

**Download:** `https://www.robots.ox.ac.uk/~vgg/data/voxceleb/`

> Pre-trained ECAPA-TDNN from SpeechBrain (Phase 2) was trained on VoxCeleb; direct download
> is not needed unless fine-tuning.
