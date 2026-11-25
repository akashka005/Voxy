from __future__ import annotations
import logging
from typing import Any, List, Optional
import numpy as np
from backend.app.engines.base import BaseEngine
from backend.app.schemas.common import EngineStatus, EngineMetadata, SpeakerMatchStatus
from backend.app.schemas.speaker import SpeakerVerificationResult
logger = logging.getLogger("voxsentinel")
class ECAPATDNNEngine(BaseEngine):
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
        return None

    def compare(
        self,
        embedding_a: np.ndarray,
        embedding_b: np.ndarray,
    ) -> Optional[float]:
        return None

    def infer(self, payload: Any) -> SpeakerVerificationResult:
        return SpeakerVerificationResult(
            availability=EngineStatus.UNAVAILABLE,
            status=SpeakerMatchStatus.INCONCLUSIVE,
            similarity=None,
            enrolled_profile_id=None,
            limitations=self.limitations(),
        )
