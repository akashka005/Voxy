from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import numpy as np

from backend.app.audio.decoder import decode_audio_file, DecodedAudio
from backend.app.audio.preprocessing import preprocess_audio
from backend.app.audio.segmentation import create_overlapping_segments, AudioSegment
from backend.app.services.storage_service import storage_service


@dataclass
class ProcessedAudioBundle:
    decoded: DecodedAudio
    preprocessed_waveform: np.ndarray
    segments: List[AudioSegment]
    duration_seconds: float
    sample_rate: int
    speech_ratio: float


class AudioService:
    """
    Coordinates audio ingestion, validation, decoding, preprocessing,
    VAD analysis, and segmentation.
    """

    def process_file(
        self,
        file_path: str,
        target_sample_rate: int = 16000,
        window_duration_seconds: float = 4.0,
        hop_duration_seconds: float = 2.0,
    ) -> ProcessedAudioBundle:
        """
        Executes complete audio processing pipeline on a validated file.
        """
        # 1. Decode stream & enforce upload size/duration bounds
        decoded = decode_audio_file(file_path)

        # 2. Preprocess: mono conversion, resample to 16 kHz, peak normalize
        preprocessed = preprocess_audio(
            decoded.waveform,
            orig_sr=decoded.sample_rate,
            target_sr=target_sample_rate,
            normalize=True,
        )

        # 3. Create timestamped overlapping segments with VAD
        segments = create_overlapping_segments(
            waveform=preprocessed,
            sample_rate=target_sample_rate,
            window_duration_seconds=window_duration_seconds,
            hop_duration_seconds=hop_duration_seconds,
        )

        overall_speech_ratio = (
            float(np.mean([s.vad_speech_ratio for s in segments]))
            if segments
            else 0.0
        )

        return ProcessedAudioBundle(
            decoded=decoded,
            preprocessed_waveform=preprocessed,
            segments=segments,
            duration_seconds=decoded.duration_seconds,
            sample_rate=target_sample_rate,
            speech_ratio=overall_speech_ratio,
        )


audio_service = AudioService()
