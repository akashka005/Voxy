from typing import Dict, Any, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.schemas.common import EngineStatus
from backend.app.db.session import get_db

router = APIRouter()


class EngineHealthStatus(BaseModel):
    engine_name: str
    status: EngineStatus
    details: str
    limitations: List[str] = []


class HealthResponse(BaseModel):
    status: str
    app_name: str
    app_version: str
    environment: str
    timestamp: datetime
    database: str
    engines: Dict[str, EngineHealthStatus]


@router.get("/health", response_model=HealthResponse, summary="Backend and Engine Availability")
def get_health(db: Session = Depends(get_db)) -> HealthResponse:
    """
    Returns application health, database connectivity status, and each engine's availability.
    A missing or unconfigured engine reports UNAVAILABLE, never a fabricated status.
    """
    # Check DB connectivity
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unreachable: {str(e)}"

    # Determine real engine availabilities based on configuration
    engines: Dict[str, EngineHealthStatus] = {
        "authenticity": EngineHealthStatus(
            engine_name="Authenticity / Anti-spoofing",
            status=EngineStatus.AVAILABLE if (settings.AASIST_ENABLED and settings.AASIST_CHECKPOINT_PATH) else EngineStatus.UNAVAILABLE,
            details="AASIST ASVspoof 2019 LA baseline" if settings.AASIST_ENABLED else "Checkpoint not configured or disabled in settings",
            limitations=["Synthetic/converted speech only; replay detection not supported in MVP."]
        ),
        "speaker_verification": EngineHealthStatus(
            engine_name="Speaker Verification",
            status=EngineStatus.AVAILABLE if settings.SPEAKER_VERIFICATION_ENABLED else EngineStatus.UNAVAILABLE,
            details="SpeechBrain ECAPA-TDNN" if settings.SPEAKER_VERIFICATION_ENABLED else "Speaker verification deferred to Phase 2",
            limitations=["Requires explicit user consent and enrolled profile."]
        ),
        "speech_intelligence": EngineHealthStatus(
            engine_name="Speech Intelligence / ASR",
            status=EngineStatus.UNAVAILABLE,
            details=f"faster-whisper ({settings.WHISPER_MODEL}) int8 on {settings.WHISPER_DEVICE}",
            limitations=["Scheduled for Stage 4 implementation."]
        ),
        "fraud_intelligence": EngineHealthStatus(
            engine_name="Fraud Intent Analysis",
            status=EngineStatus.UNAVAILABLE,
            details="Rule-based social engineering detection baseline",
            limitations=["Scheduled for Stage 4 implementation; independent of voice authenticity."]
        ),
        "temporal_analysis": EngineHealthStatus(
            engine_name="Temporal Trust Analysis",
            status=EngineStatus.UNAVAILABLE,
            details="Multi-segment consistency tracking",
            limitations=["Scheduled for research extensions (Stage 8)."]
        ),
        "risk_fusion": EngineHealthStatus(
            engine_name="Uncertainty-Aware Risk Fusion",
            status=EngineStatus.UNAVAILABLE,
            details="Interpretable weighted evidence fusion",
            limitations=["Missing engine is missing evidence, never zero risk."]
        ),
    }

    return HealthResponse(
        status="ok" if db_status == "connected" else "degraded",
        app_name=settings.APP_NAME,
        app_version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        timestamp=datetime.now(timezone.utc),
        database=db_status,
        engines=engines,
    )
