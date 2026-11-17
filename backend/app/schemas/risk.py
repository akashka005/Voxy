from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from backend.app.schemas.common import (
    EngineStatus,
    RiskLevel,
    SecurityDecision,
    ScoreType,
)


class OverallAssessment(BaseModel):
    risk_level: RiskLevel
    risk_score: float = Field(..., ge=0.0, le=100.0)
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0)
    uncertainty: Optional[float] = Field(None, ge=0.0, le=1.0)
    evidence_sufficiency: Optional[float] = Field(None, ge=0.0, le=1.0)
    decision: SecurityDecision
    score_type: ScoreType = ScoreType.UNCALIBRATED_HEURISTIC


class TemporalAnalysisResult(BaseModel):
    availability: EngineStatus = EngineStatus.UNAVAILABLE
    findings: List[Dict[str, Any]] = Field(default_factory=list)
    limitations: List[str] = Field(
        default_factory=lambda: ["Temporal analysis is scheduled for research phase."]
    )


class EvidenceItem(BaseModel):
    category: str
    timestamp: Optional[float] = None
    description: str
    severity: str = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    source_engine: Optional[str] = None
