import pytest
from backend.app.schemas.common import (
    EngineStatus,
    RiskLevel,
    SecurityDecision,
    ScoreType,
)
from backend.app.schemas.authenticity import AuthenticityResult, AuthenticitySegment
from backend.app.schemas.fraud import FraudIntelligenceResult, FraudEvidenceItem
from backend.app.intelligence.uncertainty import (
    compute_evidence_sufficiency,
    compute_fusion_uncertainty,
)
from backend.app.intelligence.temporal_analyzer import temporal_analyzer
from backend.app.intelligence.fusion import risk_fusion_engine
from backend.app.intelligence.decision_engine import decision_engine


def test_evidence_sufficiency_with_missing_modalities():
    # Only authenticity available
    statuses = {
        "authenticity": EngineStatus.AVAILABLE,
        "speech_intelligence": EngineStatus.UNAVAILABLE,
        "fraud_intelligence": EngineStatus.UNAVAILABLE,
    }
    sufficiency = compute_evidence_sufficiency(statuses)
    assert abs(sufficiency - (1.0 / 3.0)) < 0.01

    # All available
    all_statuses = {
        "authenticity": EngineStatus.AVAILABLE,
        "speech_intelligence": EngineStatus.AVAILABLE,
        "fraud_intelligence": EngineStatus.AVAILABLE,
    }
    assert compute_evidence_sufficiency(all_statuses) == 1.0


def test_fusion_rule_missing_evidence_is_not_zero_risk():
    # All engines unavailable
    assessment, evidence = risk_fusion_engine.fuse(
        authenticity=AuthenticityResult(availability=EngineStatus.UNAVAILABLE),
        fraud=FraudIntelligenceResult(availability=EngineStatus.UNAVAILABLE),
    )
    # Must NOT be zero risk; must reflect inconclusive monitor state
    assert assessment.risk_score > 0.0
    assert assessment.decision == SecurityDecision.MONITOR
    assert assessment.score_type == ScoreType.UNCALIBRATED_HEURISTIC


def test_fusion_critical_fraud_triggers_restrict_action():
    # Bonafide voice (score=0.95 -> low spoof risk) but CRITICAL OTP fraud
    auth = AuthenticityResult(
        availability=EngineStatus.AVAILABLE,
        score=0.95,
        confidence=0.9,
    )
    fraud = FraudIntelligenceResult(
        availability=EngineStatus.AVAILABLE,
        categories=["credential_harvesting"],
        evidence=[
            FraudEvidenceItem(
                category="credential_harvesting",
                excerpt="Tell me your OTP right now",
                severity="CRITICAL",
                explanation="OTP Harvesting detected",
            )
        ],
    )

    assessment, evidence = risk_fusion_engine.fuse(authenticity=auth, fraud=fraud)
    assert assessment.risk_level == RiskLevel.HIGH
    assert assessment.decision == SecurityDecision.RESTRICT_SUPPORTED_ACTION
    assert len(evidence) >= 1


def test_temporal_analyzer_abrupt_score_drop():
    segments = [
        AuthenticitySegment(segment_index=0, start_time=0.0, end_time=4.0, raw_score=0.90),
        AuthenticitySegment(segment_index=1, start_time=2.0, end_time=6.0, raw_score=0.40),  # Drop of 0.50
    ]
    res = temporal_analyzer.analyze(segments)
    assert res.availability == EngineStatus.AVAILABLE
    assert len(res.findings) == 1
    assert res.findings[0]["type"] == "AUTHENTICITY_SUDDEN_DROP"
