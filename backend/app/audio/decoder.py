import os
from dataclasses import dataclass
from typing import Tuple, Optional
import numpy as np
import soundfile as sf
from backend.app.core.config import settings
class AudioDecodeError(ValueError):
    pass
class AudioLimitExceededError(ValueError):
    pass
@dataclass
class DecodedAudio:
    waveform: np.ndarray
    sample_rate: int
    channels: int
    duration_seconds: float
    num_samples: int
    format: str
    subtype: str
    file_size_bytes: int


def decode_audio_file(
    file_path: str,
    max_duration_seconds: Optional[int] = None,
    max_size_mb: Optional[int] = None,
) -> DecodedAudio:
    if not os.path.exists(file_path):
        raise AudioDecodeError("Target audio file does not exist on disk.")

    file_size_bytes = os.path.getsize(file_path)
    if file_size_bytes == 0:
        raise AudioDecodeError("Uploaded audio file is empty (0 bytes).")

    limit_mb = max_size_mb or settings.MAX_UPLOAD_MB
    if file_size_bytes > limit_mb * 1024 * 1024:
        raise AudioLimitExceededError(
            f"File size ({file_size_bytes / (1024 * 1024):.2f} MB) exceeds maximum allowed limit of {limit_mb} MB."
        )
    try:
        info = sf.info(file_path)
    except Exception as e:
        raise AudioDecodeError(f"Corrupted or unsupported audio format: {str(e)}")

    if info.frames == 0 or info.samplerate <= 0:
        raise AudioDecodeError("Audio contains zero valid frames or invalid sample rate.")

    duration_seconds = float(info.duration)
    limit_duration = max_duration_seconds or settings.MAX_AUDIO_DURATION_SECONDS
    if duration_seconds > limit_duration:
        raise AudioLimitExceededError(
            f"Audio duration ({duration_seconds:.1f} s) exceeds maximum allowed duration of {limit_duration} s."
        )
    try:
        data, sample_rate = sf.read(file_path, dtype="float32", always_2d=False)
    except Exception as e:
        raise AudioDecodeError(f"Failed to read audio waveform stream: {str(e)}")

    channels = 1 if data.ndim == 1 else data.shape[1]
    num_samples = len(data)

    return DecodedAudio(
        waveform=data,
        sample_rate=sample_rate,
        channels=channels,
        duration_seconds=duration_seconds,
        num_samples=num_samples,
        format=info.format,
        subtype=info.subtype,
        file_size_bytes=file_size_bytes,
    )