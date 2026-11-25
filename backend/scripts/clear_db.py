"""
Clear all seeded/demo analyses and speaker profiles from the database.
Run from project root: python -m backend.scripts.clear_db
"""
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))

from backend.app.db.session import SessionLocal
from backend.app.db.models import (
    Analysis, AudioMetadata, AuthenticityResultModel, SpeakerProfile,
    SpeakerResultModel, TranscriptModel, FraudResultModel,
    RiskAssessmentModel, EvidenceItemModel,
)


def main() -> None:
    db = SessionLocal()
    try:
        # Delete child tables first (FK constraints)
        db.query(EvidenceItemModel).delete()
        db.query(RiskAssessmentModel).delete()
        db.query(FraudResultModel).delete()
        db.query(TranscriptModel).delete()
        db.query(SpeakerResultModel).delete()
        db.query(AuthenticityResultModel).delete()
        db.query(AudioMetadata).delete()
        analyses_deleted = db.query(Analysis).delete()
        speakers_deleted = db.query(SpeakerProfile).delete()
        db.commit()
        print(f"✅ Cleared {analyses_deleted} analyses and {speakers_deleted} speaker profiles.")
        print(f"   Remaining analyses: {db.query(Analysis).count()}")
        print(f"   Remaining speakers: {db.query(SpeakerProfile).count()}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
