from typing import List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import EngineStatus


class FraudEvidenceItem(BaseModel):
    category: str
    excerpt: str
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    severity: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    rule_id: Optional[str] = None
    explanation: Optional[str] = None


class FraudIntelligenceResult(BaseModel):
    availability: EngineStatus
    model_id: Optional[str] = None
    categories: List[str] = Field(default_factory=list)
    evidence: List[FraudEvidenceItem] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
