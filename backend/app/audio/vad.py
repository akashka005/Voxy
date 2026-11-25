import numpy as np
from dataclasses import dataclass
from typing import List, Tuple
@dataclass
class VADInterval:
    start_time: float
    end_time: float
    is_speech: bool


class SimpleEnergyVAD:
    def __init__(
        self,
        sample_rate: int = 16000,
        frame_duration_ms: int = 30,
        frame_shift_ms: int = 15,
        energy_threshold_ratio: float = 0.05,
        hangover_frames: int = 4,
    ):
        self.sample_rate = sample_rate
        self.frame_length = int(sample_rate * (frame_duration_ms / 1000.0))
        self.frame_shift = int(sample_rate * (frame_shift_ms / 1000.0))
        self.energy_threshold_ratio = energy_threshold_ratio
        self.hangover_frames = hangover_frames

    def process(self, waveform: np.ndarray) -> Tuple[np.ndarray, float]:
        if len(waveform) < self.frame_length:
            return np.ones(1, dtype=bool), 1.0
        num_frames = 1 + (len(waveform) - self.frame_length) // self.frame_shift
        frame_energies = np.zeros(num_frames, dtype=np.float32)

        for i in range(num_frames):
            start = i * self.frame_shift
            end = start + self.frame_length
            frame = waveform[start:end]
            frame_energies[i] = np.mean(frame ** 2)

        max_energy = np.max(frame_energies) if len(frame_energies) > 0 else 0.0
        min_energy = np.min(frame_energies) if len(frame_energies) > 0 else 0.0
        threshold = max(min_energy + (max_energy - min_energy) * self.energy_threshold_ratio, 1e-5)
        raw_mask = frame_energies > threshold
        smoothed_mask = np.copy(raw_mask)
        hangover = 0
        for i in range(len(smoothed_mask)):
            if raw_mask[i]:
                hangover = self.hangover_frames
            elif hangover > 0:
                smoothed_mask[i] = True
                hangover -= 1

        speech_ratio = float(np.mean(smoothed_mask)) if len(smoothed_mask) > 0 else 0.0
        return smoothed_mask, speech_ratio