from typing import List, Dict, Any
from backend.app.schemas.common import SecurityDecision, RiskLevel
from backend.app.schemas.risk import OverallAssessment, EvidenceItem


class SecurityDecisionEngine:
    """
    Evaluates evidence findings and returns proportionate security recommendations.
    Provides actionable human-readable justifications and audit trails.
    """

    def evaluate_decision(
        self,
        assessment: OverallAssessment,
        evidence: List[EvidenceItem],
    ) -> Dict[str, Any]:
        critical_count = sum(1 for e in evidence if e.severity == "CRITICAL")
        high_count = sum(1 for e in evidence if e.severity == "HIGH")

        rationale: List[str] = []
        if critical_count > 0:
            rationale.append(f"Identified {critical_count} critical-severity threat pattern(s).")
        if high_count > 0:
            rationale.append(f"Identified {high_count} high-severity threat indicator(s).")
        if assessment.evidence_sufficiency < 0.6:
            rationale.append(
                f"Evidence sufficiency is low ({assessment.evidence_sufficiency * 100:.0f}%). "
                "One or more core modalities were missing."
            )

        if not rationale:
            rationale.append("No adverse spoofing or fraud patterns detected by active engines.")

        return {
            "decision": assessment.decision.value,
            "risk_level": assessment.risk_level.value,
            "risk_score": assessment.risk_score,
            "rationale": " ".join(rationale),
            "critical_threat_count": critical_count,
            "high_threat_count": high_count,
            "recommendation_scope": "Advisory recommendation only; requires explicit human/business authorization for automated enforcement.",
        }


decision_engine = SecurityDecisionEngine()
