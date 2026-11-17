from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from backend.app.schemas.common import (
    EngineStatus,
    JobStatus,
    RiskLevel,
    SecurityDecision,
    ScoreType,
)
from backend.app.schemas.authenticity import AuthenticityResult, AuthenticitySegment
from backend.app.schemas.speaker import SpeakerVerificationResult
from backend.app.schemas.speech import SpeechIntelligenceResult, TranscriptSegment
from backend.app.schemas.fraud import FraudIntelligenceResult, FraudEvidenceItem
from backend.app.schemas.risk import OverallAssessment, EvidenceItem
from backend.app.schemas.analysis import AnalysisResponse, AnalysisOptions


def test_engine_status_enum():
    assert EngineStatus.AVAILABLE == "AVAILABLE"
    assert EngineStatus.UNAVAILABLE == "UNAVAILABLE"
    assert EngineStatus.FAILED == "FAILED"
    assert EngineStatus.INCONCLUSIVE == "INCONCLUSIVE"


def test_overall_assessment_schema():
    assessment = OverallAssessment(
        risk_level=RiskLevel.HIGH,
        risk_score=82.5,
        decision=SecurityDecision.REQUIRE_VERIFICATION,
        score_type=ScoreType.UNCALIBRATED_HEURISTIC,
    )
    assert assessment.risk_level == RiskLevel.HIGH
    assert assessment.risk_score == 82.5
    assert assessment.decision == SecurityDecision.REQUIRE_VERIFICATION
    assert assessment.score_type == ScoreType.UNCALIBRATED_HEURISTIC
    assert assessment.confidence is None
    assert assessment.uncertainty is None


def test_overall_assessment_validation():
    with pytest.raises(ValidationError):
        # Score out of bounds (> 100)
        OverallAssessment(
            risk_level=RiskLevel.LOW,
            risk_score=150.0,
            decision=SecurityDecision.LOW_CONCERN,
        )


def test_authenticity_result_schema():
    result = AuthenticityResult(
        availability=EngineStatus.AVAILABLE,
        model_id="aasist",
        model_version="asvspoof2019_la",
        score=0.92,
        segments=[
            AuthenticitySegment(
                segment_index=0,
                start_time=0.0,
                end_time=4.0,
                raw_score=0.92,
                prediction="bonafide",
            )
        ],
    )
    assert result.availability == EngineStatus.AVAILABLE
    assert len(result.segments) == 1
    assert result.segments[0].raw_score == 0.92


def test_unavailable_engine_result():
    # An unavailable engine must have null score and explicit status
    auth_unavail = AuthenticityResult(
        availability=EngineStatus.UNAVAILABLE,
        limitations=["Checkpoint not configured"],
    )
    assert auth_unavail.availability == EngineStatus.UNAVAILABLE
    assert auth_unavail.score is None
    assert len(auth_unavail.limitations) == 1


def test_analysis_response_contract():
    now = datetime.now(timezone.utc)
    response = AnalysisResponse(
        analysis_id="123e4567-e89b-12d3-a456-426614174000",
        status=JobStatus.COMPLETED,
        created_at=now,
        overall_assessment=OverallAssessment(
            risk_level=RiskLevel.LOW,
            risk_score=10.0,
            decision=SecurityDecision.LOW_CONCERN,
        ),
        authenticity=AuthenticityResult(availability=EngineStatus.UNAVAILABLE),
        speech_intelligence=SpeechIntelligenceResult(
            availability=EngineStatus.AVAILABLE,
            transcript="Hello world",
            segments=[
                TranscriptSegment(
                    segment_index=0,
                    start_time=0.0,
                    end_time=1.5,
                    text="Hello world",
                )
            ],
        ),
        fraud_intelligence=FraudIntelligenceResult(
            availability=EngineStatus.AVAILABLE,
            categories=["credential_harvesting"],
            evidence=[
                FraudEvidenceItem(
                    category="credential_harvesting",
                    excerpt="Tell me your password",
                    severity="HIGH",
                )
            ],
        ),
    )
    assert response.status == JobStatus.COMPLETED
    assert response.overall_assessment.risk_score == 10.0
    assert response.speech_intelligence.transcript == "Hello world"
    assert len(response.fraud_intelligence.evidence) == 1
