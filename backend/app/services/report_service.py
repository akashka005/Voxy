from typing import Optional, Dict, Any, List
from backend.app.db.models import Analysis
from backend.app.schemas.common import (
    JobStatus,
    EngineStatus,
    RiskLevel,
    SecurityDecision,
    ScoreType,
)
from backend.app.schemas.analysis import AnalysisResponse
from backend.app.schemas.risk import OverallAssessment, EvidenceItem, TemporalAnalysisResult
from backend.app.schemas.authenticity import AuthenticityResult, AuthenticitySegment
from backend.app.schemas.speech import SpeechIntelligenceResult, TranscriptSegment
from backend.app.schemas.fraud import FraudIntelligenceResult, FraudEvidenceItem
from backend.app.schemas.speaker import SpeakerVerificationResult


class ReportService:
    def format_analysis_response(self, analysis: Analysis) -> AnalysisResponse:
        """
        Maps persisted SQLAlchemy Analysis record to typed Pydantic AnalysisResponse.
        """
        # Overall assessment
        overall: Optional[OverallAssessment] = None
        if analysis.risk_assessment:
            overall = OverallAssessment(
                risk_level=RiskLevel(analysis.risk_level or "MEDIUM"),
                risk_score=analysis.risk_assessment.score or 0.0,
                confidence=round(1.0 - (analysis.risk_assessment.uncertainty or 0.5), 2),
                uncertainty=analysis.risk_assessment.uncertainty,
                evidence_sufficiency=analysis.risk_assessment.evidence_sufficiency,
                decision=SecurityDecision(analysis.risk_assessment.decision or "MONITOR"),
                score_type=ScoreType.UNCALIBRATED_HEURISTIC,
            )

        # Authenticity result
        auth: Optional[AuthenticityResult] = None
        if analysis.authenticity_result:
            raw_segs = analysis.authenticity_result.raw_scores or []
            segments = [
                AuthenticitySegment(
                    segment_index=s.get("segment_index", 0),
                    start_time=s.get("start_time", 0.0),
                    end_time=s.get("end_time", 0.0),
                    raw_score=s.get("raw_score"),
                    prediction=s.get("prediction"),
                    confidence=s.get("confidence"),
                )
                for s in raw_segs
            ]
            auth = AuthenticityResult(
                availability=EngineStatus(analysis.authenticity_result.availability),
                model_id=analysis.authenticity_result.model,
                score=analysis.authenticity_result.score,
                confidence=analysis.authenticity_result.confidence,
                segments=segments,
                limitations=["AASIST ASVspoof 2019 LA domain model; uncalibrated score."],
            )

        # Speech intelligence
        speech: Optional[SpeechIntelligenceResult] = None
        if analysis.transcript:
            raw_t_segs = analysis.transcript.segments or []
            t_segs = [
                TranscriptSegment(
                    segment_index=s.get("segment_index", 0),
                    start_time=s.get("start_time", 0.0),
                    end_time=s.get("end_time", 0.0),
                    text=s.get("text", ""),
                    confidence=s.get("confidence"),
                    language=s.get("language"),
                )
                for s in raw_t_segs
            ]
            speech = SpeechIntelligenceResult(
                availability=EngineStatus.AVAILABLE,
                model_id="faster-whisper",
                language=analysis.transcript.language,
                transcript=analysis.transcript.transcript,
                segments=t_segs,
            )

        # Fraud intelligence
        fraud: Optional[FraudIntelligenceResult] = None
        if analysis.fraud_result:
            raw_ev = analysis.fraud_result.evidence or []
            ev_list = [
                FraudEvidenceItem(
                    category=e.get("category", ""),
                    excerpt=e.get("excerpt", ""),
                    start_time=e.get("start_time"),
                    end_time=e.get("end_time"),
                    severity=e.get("severity", "MEDIUM"),
                    rule_id=e.get("rule_id"),
                    explanation=e.get("explanation"),
                )
                for e in raw_ev
            ]
            fraud = FraudIntelligenceResult(
                availability=EngineStatus.AVAILABLE,
                model_id="fraud_rule_baseline",
                categories=analysis.fraud_result.categories or [],
                evidence=ev_list,
            )

        # Evidence items
        evidence_items: List[EvidenceItem] = []
        if analysis.evidence_items:
            for item in analysis.evidence_items:
                evidence_items.append(
                    EvidenceItem(
                        category=item.category,
                        timestamp=item.timestamp,
                        description=item.description,
                        severity=item.severity,
                    )
                )

        # Elapsed ms
        elapsed_ms = 0
        if analysis.completed_at and analysis.created_at:
            elapsed_ms = int((analysis.completed_at - analysis.created_at).total_seconds() * 1000)

        return AnalysisResponse(
            analysis_id=analysis.id,
            status=JobStatus(analysis.status),
            created_at=analysis.created_at,
            completed_at=analysis.completed_at,
            overall_assessment=overall,
            authenticity=auth,
            speaker_verification=SpeakerVerificationResult(),
            speech_intelligence=speech,
            fraud_intelligence=fraud,
            temporal_analysis=TemporalAnalysisResult(availability=EngineStatus.AVAILABLE if overall else EngineStatus.UNAVAILABLE),
            evidence=evidence_items,
            processing_time_ms=elapsed_ms,
            error_message=analysis.error_message,
        )


report_service = ReportService()
