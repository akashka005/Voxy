from typing import List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import EngineStatus


class AuthenticitySegment(BaseModel):
    segment_index: int
    start_time: float
    end_time: float
    raw_score: Optional[float] = None
    prediction: Optional[str] = None  # e.g. "bonafide" or "spoof"
    confidence: Optional[float] = None


class AuthenticityResult(BaseModel):
    availability: EngineStatus
    model_id: Optional[str] = None
    model_version: Optional[str] = None
    score: Optional[float] = None  # Aggregated score (e.g. 0.0 - 1.0 or raw logit)
    confidence: Optional[float] = None
    segments: List[AuthenticitySegment] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
