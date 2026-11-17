from typing import List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import EngineStatus


class TranscriptSegment(BaseModel):
    segment_index: int
    start_time: float
    end_time: float
    text: str
    confidence: Optional[float] = None
    language: Optional[str] = None


class SpeechIntelligenceResult(BaseModel):
    availability: EngineStatus
    model_id: Optional[str] = None
    model_version: Optional[str] = None
    language: Optional[str] = None
    transcript: Optional[str] = None
    segments: List[TranscriptSegment] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
