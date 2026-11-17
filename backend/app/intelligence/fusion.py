from typing import List, Dict, Any, Optional, Tuple
from backend.app.schemas.common import (
    EngineStatus,
    RiskLevel,
    SecurityDecision,
    ScoreType,
)
from backend.app.schemas.risk import OverallAssessment, EvidenceItem
from backend.app.schemas.authenticity import AuthenticityResult
from backend.app.schemas.speaker import SpeakerVerificationResult
from backend.app.schemas.fraud import FraudIntelligenceResult
from backend.app.intelligence.uncertainty import (
    compute_evidence_sufficiency,
    compute_fusion_uncertainty,
)


class RiskFusionEngine:
    """
    Transparent, explainable, uncertainty-aware baseline risk fusion engine.
    Combines independent evidence sources (acoustic authenticity, fraud intent, speaker identity)
    without conflating missing evidence with zero risk.
    """

    fusion_version = "1.0.0-baseline"

    def fuse(
        self,
        authenticity: Optional[AuthenticityResult] = None,
        fraud: Optional[FraudIntelligenceResult] = None,
        speaker: Optional[SpeakerVerificationResult] = None,
        audio_speech_ratio: float = 1.0,
    ) -> Tuple[OverallAssessment, List[EvidenceItem]]:
        """
        Computes composite threat score, risk level, and uncertainty.
        Generates compiled evidence trail.
        """
        evidence_items: List[EvidenceItem] = []
        contributing_factors: List[str] = []

        # 1. Evaluate engine statuses
        engine_statuses: Dict[str, EngineStatus] = {
            "authenticity": authenticity.availability if authenticity else EngineStatus.UNAVAILABLE,
            "fraud_intelligence": fraud.availability if fraud else EngineStatus.UNAVAILABLE,
            "speaker_verification": speaker.availability if speaker else EngineStatus.UNAVAILABLE,
        }

        sufficiency = compute_evidence_sufficiency(engine_statuses)

        # 2. Authenticity evidence
        auth_risk_score = 0.0  # 0 to 100
        auth_has_data = False
        if authenticity and authenticity.availability == EngineStatus.AVAILABLE:
            auth_has_data = True
            # In ASVspoof, bonafide_score closer to 0 means spoof, closer to 1 means bonafide
            if authenticity.score is not None:
                # Spoof risk = (1.0 - bonafide_score) * 100
                auth_risk_score = (1.0 - authenticity.score) * 100.0
                if auth_risk_score > 60.0:
                    evidence_items.append(
                        EvidenceItem(
                            category="synthetic_speech_signal",
                            description=f"AASIST engine detected strong synthetic speech characteristics (risk: {auth_risk_score:.1f}%).",
                            severity="HIGH" if auth_risk_score > 80.0 else "MEDIUM",
                            source_engine="authenticity",
                        )
                    )
                    contributing_factors.append("Acoustic synthetic speech indicators")

        # 3. Fraud Intent Evidence
        fraud_risk_score = 0.0
        fraud_has_data = False
        if fraud and fraud.availability == EngineStatus.AVAILABLE:
            fraud_has_data = True
            severity_weights = {"LOW": 15.0, "MEDIUM": 35.0, "HIGH": 70.0, "CRITICAL": 95.0}
            max_fraud_score = 0.0
            for ev in fraud.evidence:
                weight = severity_weights.get(ev.severity, 30.0)
                if weight > max_fraud_score:
                    max_fraud_score = weight
                evidence_items.append(
                    EvidenceItem(
                        category=ev.category,
                        timestamp=ev.start_time,
                        description=f"{ev.explanation} Excerpt: {ev.excerpt}",
                        severity=ev.severity,
                        source_engine="fraud_intelligence",
                    )
                )
            fraud_risk_score = max_fraud_score
            if fraud_risk_score > 40.0:
                contributing_factors.append("Social-engineering and fraud intent indicators")

        # 4. Synthesize Risk Score (interpretable weighted heuristic)
        if not auth_has_data and not fraud_has_data:
            # Complete absence of evidence is NOT zero risk; it is an unverified / inconclusive interaction
            baseline_score = 45.0  # Moderate unverified baseline
            decision = SecurityDecision.MONITOR
            risk_level = RiskLevel.MEDIUM
            contributing_factors.append("Insufficient engine evidence available for definitive assessment")
        elif auth_has_data and not fraud_has_data:
            baseline_score = auth_risk_score
        elif fraud_has_data and not auth_has_data:
            baseline_score = fraud_risk_score
        else:
            # Both available: weigh independent factors
            # High fraud alone or high spoof alone elevates the overall risk!
            baseline_score = max(
                auth_risk_score * 0.5 + fraud_risk_score * 0.5,
                auth_risk_score * 0.85,  # Strong spoof is an immediate threat
                fraud_risk_score * 0.85,  # Critical fraud is an immediate threat
            )

        # Disagreement factor between authenticity and fraud
        disagreement = 0.0
        if auth_has_data and fraud_has_data:
            disagreement = abs(auth_risk_score - fraud_risk_score) / 100.0

        uncertainty = compute_fusion_uncertainty(
            evidence_sufficiency=sufficiency,
            model_confidence=authenticity.confidence if authenticity else None,
            audio_speech_ratio=audio_speech_ratio,
            disagreement_factor=disagreement,
        )

        final_score = float(min(max(baseline_score, 0.0), 100.0))

        # 5. Determine Risk Level
        if final_score < 35.0:
            risk_level = RiskLevel.LOW
        elif final_score < 70.0:
            risk_level = RiskLevel.MEDIUM
        else:
            risk_level = RiskLevel.HIGH

        # 6. Security Decision
        if any(ev.severity == "CRITICAL" for ev in evidence_items) or final_score >= 85.0:
            decision = SecurityDecision.RESTRICT_SUPPORTED_ACTION
        elif final_score >= 70.0:
            decision = SecurityDecision.REQUIRE_VERIFICATION
        elif sufficiency < 0.5:
            # Missing or incomplete modalities mandate MONITOR recommendation
            decision = SecurityDecision.MONITOR
        elif final_score >= 45.0:
            decision = SecurityDecision.WARNING
        else:
            decision = SecurityDecision.LOW_CONCERN

        assessment = OverallAssessment(
            risk_level=risk_level,
            risk_score=round(final_score, 1),
            confidence=round(1.0 - uncertainty, 2),
            uncertainty=round(uncertainty, 2),
            evidence_sufficiency=round(sufficiency, 2),
            decision=decision,
            score_type=ScoreType.UNCALIBRATED_HEURISTIC,
        )

        return assessment, evidence_items


risk_fusion_engine = RiskFusionEngine()
