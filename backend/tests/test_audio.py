import os
import tempfile
import numpy as np
import soundfile as sf
import pytest

from backend.app.audio.decoder import (
    decode_audio_file,
    AudioDecodeError,
    AudioLimitExceededError,
)
from backend.app.audio.preprocessing import to_mono, resample_waveform, preprocess_audio
from backend.app.audio.vad import SimpleEnergyVAD
from backend.app.audio.segmentation import create_overlapping_segments
from backend.app.services.storage_service import storage_service
from backend.app.services.audio_service import audio_service


@pytest.fixture
def temp_wav_file():
    """Generates a valid 3-second 44.1 kHz stereo sine wave test audio file."""
    sr = 44100
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # 440 Hz tone on left, 880 Hz tone on right
    left = 0.5 * np.sin(2 * np.pi * 440 * t)
    right = 0.5 * np.sin(2 * np.pi * 880 * t)
    stereo = np.column_stack((left, right)).astype(np.float32)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        file_path = f.name

    sf.write(file_path, stereo, sr)
    yield file_path

    if os.path.exists(file_path):
        os.remove(file_path)


def test_decode_valid_audio(temp_wav_file):
    decoded = decode_audio_file(temp_wav_file)
    assert decoded.sample_rate == 44100
    assert decoded.channels == 2
    assert abs(decoded.duration_seconds - 3.0) < 0.05
    assert decoded.format == "WAV"
    assert decoded.file_size_bytes > 0


def test_decode_empty_file():
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        path = f.name
    try:
        with pytest.raises(AudioDecodeError, match="empty"):
            decode_audio_file(path)
    finally:
        if os.path.exists(path):
            os.remove(path)


def test_decode_corrupt_file():
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        path = f.name
        f.write(b"NOT_A_VALID_WAV_HEADER_CORRUPTED_BYTES")
    try:
        with pytest.raises(AudioDecodeError, match="Corrupted or unsupported"):
            decode_audio_file(path)
    finally:
        if os.path.exists(path):
            os.remove(path)


def test_decode_duration_limit_exceeded(temp_wav_file):
    with pytest.raises(AudioLimitExceededError, match="duration"):
        # Test with max_duration of 1.0 second on a 3.0 second file
        decode_audio_file(temp_wav_file, max_duration_seconds=1)


def test_preprocessing_pipeline():
    # 2 channels, 32000 Hz, 1 second
    sr = 32000
    t = np.linspace(0, 1.0, sr, endpoint=False)
    wave_2d = np.column_stack((np.sin(2 * np.pi * 440 * t), np.sin(2 * np.pi * 440 * t))).astype(np.float32)

    preprocessed = preprocess_audio(wave_2d, orig_sr=sr, target_sr=16000)
    assert preprocessed.ndim == 1
    assert len(preprocessed) == 16000  # Resampled from 32 kHz to 16 kHz
    assert np.max(np.abs(preprocessed)) <= 1.0


def test_vad_and_segmentation():
    # Create 6 seconds of audio at 16 kHz: 3s silence, 3s speech tone
    sr = 16000
    silence = np.zeros(sr * 3, dtype=np.float32)
    tone = (0.5 * np.sin(2 * np.pi * 300 * np.linspace(0, 3, sr * 3))).astype(np.float32)
    audio = np.concatenate((silence, tone))

    segments = create_overlapping_segments(
        audio,
        sample_rate=sr,
        window_duration_seconds=4.0,
        hop_duration_seconds=2.0,
    )

    assert len(segments) >= 2
    # First segment is mostly silence
    assert segments[0].start_time == 0.0
    assert segments[0].end_time == 4.0
    assert segments[0].sample_rate == 16000
    assert segments[0].num_samples == 64000  # 4.0s * 16000

    # Later segment covers active tone
    last_seg = segments[-1]
    assert last_seg.vad_speech_ratio > 0.0


def test_storage_service_safe_cleanup():
    content = b"RIFF dummy audio content for storage testing"
    saved_path = storage_service.save_temporary_audio(content, extension="wav")
    assert os.path.exists(saved_path)

    # Check filename is a UUID and not raw input
    basename = os.path.basename(saved_path)
    assert basename.endswith(".wav")
    assert len(basename) > 20

    storage_service.cleanup_temporary_file(saved_path)
    assert not os.path.exists(saved_path)


def test_audio_service_process_file(temp_wav_file):
    bundle = audio_service.process_file(temp_wav_file)
    assert bundle.sample_rate == 16000
    assert abs(bundle.duration_seconds - 3.0) < 0.05
    assert bundle.preprocessed_waveform.ndim == 1
    assert len(bundle.segments) > 0
