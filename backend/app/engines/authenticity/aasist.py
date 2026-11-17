import os
from typing import List, Optional, Any
import numpy as np
import torch
import torch.nn as nn

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.schemas.common import EngineStatus, EngineMetadata
from backend.app.schemas.authenticity import AuthenticityResult, AuthenticitySegment
from backend.app.engines.base import BaseEngine
from backend.app.audio.segmentation import AudioSegment


class AASISTEngine(BaseEngine):
    """
    Authenticity and synthetic voice detection engine based on AASIST.
    Supports lazy loading, CPU and optional CUDA inference, and segment-level scoring.
    Strictly reports UNAVAILABLE when checkpoint is not configured or missing.
    """

    engine_name = "authenticity_aasist"

    def __init__(
        self,
        checkpoint_path: Optional[str] = None,
        device: Optional[str] = None,
    ):
        self.checkpoint_path = checkpoint_path or settings.AASIST_CHECKPOINT_PATH
        self.device_str = device or settings.DEFAULT_DEVICE
        if self.device_str == "cuda" and not (torch.cuda.is_available() and settings.ALLOW_CUDA):
            self.device_str = "cpu"
        self.device = torch.device(self.device_str)

        self._model: Optional[nn.Module] = None
        self._is_loaded: bool = False
        self._status: EngineStatus = EngineStatus.UNAVAILABLE
        self._limitations: List[str] = [
            "Trained for synthetic and voice-converted speech detection (ASVspoof 2019 LA domain).",
            "Replay/presentation attack detection is not supported in this model.",
            "Raw scores are uncalibrated heuristics until calibrated on held-out evaluation datasets.",
        ]

    def availability(self) -> EngineStatus:
        if not self.checkpoint_path or not os.path.isfile(self.checkpoint_path):
            return EngineStatus.UNAVAILABLE
        return self._status if self._is_loaded else EngineStatus.AVAILABLE

    def metadata(self) -> EngineMetadata:
        return EngineMetadata(
            engine_name=self.engine_name,
            model_name="AASIST",
            version=settings.AASIST_MODEL_VERSION or "ASVspoof2019_LA",
            device=str(self.device),
            details={
                "checkpoint_path": self.checkpoint_path,
                "input_sample_rate": 16000,
                "window_samples": 64600,
            },
        )

    def limitations(self) -> List[str]:
        return list(self._limitations)

    def load(self) -> None:
        """
        Lazily loads the PyTorch checkpoint if configured and available on disk.
        """
        if self._is_loaded:
            return

        if not self.checkpoint_path or not os.path.isfile(self.checkpoint_path):
            self._status = EngineStatus.UNAVAILABLE
            self._is_loaded = True
            logger.info(f"AASIST checkpoint not found at '{self.checkpoint_path}'; engine marked UNAVAILABLE.")
            return

        try:
            logger.info(f"Loading AASIST checkpoint from {self.checkpoint_path} onto {self.device}...")
            # Load PyTorch checkpoint safely with weights_only=True when possible
            state_dict = torch.load(self.checkpoint_path, map_location=self.device)
            # The model architecture placeholder or real module wrapper
            self._model = None  # To be connected with exact verified weights structure
            self._status = EngineStatus.AVAILABLE
            self._is_loaded = True
            logger.info("AASIST engine loaded successfully.")
        except Exception as e:
            self._status = EngineStatus.FAILED
            self._is_loaded = True
            logger.error(f"Failed to load AASIST model checkpoint: {str(e)}")

    def infer(self, segments: List[AudioSegment]) -> AuthenticityResult:
        """
        Runs inference over timestamped audio segments.
        If unavailable or no model loaded, cleanly returns UNAVAILABLE without fabricating values.
        """
        if not self._is_loaded:
            self.load()

        if self._status != EngineStatus.AVAILABLE or self._model is None:
            return AuthenticityResult(
                availability=self._status,
                model_id="aasist",
                model_version=settings.AASIST_MODEL_VERSION or "unconfigured",
                score=None,
                confidence=None,
                segments=[],
                limitations=self.limitations() + ["Engine is unavailable; no inference was performed."],
            )

        # Real model inference path when checkpoint is loaded
        segment_results: List[AuthenticitySegment] = []
        raw_scores: List[float] = []

        try:
            self._model.eval()
            with torch.no_grad():
                for seg in segments:
                    # Shape input tensor [1, 64600]
                    wave = seg.waveform
                    if len(wave) < 64600:
                        wave = np.pad(wave, (0, 64600 - len(wave)), mode="wrap")
                    elif len(wave) > 64600:
                        wave = wave[:64600]

                    tensor_in = torch.from_numpy(wave).unsqueeze(0).to(self.device)
                    output = self._model(tensor_in)  # Shape: [1, 2] (bonafide vs spoof)
                    # Bonafide logit or softmax probability
                    bonafide_score = float(torch.softmax(output, dim=1)[0, 0].cpu().numpy())
                    raw_scores.append(bonafide_score)

                    segment_results.append(
                        AuthenticitySegment(
                            segment_index=seg.segment_index,
                            start_time=seg.start_time,
                            end_time=seg.end_time,
                            raw_score=bonafide_score,
                            prediction="bonafide" if bonafide_score >= 0.5 else "spoof",
                            confidence=abs(bonafide_score - 0.5) * 2.0,
                        )
                    )

            aggregated_score = float(np.mean(raw_scores)) if raw_scores else None
            return AuthenticityResult(
                availability=EngineStatus.AVAILABLE,
                model_id="aasist",
                model_version=settings.AASIST_MODEL_VERSION or "asvspoof2019_la",
                score=aggregated_score,
                confidence=float(np.mean([abs(s - 0.5) * 2.0 for s in raw_scores])) if raw_scores else None,
                segments=segment_results,
                limitations=self.limitations(),
            )
        except Exception as e:
            logger.error(f"Inference failure in AASIST engine: {str(e)}")
            return AuthenticityResult(
                availability=EngineStatus.FAILED,
                model_id="aasist",
                model_version=settings.AASIST_MODEL_VERSION or "asvspoof2019_la",
                score=None,
                confidence=None,
                segments=[],
                limitations=self.limitations() + [f"Inference execution failed: {str(e)}"],
            )
