from typing import Optional, List, Tuple
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.models import (
    Analysis,
    AudioMetadata,
    AuthenticityResultModel,
    SpeakerResultModel,
    TranscriptModel,
    FraudResultModel,
    RiskAssessmentModel,
    EvidenceItemModel,
)
from backend.app.schemas.risk import OverallAssessment, EvidenceItem
from backend.app.schemas.authenticity import AuthenticityResult
from backend.app.schemas.speech import SpeechIntelligenceResult
from backend.app.schemas.fraud import FraudIntelligenceResult
from backend.app.schemas.speaker import SpeakerVerificationResult
from backend.app.audio.decoder import DecodedAudio


class AnalysisRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_analysis(self, filename: Optional[str] = None) -> Analysis:
        analysis = Analysis(
            filename=filename,
            status="QUEUED",
        )
        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def get_analysis(self, analysis_id: str) -> Optional[Analysis]:
        self.db.expire_all()
        return self.db.query(Analysis).filter(Analysis.id == analysis_id).first()

    def update_status(
        self,
        analysis_id: str,
        status: str,
        error_message: Optional[str] = None,
    ) -> Optional[Analysis]:
        analysis = self.get_analysis(analysis_id)
        if analysis:
            analysis.status = status
            if error_message is not None:
                analysis.error_message = error_message
            if status in ("COMPLETED", "FAILED"):
                analysis.completed_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(analysis)
        return analysis

    def save_analysis_results(
        self,
        analysis_id: str,
        decoded: DecodedAudio,
        assessment: OverallAssessment,
        authenticity: Optional[AuthenticityResult] = None,
        speech: Optional[SpeechIntelligenceResult] = None,
        fraud: Optional[FraudIntelligenceResult] = None,
        speaker: Optional[SpeakerVerificationResult] = None,
        evidence: Optional[List[EvidenceItem]] = None,
    ) -> Optional[Analysis]:
        analysis = self.get_analysis(analysis_id)
        if not analysis:
            return None

        # Update analysis summary
        analysis.status = "COMPLETED"
        analysis.completed_at = datetime.now(timezone.utc)
        analysis.risk_score = assessment.risk_score
        analysis.risk_level = assessment.risk_level.value
        analysis.decision = assessment.decision.value

        # 1. Save audio metadata
        audio_meta = AudioMetadata(
            analysis_id=analysis_id,
            duration_seconds=decoded.duration_seconds,
            sample_rate=decoded.sample_rate,
            channels=decoded.channels,
            codec=f"{decoded.format}_{decoded.subtype}",
            file_size_bytes=decoded.file_size_bytes,
        )
        self.db.add(audio_meta)

        # 2. Save Authenticity
        if authenticity:
            auth_model = AuthenticityResultModel(
                analysis_id=analysis_id,
                model=authenticity.model_id or "unknown",
                score=authenticity.score,
                confidence=authenticity.confidence,
                availability=authenticity.availability.value,
                raw_scores=[s.model_dump() for s in authenticity.segments] if authenticity.segments else None,
            )
            self.db.add(auth_model)

        # 3. Save Transcript
        if speech and speech.transcript is not None:
            transcript_model = TranscriptModel(
                analysis_id=analysis_id,
                language=speech.language,
                transcript=speech.transcript,
                segments=[s.model_dump() for s in speech.segments] if speech.segments else None,
            )
            self.db.add(transcript_model)

        # 4. Save Fraud Results
        if fraud:
            fraud_model = FraudResultModel(
                analysis_id=analysis_id,
                categories=fraud.categories,
                evidence=[e.model_dump() for e in fraud.evidence] if fraud.evidence else [],
            )
            self.db.add(fraud_model)

        # 5. Save Risk Assessment
        risk_model = RiskAssessmentModel(
            analysis_id=analysis_id,
            fusion_version="1.0.0-baseline",
            score=assessment.risk_score,
            uncertainty=assessment.uncertainty,
            evidence_sufficiency=assessment.evidence_sufficiency,
            decision=assessment.decision.value,
        )
        self.db.add(risk_model)

        # 6. Save Evidence Items
        if evidence:
            for item in evidence:
                ev_model = EvidenceItemModel(
                    analysis_id=analysis_id,
                    category=item.category,
                    timestamp=item.timestamp,
                    description=item.description,
                    severity=item.severity,
                )
                self.db.add(ev_model)

        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def list_analyses(self, page: int = 1, size: int = 20) -> Tuple[List[Analysis], int]:
        query = self.db.query(Analysis).order_by(desc(Analysis.created_at))
        total = query.count()
        items = query.offset((page - 1) * size).limit(size).all()
        return items, total

    def delete_analysis(self, analysis_id: str) -> bool:
        analysis = self.get_analysis(analysis_id)
        if analysis:
            self.db.delete(analysis)
            self.db.commit()
            return True
        return False
