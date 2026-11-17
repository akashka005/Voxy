"""
ECAPA-TDNN Speaker Verification Engine — Phase 2 Stub

Status: UNAVAILABLE — embedding inference not yet implemented.
Enrollment/delete API endpoints exist; actual speaker embedding comparison
will be wired in Phase 2 via SpeechBrain.

Rule: Never fabricate similarity scores. Return UNAVAILABLE until implemented.
"""
from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from backend.app.engines.base import BaseEngine, EngineResult, EngineStatus

logger = logging.getLogger("voxsentinel")


class ECAPATDNNEngine(BaseEngine):
    """
    Phase 2 stub for speaker verification using ECAPA-TDNN.

    Planned implementation:
        from speechbrain.pretrained import SpeakerRecognition
        self._model = SpeakerRecognition.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir=settings.SPEAKER_MODEL_PATH,
        )

    Until Phase 2 is implemented this engine always returns UNAVAILABLE.
    """

    name = "ecapa_tdnn"
    version = "0.0.0-phase2-stub"

    def __init__(self) -> None:
        self._available = False
        logger.info(
            "ECAPATDNNEngine: Phase 2 — speaker embedding inference not yet implemented. "
            "Returning UNAVAILABLE for all requests."
        )

    @property
    def is_available(self) -> bool:
        return self._available

    def embed(self, waveform: np.ndarray, sample_rate: int) -> Optional[np.ndarray]:
        """
        Extract a d-vector embedding from an audio waveform.

        Returns None until Phase 2 is implemented.
        """
        return None

    def compare(
        self,
        embedding_a: np.ndarray,
        embedding_b: np.ndarray,
    ) -> Optional[float]:
        """
        Compute cosine similarity between two embeddings.

        Returns None until Phase 2 is implemented.
        """
        return None

    def run(
        self,
        waveform: np.ndarray,
        sample_rate: int,
        enrolled_embedding: Optional[np.ndarray] = None,
    ) -> EngineResult:
        """
        Run speaker verification against an enrolled embedding.

        Args:
            waveform: Audio waveform (mono float32, 16 kHz).
            sample_rate: Sample rate (expected 16000).
            enrolled_embedding: Pre-computed d-vector for the enrolled speaker.

        Returns:
            EngineResult with status=UNAVAILABLE and null scores.
        """
        return EngineResult(
            engine_name=self.name,
            engine_version=self.version,
            status=EngineStatus.UNAVAILABLE,
            score=None,
            confidence=None,
            metadata={
                "phase": 2,
                "reason": "ECAPA-TDNN embedding inference not yet implemented",
                "planned_backend": "speechbrain/spkrec-ecapa-voxceleb",
            },
        )
