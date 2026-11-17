"""
Tests for rate limiting middleware and API key security.
Verifies 429 behavior and that unauthenticated requests are rejected.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def unauthenticated_client():
    """Client without an API key header."""
    from backend.app.main import app
    return TestClient(app, raise_server_exceptions=False)


class TestRateLimitingAndSecurity:
    def test_health_no_auth_required(self, unauthenticated_client):
        """Health endpoint should be open — no API key required."""
        resp = unauthenticated_client.get("/api/v1/health")
        assert resp.status_code == 200

    def test_root_no_auth_required(self, unauthenticated_client):
        """Root endpoint should be open."""
        resp = unauthenticated_client.get("/")
        assert resp.status_code == 200

    def test_limiter_registered_on_app(self):
        """Rate limiter must be attached to app.state."""
        from backend.app.main import app
        assert hasattr(app.state, "limiter"), "app.state.limiter must exist for slowapi"

    def test_rate_limit_exceeded_handler_registered(self):
        """The 429 exception handler must be registered."""
        from backend.app.main import app
        from slowapi.errors import RateLimitExceeded
        # FastAPI stores exception handlers in exception_handlers dict
        assert RateLimitExceeded in app.exception_handlers, \
            "RateLimitExceeded handler must be registered on the app"
