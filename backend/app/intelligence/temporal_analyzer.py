from typing import List, Dict, Any, Optional
from backend.app.schemas.common import EngineStatus
from backend.app.schemas.risk import TemporalAnalysisResult
from backend.app.schemas.authenticity import AuthenticitySegment


class TemporalAnalyzer:
    """
    Evaluates evidence trajectories across consecutive segments over time.
    Detects abrupt authenticity score drops, voice instability, and fraud progression.
    """

    def analyze(
        self,
        authenticity_segments: Optional[List[AuthenticitySegment]] = None,
        speech_ratio: float = 1.0,
    ) -> TemporalAnalysisResult:
        if not authenticity_segments or len(authenticity_segments) < 2:
            return TemporalAnalysisResult(
                availability=EngineStatus.AVAILABLE,
                findings=[],
                limitations=[
                    "Insufficient consecutive segments for temporal transition tracking."
                ],
            )

        findings: List[Dict[str, Any]] = []

        # Check score shifts between consecutive segments
        for i in range(1, len(authenticity_segments)):
            prev_seg = authenticity_segments[i - 1]
            curr_seg = authenticity_segments[i]

            if prev_seg.raw_score is not None and curr_seg.raw_score is not None:
                delta = curr_seg.raw_score - prev_seg.raw_score
                # Significant drop in authenticity (> 0.35 drop towards spoof)
                if delta < -0.35:
                    findings.append({
                        "type": "AUTHENTICITY_SUDDEN_DROP",
                        "start_time": curr_seg.start_time,
                        "end_time": curr_seg.end_time,
                        "delta": float(delta),
                        "description": (
                            f"Abrupt drop in authenticity score from {prev_seg.raw_score:.2f} "
                            f"to {curr_seg.raw_score:.2f} detected at {curr_seg.start_time:.1f}s."
                        ),
                    })
                elif delta > 0.35:
                    findings.append({
                        "type": "AUTHENTICITY_SUDDEN_SPIKE",
                        "start_time": curr_seg.start_time,
                        "end_time": curr_seg.end_time,
                        "delta": float(delta),
                        "description": (
                            f"Abrupt increase in authenticity score from {prev_seg.raw_score:.2f} "
                            f"to {curr_seg.raw_score:.2f} detected at {curr_seg.start_time:.1f}s."
                        ),
                    })

        return TemporalAnalysisResult(
            availability=EngineStatus.AVAILABLE,
            findings=findings,
            limitations=[
                "Temporal analysis is an uncalibrated heuristic metric.",
                "Abrupt transitions may also stem from channel handovers or background noise changes.",
            ],
        )


temporal_analyzer = TemporalAnalyzer()
