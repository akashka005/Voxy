from typing import List, Dict, Any, Optional
from backend.app.schemas.risk import OverallAssessment, EvidenceItem
from backend.app.schemas.authenticity import AuthenticityResult
from backend.app.schemas.fraud import FraudIntelligenceResult


def build_evidence_explanation(
    assessment: OverallAssessment,
    evidence_items: List[EvidenceItem],
    authenticity: Optional[AuthenticityResult] = None,
    fraud: Optional[FraudIntelligenceResult] = None,
) -> Dict[str, Any]:
    """
    Constructs a comprehensive, transparent evidence explanation structure
    detailing findings across authenticity, semantic fraud, and uncertainty.
    """
    findings_summary: List[str] = []

    if authenticity and authenticity.score is not None:
        spoof_pct = (1.0 - authenticity.score) * 100
        findings_summary.append(f"Acoustic synthetic likelihood: {spoof_pct:.1f}%")

    if fraud and fraud.categories:
        findings_summary.append(f"Detected fraud categories: {', '.join(fraud.categories)}")

    return {
        "overall_decision": assessment.decision.value,
        "risk_level": assessment.risk_level.value,
        "risk_score": assessment.risk_score,
        "score_type": assessment.score_type.value,
        "uncertainty": assessment.uncertainty,
        "evidence_sufficiency": assessment.evidence_sufficiency,
        "findings_summary": findings_summary,
        "evidence_count": len(evidence_items),
        "disclaimer": (
            "VoxSentinel outputs are uncalibrated advisory risk indicators. "
            "Evidence must be weighed with contextual and out-of-band identity checks."
        ),
    }
