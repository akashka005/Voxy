from fastapi import Security, HTTPException, status
from fastapi.security.api_key import APIKeyHeader
from backend.app.core.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """
    Validates API key from request header against environment settings.
    In development mode with default key, requests without key or with correct key succeed.
    """
    # If no API key configured or placeholder used, or if matching configured key
    if not settings.API_KEY or api_key == settings.API_KEY:
        return api_key or "anonymous"

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API Key in X-API-Key header",
    )
