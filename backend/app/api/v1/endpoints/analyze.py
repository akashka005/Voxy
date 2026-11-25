import json
from typing import Optional
from fastapi import (
    APIRouter,
    Request,
    UploadFile,
    File,
    Form,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from backend.app.db.session import get_db
from backend.app.db.repositories.analysis_repo import AnalysisRepository
from backend.app.schemas.common import JobStatus
from backend.app.schemas.analysis import (
    AnalysisCreateResponse,
    AnalysisResponse,
    AnalysisOptions,
)
from backend.app.services.storage_service import storage_service
from backend.app.services.analysis_service import analysis_service
from backend.app.services.report_service import report_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/analyze",
    response_model=AnalysisCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload audio and create an asynchronous analysis job",
)
@limiter.limit("10/minute")
async def create_analysis_job(
    request: Request,
    file: UploadFile = File(..., description="Audio file (WAV, MP3, FLAC, M4A)"),
    analysis_options: Optional[str] = Form(None, description="Optional JSON-encoded analysis options"),
    db: Session = Depends(get_db),
) -> AnalysisCreateResponse:
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename.",
        )
    parsed_options = AnalysisOptions()
    if analysis_options:
        try:
            data = json.loads(analysis_options)
            parsed_options = AnalysisOptions(**data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid analysis_options JSON format: {str(e)}",
            )
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes).",
        )
    extension = file.filename.split(".")[-1] if "." in file.filename else "bin"
    temp_path = storage_service.save_temporary_audio(content, extension=extension)
    analysis_id = analysis_service.enqueue_analysis_job(
        db=db,
        temp_file_path=temp_path,
        original_filename=file.filename,
        options=parsed_options,
    )

    repo = AnalysisRepository(db)
    analysis = repo.get_analysis(analysis_id)

    return AnalysisCreateResponse(
        analysis_id=analysis_id,
        status=JobStatus.QUEUED,
        created_at=analysis.created_at,
        message="Audio received and queued for sequential threat assessment.",
    )


@router.get(
    "/analysis/{analysis_id}",
    response_model=AnalysisResponse,
    summary="Retrieve analysis job status and results",
)
def get_analysis_status(
    analysis_id: str,
    db: Session = Depends(get_db),
) -> AnalysisResponse:
    repo = AnalysisRepository(db)
    analysis = repo.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with ID '{analysis_id}' was not found.",
        )

    return report_service.format_analysis_response(analysis)


@router.delete(
    "/analysis/{analysis_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete analysis record and all associated artifacts",
)
def delete_analysis(
    analysis_id: str,
    db: Session = Depends(get_db),
):
    repo = AnalysisRepository(db)
    deleted = repo.delete_analysis(analysis_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with ID '{analysis_id}' was not found.",
        )

    return {"status": "deleted", "analysis_id": analysis_id}