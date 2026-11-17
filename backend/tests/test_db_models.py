from sqlalchemy.orm import Session
from backend.app.db.models import (
    Analysis,
    AudioMetadata,
    AuthenticityResultModel,
    SpeakerProfile,
    SpeakerResultModel,
    TranscriptModel,
    FraudResultModel,
    RiskAssessmentModel,
    EvidenceItemModel,
    ModelRegistryModel,
)


def test_create_and_query_analysis(db_session: Session):
    analysis = Analysis(
        filename="test_call.wav",
        status="COMPLETED",
        risk_score=75.0,
        risk_level="HIGH",
        decision="REQUIRE_VERIFICATION",
    )
    db_session.add(analysis)
    db_session.commit()
    db_session.refresh(analysis)

    assert analysis.id is not None
    assert len(analysis.id) == 36
    assert analysis.filename == "test_call.wav"
    assert analysis.status == "COMPLETED"
    assert analysis.risk_score == 75.0

    # Query from DB
    queried = db_session.query(Analysis).filter(Analysis.id == analysis.id).first()
    assert queried is not None
    assert queried.decision == "REQUIRE_VERIFICATION"


def test_analysis_relationships_cascade(db_session: Session):
    analysis = Analysis(filename="cascade_test.wav", status="PROCESSING")
    db_session.add(analysis)
    db_session.commit()

    # Add audio metadata
    metadata = AudioMetadata(
        analysis_id=analysis.id,
        duration_seconds=12.5,
        sample_rate=16000,
        channels=1,
        codec="pcm_s16le",
        file_size_bytes=400000,
    )
    db_session.add(metadata)

    # Add transcript
    transcript = TranscriptModel(
        analysis_id=analysis.id,
        language="en",
        transcript="Test transcript text",
        segments=[{"text": "Test transcript text", "start": 0.0, "end": 2.0}],
    )
    db_session.add(transcript)

    # Add evidence item
    evidence = EvidenceItemModel(
        analysis_id=analysis.id,
        category="urgent_transfer",
        timestamp=1.2,
        description="Urgent transfer request detected",
        severity="HIGH",
    )
    db_session.add(evidence)
    db_session.commit()

    db_session.refresh(analysis)
    assert analysis.audio_metadata is not None
    assert analysis.audio_metadata.duration_seconds == 12.5
    assert analysis.transcript is not None
    assert analysis.transcript.language == "en"
    assert len(analysis.evidence_items) == 1
    assert analysis.evidence_items[0].severity == "HIGH"

    # Delete analysis and ensure cascade delete
    db_session.delete(analysis)
    db_session.commit()

    assert db_session.query(AudioMetadata).filter(AudioMetadata.analysis_id == analysis.id).first() is None
    assert db_session.query(TranscriptModel).filter(TranscriptModel.analysis_id == analysis.id).first() is None
    assert db_session.query(EvidenceItemModel).filter(EvidenceItemModel.analysis_id == analysis.id).first() is None
