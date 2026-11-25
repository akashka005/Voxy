from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
import uuid

from backend.app.schemas.common import JobStatus
from backend.app.schemas.authenticity import AuthenticityResult
from backend.app.schemas.speaker import SpeakerVerificationResult
from backend.app.schemas.speech import SpeechIntelligenceResult
from backend.app.schemas.fraud import FraudIntelligenceResult
from backend.app.schemas.risk import OverallAssessment, TemporalAnalysisResult, EvidenceItem


class AnalysisOptions(BaseModel):
    enable_authenticity: bool = True
    enable_speech: bool = True
    enable_fraud: bool = True
    speaker_profile_id: Optional[str] = None


class AnalysisCreateResponse(BaseModel):
    analysis_id: str
    status: JobStatus
    created_at: datetime
    message: str = "Analysis job queued successfully."


class AnalysisResponse(BaseModel):
    analysis_id: str
    filename: Optional[str] = None
    status: JobStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    overall_assessment: Optional[OverallAssessment] = None
    authenticity: Optional[AuthenticityResult] = None
    speaker_verification: Optional[SpeakerVerificationResult] = None
    speech_intelligence: Optional[SpeechIntelligenceResult] = None
    fraud_intelligence: Optional[FraudIntelligenceResult] = None
    temporal_analysis: Optional[TemporalAnalysisResult] = None
    evidence: List[EvidenceItem] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    processing_time_ms: Optional[int] = 0
    error_message: Optional[str] = None


class AnalysisSummary(BaseModel):
    analysis_id: str
    filename: Optional[str] = None
    status: JobStatus
    created_at: datetime
    risk_score: Optional[float] = None
    risk_level: Optional[str] = None
    decision: Optional[str] = None


class AnalysisHistoryResponse(BaseModel):
    items: List[AnalysisSummary]
    total: int
    page: int
    size: int
