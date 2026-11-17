from typing import Optional, Dict, Any, List
from backend.app.schemas.common import EngineStatus


def compute_evidence_sufficiency(
    engine_statuses: Dict[str, EngineStatus],
    expected_engines: Optional[List[str]] = None,
) -> float:
    """
    Computes evidence sufficiency (0.0 to 1.0) representing the proportion of expected
    modalities that were actually available and reliable.
    A missing engine output is treated as missing evidence, never zero risk.
    """
    targets = expected_engines or [
        "authenticity",
        "speech_intelligence",
        "fraud_intelligence",
    ]

    if not targets:
        return 1.0

    available_count = 0
    for eng in targets:
        status = engine_statuses.get(eng, EngineStatus.UNAVAILABLE)
        if status == EngineStatus.AVAILABLE:
            available_count += 1
        elif status == EngineStatus.INCONCLUSIVE:
            available_count += 0.5  # Partial evidence credit

    return float(available_count / len(targets))


def compute_fusion_uncertainty(
    evidence_sufficiency: float,
    model_confidence: Optional[float] = None,
    audio_speech_ratio: float = 1.0,
    disagreement_factor: float = 0.0,
) -> float:
    """
    Estimates the overall uncertainty of the assessment (0.0 = high certainty, 1.0 = maximal uncertainty).
    Driven by:
    - Missing evidence (lower sufficiency -> higher uncertainty)
    - Low speech ratio in audio (poor acoustic evidence)
    - Conflicting findings across engines
    - Low model confidence
    """
    # 1. Uncertainty penalty from missing evidence
    missing_evidence_penalty = (1.0 - evidence_sufficiency) * 0.5

    # 2. Quality penalty
    quality_penalty = (1.0 - min(audio_speech_ratio, 1.0)) * 0.2

    # 3. Model confidence factor
    conf = model_confidence if model_confidence is not None else 0.5
    conf_penalty = (1.0 - conf) * 0.2

    # 4. Engine disagreement
    disagreement_penalty = min(disagreement_factor, 1.0) * 0.1

    total_uncertainty = (
        missing_evidence_penalty + quality_penalty + conf_penalty + disagreement_penalty
    )

    return float(min(max(total_uncertainty, 0.0), 1.0))
