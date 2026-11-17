import numpy as np
import scipy.signal
import math


def to_mono(waveform: np.ndarray) -> np.ndarray:
    """
    Converts multi-channel waveform to single-channel mono by averaging channels.
    Waveform can be 1D (samples,) or 2D (samples, channels) or (channels, samples).
    """
    if waveform.ndim == 1:
        return waveform.astype(np.float32)

    if waveform.ndim == 2:
        # If shape is (channels, samples) and channels <= 8
        if waveform.shape[0] < waveform.shape[1] and waveform.shape[0] <= 8:
            return np.mean(waveform, axis=0).astype(np.float32)
        # If shape is (samples, channels)
        return np.mean(waveform, axis=1).astype(np.float32)

    raise ValueError(f"Unsupported waveform dimensionality: {waveform.ndim}")


def resample_waveform(
    waveform: np.ndarray,
    orig_sr: int,
    target_sr: int = 16000,
) -> np.ndarray:
    """
    Resamples 1D audio waveform to target sample rate using polyphase filtering.
    """
    if orig_sr == target_sr:
        return waveform.astype(np.float32)

    gcd = math.gcd(orig_sr, target_sr)
    up = target_sr // gcd
    down = orig_sr // gcd

    resampled = scipy.signal.resample_poly(waveform, up, down).astype(np.float32)
    return resampled


def normalize_waveform(
    waveform: np.ndarray,
    target_peak: float = 0.95,
) -> np.ndarray:
    """
    Normalizes audio peak amplitude to target_peak (default 0.95) to prevent clipping
    while standardizing dynamic range across recordings.
    """
    max_val = np.max(np.abs(waveform))
    if max_val > 1e-6:
        return (waveform / max_val * target_peak).astype(np.float32)
    return waveform.astype(np.float32)


def preprocess_audio(
    waveform: np.ndarray,
    orig_sr: int,
    target_sr: int = 16000,
    normalize: bool = True,
) -> np.ndarray:
    """
    Complete audio preprocessing pipeline:
    1. Mono conversion
    2. Resampling to target sample rate (default 16 kHz)
    3. Peak amplitude normalization
    """
    mono = to_mono(waveform)
    resampled = resample_waveform(mono, orig_sr=orig_sr, target_sr=target_sr)
    if normalize:
        return normalize_waveform(resampled)
    return resampled
