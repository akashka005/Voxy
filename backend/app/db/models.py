import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    JSON,
    Index,
)
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    filename = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="QUEUED", index=True)
    risk_score = Column(Float, nullable=True)
    risk_level = Column(String(50), nullable=True)
    decision = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False, index=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    audio_metadata = relationship("AudioMetadata", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    authenticity_result = relationship("AuthenticityResultModel", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    speaker_result = relationship("SpeakerResultModel", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    transcript = relationship("TranscriptModel", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    fraud_result = relationship("FraudResultModel", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    risk_assessment = relationship("RiskAssessmentModel", back_populates="analysis", uselist=False, cascade="all, delete-orphan")
    evidence_items = relationship("EvidenceItemModel", back_populates="analysis", cascade="all, delete-orphan")


class AudioMetadata(Base):
    __tablename__ = "audio_metadata"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    duration_seconds = Column(Float, nullable=False)
    sample_rate = Column(Integer, nullable=False)
    channels = Column(Integer, nullable=False)
    codec = Column(String(50), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    analysis = relationship("Analysis", back_populates="audio_metadata")


class AuthenticityResultModel(Base):
    __tablename__ = "authenticity_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    model = Column(String(100), nullable=False)
    score = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    availability = Column(String(50), nullable=False)
    raw_scores = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    analysis = relationship("Analysis", back_populates="authenticity_result")


class SpeakerProfile(Base):
    __tablename__ = "speaker_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    owner_id = Column(String(100), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    consent_status = Column(String(50), nullable=False)
    encrypted_embedding_reference = Column(Text, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    results = relationship("SpeakerResultModel", back_populates="profile")


class SpeakerResultModel(Base):
    __tablename__ = "speaker_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    profile_id = Column(String(36), ForeignKey("speaker_profiles.id", ondelete="SET NULL"), nullable=True)
    similarity = Column(Float, nullable=True)
    verification_status = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    analysis = relationship("Analysis", back_populates="speaker_result")
    profile = relationship("SpeakerProfile", back_populates="results")


class TranscriptModel(Base):
    __tablename__ = "transcripts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    language = Column(String(20), nullable=True)
    transcript = Column(Text, nullable=False)
    segments = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    analysis = relationship("Analysis", back_populates="transcript")


class FraudResultModel(Base):
    __tablename__ = "fraud_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    categories = Column(JSON, nullable=False)
    evidence = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    analysis = relationship("Analysis", back_populates="fraud_result")


class RiskAssessmentModel(Base):
    __tablename__ = "risk_assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    fusion_version = Column(String(50), nullable=False)
    score = Column(Float, nullable=True)
    uncertainty = Column(Float, nullable=True)
    evidence_sufficiency = Column(Float, nullable=True)
    decision = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    analysis = relationship("Analysis", back_populates="risk_assessment")


class EvidenceItemModel(Base):
    __tablename__ = "evidence_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(100), nullable=False)
    timestamp = Column(Float, nullable=True)
    description = Column(Text, nullable=False)
    severity = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=get_utc_now, nullable=False)

    analysis = relationship("Analysis", back_populates="evidence_items")


class ModelRegistryModel(Base):
    __tablename__ = "model_registry"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_name = Column(String(100), nullable=False, index=True)
    version = Column(String(50), nullable=False)
    checksum = Column(String(128), nullable=True)
    configuration = Column(JSON, nullable=True)
    status = Column(String(50), nullable=False, default="ACTIVE")
    created_at = Column(DateTime, default=get_utc_now, nullable=False)
