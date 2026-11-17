from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class EngineStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    FAILED = "FAILED"
    INCONCLUSIVE = "INCONCLUSIVE"


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class SecurityDecision(str, Enum):
    LOW_CONCERN = "LOW_CONCERN"
    MONITOR = "MONITOR"
    WARNING = "WARNING"
    REQUIRE_VERIFICATION = "REQUIRE_VERIFICATION"
    RESTRICT_SUPPORTED_ACTION = "RESTRICT_SUPPORTED_ACTION"


class ScoreType(str, Enum):
    UNCALIBRATED_HEURISTIC = "UNCALIBRATED_HEURISTIC"
    CALIBRATED_PROBABILITY = "CALIBRATED_PROBABILITY"


class SpeakerMatchStatus(str, Enum):
    MATCH = "MATCH"
    MISMATCH = "MISMATCH"
    INCONCLUSIVE = "INCONCLUSIVE"


class EngineMetadata(BaseModel):
    engine_name: str
    model_name: Optional[str] = None
    version: Optional[str] = None
    device: Optional[str] = None
    details: Optional[dict] = None


class BaseEngineResult(BaseModel):
    availability: EngineStatus
    model_id: Optional[str] = None
    model_version: Optional[str] = None
    limitations: List[str] = Field(default_factory=list)
