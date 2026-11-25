from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.repositories.analysis_repo import AnalysisRepository
from backend.app.services.report_service import report_service
from backend.app.intelligence.explanations import build_evidence_explanation
router = APIRouter()

@router.get(
    "/analysis/{analysis_id}/report",
    summary="Retrieve full audit and explanation report",
)
def get_analysis_report(
    analysis_id: str,
    db: Session = Depends(get_db),
):
    repo = AnalysisRepository(db)
    analysis = repo.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with ID '{analysis_id}' was not found.",
        )

    formatted = report_service.format_analysis_response(analysis)

    explanation = {}
    if formatted.overall_assessment:
        explanation = build_evidence_explanation(
            assessment=formatted.overall_assessment,
            evidence_items=formatted.evidence,
            authenticity=formatted.authenticity,
            fraud=formatted.fraud_intelligence,
        )

    return {
        "analysis_id": analysis.id,
        "filename": analysis.filename,
        "status": analysis.status,
        "created_at": analysis.created_at,
        "completed_at": analysis.completed_at,
        "overall_assessment": formatted.overall_assessment,
        "evidence_explanation": explanation,
        "evidence_items": formatted.evidence,
        "audio_metadata": {
            "duration_seconds": analysis.audio_metadata.duration_seconds if analysis.audio_metadata else None,
            "sample_rate": analysis.audio_metadata.sample_rate if analysis.audio_metadata else None,
            "channels": analysis.audio_metadata.channels if analysis.audio_metadata else None,
            "codec": analysis.audio_metadata.codec if analysis.audio_metadata else None,
        } if analysis.audio_metadata else None,
    }
