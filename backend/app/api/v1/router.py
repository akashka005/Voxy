from fastapi import APIRouter, HTTPException, status
from backend.app.api.v1.endpoints import (
    health,
    analyze,
    reports,
    history,
    speakers,
)
api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(analyze.router, tags=["Analysis"])
api_router.include_router(reports.router, tags=["Reports"])
api_router.include_router(history.router, tags=["History"])
api_router.include_router(speakers.router, tags=["Speaker Profiles"])
@api_router.post(
    "/sessions",
    tags=["Live & Telephony"],
    summary="Create simulated-call session (Phase 4)",
)
def create_session_stub():
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Simulated-call sessions are scheduled for Phase 4 live telephony integration.",
    )

@api_router.websocket("/stream/{session_id}")
async def websocket_stream_stub(session_id: str):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Incremental live WebSocket streaming is scheduled for Phase 4.",
    )