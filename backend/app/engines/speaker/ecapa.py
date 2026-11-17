"""
ECAPA-TDNN Speaker Verification Engine — Phase 2 Stub

Status: UNAVAILABLE — embedding inference not yet implemented.
Enrollment/delete API endpoints exist; actual speaker embedding comparison
will be wired in Phase 2 via SpeechBrain.

Rule: Never fabricate similarity scores. Return UNAVAILABLE until implemented.
"""
from __future__ import annotations

import logging
from typing import Any, List, Optional
import numpy as np

from backend.app.engines.base import BaseEngine
from backend.app.schemas.common import EngineStatus, EngineMetadata, SpeakerMatchStatus
from backend.app.schemas.speaker import SpeakerVerificationResult

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

    engine_name = "speaker_ecapa"

    def __init__(self) -> None:
        self._available = False
        self._limitations = [
            "ECAPA-TDNN embedding inference not implemented in Phase 1.",
            "Planned integration with SpeechBrain in Phase 2."
        ]

    def load(self) -> None:
        pass

    def availability(self) -> EngineStatus:
        return EngineStatus.UNAVAILABLE

    def metadata(self) -> EngineMetadata:
        return EngineMetadata(
            engine_name=self.engine_name,
            model_name="ecapa-tdnn",
            version="0.0.0-phase2-stub",
            device="cpu",
            details={"phase": 2, "planned_backend": "speechbrain/spkrec-ecapa-voxceleb"}
        )

    def limitations(self) -> List[str]:
        return list(self._limitations)

    def embed(self, waveform: np.ndarray, sample_rate: int = 16000) -> Optional[np.ndarray]:
        """Extract a d-vector embedding from an audio waveform."""
        return None

    def compare(
        self,
        embedding_a: np.ndarray,
        embedding_b: np.ndarray,
    ) -> Optional[float]:
        """Compute cosine similarity between two embeddings."""
        return None

    def infer(self, payload: Any) -> SpeakerVerificationResult:
        """
        Run speaker verification against an enrolled embedding.
        Always returns UNAVAILABLE in Phase 1 without fabricating scores.
        """
        return SpeakerVerificationResult(
            availability=EngineStatus.UNAVAILABLE,
            status=SpeakerMatchStatus.INCONCLUSIVE,
            similarity=None,
            enrolled_profile_id=None,
            limitations=self.limitations(),
        )
