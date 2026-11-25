import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.models import SpeakerProfile
from backend.app.core.config import settings

router = APIRouter()

class SpeakerEnrollRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    owner_id: Optional[str] = None
    consent_recorded: bool = Field(
        ...,
        description="Explicit recording of user consent to store biometric voice embeddings."
    )


class SpeakerProfileResponse(BaseModel):
    id: str
    name: str
    owner_id: Optional[str] = None
    consent_status: str
    created_at: datetime


@router.post(
    "/speakers/enroll",
    response_model=SpeakerProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll consented speaker profile (Phase 2)",
)
def enroll_speaker(
    request: SpeakerEnrollRequest,
    db: Session = Depends(get_db),
) -> SpeakerProfileResponse:
    if not request.consent_recorded:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Biometric speaker profile creation strictly requires explicit user consent.",
        )

    profile = SpeakerProfile(
        name=request.name,
        owner_id=request.owner_id,
        consent_status="EXPLICIT_CONSENT_GRANTED",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)

    return SpeakerProfileResponse(
        id=profile.id,
        name=profile.name,
        owner_id=profile.owner_id,
        consent_status=profile.consent_status,
        created_at=profile.created_at,
    )


@router.get(
    "/speakers",
    response_model=List[SpeakerProfileResponse],
    summary="List registered speaker profiles (Phase 2)",
)
def list_speakers(
    db: Session = Depends(get_db),
) -> List[SpeakerProfileResponse]:
    profiles = db.query(SpeakerProfile).all()
    return [
        SpeakerProfileResponse(
            id=p.id,
            name=p.name,
            owner_id=p.owner_id,
            consent_status=p.consent_status,
            created_at=p.created_at,
        )
        for p in profiles
    ]


@router.delete(
    "/speakers/{speaker_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete speaker profile and biometric references",
)
def delete_speaker(
    speaker_id: str,
    db: Session = Depends(get_db),
):
    profile = db.query(SpeakerProfile).filter(SpeakerProfile.id == speaker_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Speaker profile with ID '{speaker_id}' not found.",
        )

    db.delete(profile)
    db.commit()
    return {"status": "deleted", "speaker_id": speaker_id}
