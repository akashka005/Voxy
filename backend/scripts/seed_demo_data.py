"""
Database seed script for VoxSentinel.
Populates initial forensic cases and consented speaker profiles
into SQLite for realistic demonstration and development.
"""
import uuid
from datetime import datetime, timezone, timedelta
from backend.app.db.session import SessionLocal, init_db
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
)


def seed():
    init_db()
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Analysis).count() > 0:
            print("Database already contains analyses. Skipping seed.")
            return

        now = datetime.now(timezone.utc)

        # 1. Enrolled Speaker Profiles
        speakers = [
            SpeakerProfile(
                id=str(uuid.uuid4()),
                name="Maya Lin",
                owner_id="CORP-TREASURY-01",
                consent_status="EXPLICIT_CONSENT_GRANTED",
                encrypted_embedding_reference="vault://biometrics/maya_lin_ecapa_v1.enc",
                created_at=now - timedelta(days=12),
            ),
            SpeakerProfile(
                id=str(uuid.uuid4()),
                name="David Chen",
                owner_id="EXEC-OFFICE-04",
                consent_status="EXPLICIT_CONSENT_GRANTED",
                encrypted_embedding_reference="vault://biometrics/david_chen_ecapa_v1.enc",
                created_at=now - timedelta(days=24),
            ),
            SpeakerProfile(
                id=str(uuid.uuid4()),
                name="Sarah Jenkins",
                owner_id="OPS-GLOBAL-02",
                consent_status="EXPLICIT_CONSENT_GRANTED",
                encrypted_embedding_reference="vault://biometrics/sarah_jenkins_ecapa_v1.enc",
                created_at=now - timedelta(days=31),
            ),
            SpeakerProfile(
                id=str(uuid.uuid4()),
                name="Robert Sterling",
                owner_id="SIGNER-FIN-09",
                consent_status="EXPLICIT_CONSENT_GRANTED",
                encrypted_embedding_reference="vault://biometrics/robert_sterling_ecapa_v1.enc",
                created_at=now - timedelta(days=45),
            ),
        ]
        for sp in speakers:
            db.add(sp)
        db.commit()

        # 2. Case 1: Critical Banking Scam
        c1_id = "VS-2026-8841"
        c1 = Analysis(
            id=c1_id,
            filename="Inbound Retail Banking Call #8841.wav",
            status="COMPLETED",
            risk_score=92.4,
            risk_level="CRITICAL",
            decision="RESTRICT_SUPPORTED_ACTION",
            created_at=now - timedelta(hours=2, minutes=15),
            completed_at=now - timedelta(hours=2, minutes=14, seconds=55),
        )
        db.add(c1)
        db.flush()

        db.add(AudioMetadata(
            analysis_id=c1_id,
            duration_seconds=12.4,
            sample_rate=16000,
            channels=1,
            codec="pcm_s16le",
            file_size_bytes=396844,
            created_at=now - timedelta(hours=2, minutes=15),
        ))

        db.add(AuthenticityResultModel(
            analysis_id=c1_id,
            model="AASIST",
            score=0.88,
            confidence=0.92,
            availability="AVAILABLE",
            raw_scores=[
                {"segment_index": 0, "start_time": 0.0, "end_time": 4.0, "raw_score": 0.14, "prediction": "spoof", "confidence": 0.86},
                {"segment_index": 1, "start_time": 4.0, "end_time": 8.0, "raw_score": 0.38, "prediction": "spoof", "confidence": 0.91},
                {"segment_index": 2, "start_time": 8.0, "end_time": 12.4, "raw_score": 0.42, "prediction": "spoof", "confidence": 0.94},
            ],
            created_at=now - timedelta(hours=2, minutes=14, seconds=58),
        ))

        db.add(TranscriptModel(
            analysis_id=c1_id,
            language="en",
            transcript="Hello this is Fraud Prevention from your bank. We need your one-time verification code immediately to stop an unauthorized transfer. Please authorize the urgent security transfer now.",
            segments=[
                {"segment_index": 0, "start_time": 0.0, "end_time": 4.0, "text": "Hello this is Fraud Prevention from your bank.", "confidence": 0.96, "language": "en"},
                {"segment_index": 1, "start_time": 4.0, "end_time": 8.0, "text": "We need your one-time verification code immediately to stop an unauthorized transfer.", "confidence": 0.94, "language": "en"},
                {"segment_index": 2, "start_time": 8.0, "end_time": 12.4, "text": "Please authorize the urgent security transfer now.", "confidence": 0.92, "language": "en"},
            ],
            created_at=now - timedelta(hours=2, minutes=14, seconds=57),
        ))

        db.add(FraudResultModel(
            analysis_id=c1_id,
            categories=["OTP_HARVESTING", "AUTHORITY_IMPERSONATION", "URGENT_TRANSFER"],
            evidence=[
                {
                    "category": "AUTHORITY_IMPERSONATION",
                    "excerpt": "Fraud Prevention from your bank",
                    "start_time": 0.5,
                    "end_time": 3.8,
                    "severity": "HIGH",
                    "rule_id": "RULE-AUTH-01",
                    "explanation": "Caller explicitly claimed to represent institutional fraud prevention.",
                },
                {
                    "category": "OTP_HARVESTING",
                    "excerpt": "one-time verification code immediately",
                    "start_time": 4.2,
                    "end_time": 7.5,
                    "severity": "CRITICAL",
                    "rule_id": "RULE-OTP-01",
                    "explanation": "Solicitation of time-sensitive one-time credentials.",
                },
                {
                    "category": "URGENT_TRANSFER",
                    "excerpt": "authorize the urgent security transfer now",
                    "start_time": 8.2,
                    "end_time": 11.8,
                    "severity": "CRITICAL",
                    "rule_id": "RULE-URG-02",
                    "explanation": "Pressure to authorize unverified funds routing under coercive pretext.",
                },
            ],
            created_at=now - timedelta(hours=2, minutes=14, seconds=56),
        ))

        db.add(RiskAssessmentModel(
            analysis_id=c1_id,
            fusion_version="v1.0.0-baseline",
            score=92.4,
            uncertainty=0.12,
            evidence_sufficiency=0.85,
            decision="RESTRICT_SUPPORTED_ACTION",
            created_at=now - timedelta(hours=2, minutes=14, seconds=55),
        ))

        db.add(EvidenceItemModel(
            analysis_id=c1_id,
            category="FRAUD_INTENT",
            timestamp=4.2,
            description="High-severity OTP harvesting phrase detected: 'one-time verification code immediately'",
            severity="CRITICAL",
            created_at=now - timedelta(hours=2, minutes=14, seconds=55),
        ))
        db.add(EvidenceItemModel(
            analysis_id=c1_id,
            category="AUTHENTICITY",
            timestamp=8.0,
            description="Synthetic speech vocoder spectral artifact in 8.0-12.4s window",
            severity="HIGH",
            created_at=now - timedelta(hours=2, minutes=14, seconds=55),
        ))

        # 3. Case 2: Benign Treasury Callback
        c2_id = "VS-2026-8839"
        c2 = Analysis(
            id=c2_id,
            filename="Executive Wire Callback #8839.wav",
            status="COMPLETED",
            risk_score=18.6,
            risk_level="LOW",
            decision="LOW_CONCERN",
            created_at=now - timedelta(hours=5, minutes=30),
            completed_at=now - timedelta(hours=5, minutes=29, seconds=52),
        )
        db.add(c2)
        db.flush()

        db.add(AudioMetadata(
            analysis_id=c2_id,
            duration_seconds=12.0,
            sample_rate=16000,
            channels=1,
            codec="pcm_s16le",
            file_size_bytes=384044,
            created_at=now - timedelta(hours=5, minutes=30),
        ))

        db.add(AuthenticityResultModel(
            analysis_id=c2_id,
            model="AASIST",
            score=0.04,
            confidence=0.96,
            availability="AVAILABLE",
            raw_scores=[
                {"segment_index": 0, "start_time": 0.0, "end_time": 4.0, "raw_score": 0.04, "prediction": "bonafide", "confidence": 0.96},
                {"segment_index": 1, "start_time": 4.0, "end_time": 8.0, "raw_score": 0.03, "prediction": "bonafide", "confidence": 0.97},
                {"segment_index": 2, "start_time": 8.0, "end_time": 12.0, "raw_score": 0.05, "prediction": "bonafide", "confidence": 0.95},
            ],
            created_at=now - timedelta(hours=5, minutes=29, seconds=55),
        ))

        db.add(TranscriptModel(
            analysis_id=c2_id,
            language="en",
            transcript="Hi, this is Maya confirming our scheduled treasury settlement. Reference ID is 4409-B as documented in the portal. Let me know once compliance signs off on the invoice.",
            segments=[
                {"segment_index": 0, "start_time": 0.0, "end_time": 4.0, "text": "Hi, this is Maya confirming our scheduled treasury settlement.", "confidence": 0.98, "language": "en"},
                {"segment_index": 1, "start_time": 4.0, "end_time": 8.0, "text": "Reference ID is 4409-B as documented in the portal.", "confidence": 0.97, "language": "en"},
                {"segment_index": 2, "start_time": 8.0, "end_time": 12.0, "text": "Let me know once compliance signs off on the invoice.", "confidence": 0.98, "language": "en"},
            ],
            created_at=now - timedelta(hours=5, minutes=29, seconds=54),
        ))

        db.add(FraudResultModel(
            analysis_id=c2_id,
            categories=[],
            evidence=[],
            created_at=now - timedelta(hours=5, minutes=29, seconds=53),
        ))

        db.add(RiskAssessmentModel(
            analysis_id=c2_id,
            fusion_version="v1.0.0-baseline",
            score=18.6,
            uncertainty=0.06,
            evidence_sufficiency=0.92,
            decision="LOW_CONCERN",
            created_at=now - timedelta(hours=5, minutes=29, seconds=52),
        ))

        # 4. Case 3: Synthetic Voice Clone Probe
        c3_id = "VS-2026-8834"
        c3 = Analysis(
            id=c3_id,
            filename="Synthetic Voice Clone Probe #8834.wav",
            status="COMPLETED",
            risk_score=86.8,
            risk_level="HIGH",
            decision="REQUIRE_VERIFICATION",
            created_at=now - timedelta(hours=9, minutes=10),
            completed_at=now - timedelta(hours=9, minutes=9, seconds=48),
        )
        db.add(c3)
        db.flush()

        db.add(AudioMetadata(
            analysis_id=c3_id,
            duration_seconds=12.4,
            sample_rate=16000,
            channels=1,
            codec="pcm_s16le",
            file_size_bytes=396844,
            created_at=now - timedelta(hours=9, minutes=10),
        ))

        db.add(AuthenticityResultModel(
            analysis_id=c3_id,
            model="AASIST",
            score=0.82,
            confidence=0.89,
            availability="AVAILABLE",
            raw_scores=[
                {"segment_index": 0, "start_time": 0.0, "end_time": 4.0, "raw_score": 0.28, "prediction": "spoof", "confidence": 0.88},
                {"segment_index": 1, "start_time": 4.0, "end_time": 8.0, "raw_score": 0.44, "prediction": "spoof", "confidence": 0.92},
                {"segment_index": 2, "start_time": 8.0, "end_time": 12.4, "raw_score": 0.36, "prediction": "spoof", "confidence": 0.87},
            ],
            created_at=now - timedelta(hours=9, minutes=9, seconds=50),
        ))

        db.add(TranscriptModel(
            analysis_id=c3_id,
            language="en",
            transcript="I am authorizing an emergency vendor update right now. Bypass dual control and route funds to the new IBAN. Confirm once wired, I am boarding a flight.",
            segments=[
                {"segment_index": 0, "start_time": 0.0, "end_time": 4.0, "text": "I am authorizing an emergency vendor update right now.", "confidence": 0.94, "language": "en"},
                {"segment_index": 1, "start_time": 4.0, "end_time": 8.0, "text": "Bypass dual control and route funds to the new IBAN.", "confidence": 0.91, "language": "en"},
                {"segment_index": 2, "start_time": 8.0, "end_time": 12.4, "text": "Confirm once wired, I am boarding a flight.", "confidence": 0.93, "language": "en"},
            ],
            created_at=now - timedelta(hours=9, minutes=9, seconds=49),
        ))

        db.add(FraudResultModel(
            analysis_id=c3_id,
            categories=["POLICY_BYPASS", "EMERGENCY_PRESSURE"],
            evidence=[
                {
                    "category": "POLICY_BYPASS",
                    "excerpt": "Bypass dual control and route funds to the new IBAN",
                    "start_time": 4.2,
                    "end_time": 7.8,
                    "severity": "CRITICAL",
                    "rule_id": "RULE-BYPASS-01",
                    "explanation": "Direct instruction to subvert organizational security controls.",
                },
                {
                    "category": "EMERGENCY_PRESSURE",
                    "excerpt": "Confirm once wired, I am boarding a flight",
                    "start_time": 8.1,
                    "end_time": 11.5,
                    "severity": "HIGH",
                    "rule_id": "RULE-URG-03",
                    "explanation": "Artificial unavailability window created to force immediate non-standard compliance.",
                },
            ],
            created_at=now - timedelta(hours=9, minutes=9, seconds=48),
        ))

        db.add(RiskAssessmentModel(
            analysis_id=c3_id,
            fusion_version="v1.0.0-baseline",
            score=86.8,
            uncertainty=0.09,
            evidence_sufficiency=0.89,
            decision="REQUIRE_VERIFICATION",
            created_at=now - timedelta(hours=9, minutes=9, seconds=48),
        ))

        db.commit()
        print("Successfully seeded 3 baseline forensic analyses and 4 speaker profiles.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
