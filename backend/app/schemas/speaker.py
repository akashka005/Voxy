from typing import List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import EngineStatus, SpeakerMatchStatus


class SpeakerVerificationResult(BaseModel):
    availability: EngineStatus = EngineStatus.UNAVAILABLE
    status: SpeakerMatchStatus = SpeakerMatchStatus.INCONCLUSIVE
    similarity: Optional[float] = None
    enrolled_profile_id: Optional[str] = None
    limitations: List[str] = Field(
        default_factory=lambda: ["Speaker verification is not enabled in this phase."]
    )
