from dataclasses import dataclass
from typing import List
import numpy as np
from backend.app.audio.vad import SimpleEnergyVAD


@dataclass
class AudioSegment:
    segment_index: int
    start_time: float
    end_time: float
    sample_rate: int
    num_samples: int
    waveform: np.ndarray
    is_speech: bool
    vad_speech_ratio: float


def create_overlapping_segments(
    waveform: np.ndarray,
    sample_rate: int = 16000,
    window_duration_seconds: float = 4.0,
    hop_duration_seconds: float = 2.0,
    min_speech_ratio: float = 0.1,
) -> List[AudioSegment]:
    window_samples = int(sample_rate * window_duration_seconds)
    hop_samples = int(sample_rate * hop_duration_seconds)
    total_samples = len(waveform)

    vad = SimpleEnergyVAD(sample_rate=sample_rate)
    if total_samples <= window_samples:
        padded = np.zeros(window_samples, dtype=np.float32)
        padded[:total_samples] = waveform
        _, speech_ratio = vad.process(waveform)
        return [
            AudioSegment(
                segment_index=0,
                start_time=0.0,
                end_time=float(total_samples) / sample_rate,
                sample_rate=sample_rate,
                num_samples=window_samples,
                waveform=padded,
                is_speech=(speech_ratio >= min_speech_ratio),
                vad_speech_ratio=speech_ratio,
            )
        ]

    segments: List[AudioSegment] = []
    seg_idx = 0
    start_sample = 0

    while start_sample < total_samples:
        end_sample = start_sample + window_samples

        if end_sample <= total_samples:
            seg_wave = waveform[start_sample:end_sample]
            actual_end_time = float(end_sample) / sample_rate
        else:
            seg_wave = np.zeros(window_samples, dtype=np.float32)
            remaining = total_samples - start_sample
            seg_wave[:remaining] = waveform[start_sample:total_samples]
            actual_end_time = float(total_samples) / sample_rate

        start_time = float(start_sample) / sample_rate
        _, speech_ratio = vad.process(seg_wave)

        segments.append(
            AudioSegment(
                segment_index=seg_idx,
                start_time=start_time,
                end_time=actual_end_time,
                sample_rate=sample_rate,
                num_samples=window_samples,
                waveform=seg_wave,
                is_speech=(speech_ratio >= min_speech_ratio),
                vad_speech_ratio=speech_ratio,
            )
        )
        seg_idx += 1
        start_sample += hop_samples
    return segments