from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.repositories.analysis_repo import AnalysisRepository
from backend.app.schemas.analysis import AnalysisHistoryResponse, AnalysisSummary
from backend.app.schemas.common import JobStatus
router = APIRouter()
@router.get(
    "/history",
    response_model=AnalysisHistoryResponse,
    summary="List analysis history with pagination",
)
def get_analysis_history(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> AnalysisHistoryResponse:
    repo = AnalysisRepository(db)
    items, total = repo.list_analyses(page=page, size=size)

    summaries = [
        AnalysisSummary(
            analysis_id=item.id,
            filename=item.filename,
            status=JobStatus(item.status),
            created_at=item.created_at,
            risk_score=item.risk_score,
            risk_level=item.risk_level,
            decision=item.decision,
        )
        for item in items
    ]

    return AnalysisHistoryResponse(
        items=summaries,
        total=total,
        page=page,
        size=size,
    )