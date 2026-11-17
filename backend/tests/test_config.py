from backend.app.core.config import Settings


def test_default_config():
    settings = Settings()
    assert settings.APP_NAME == "VoxSentinel"
    assert settings.APP_VERSION == "0.1.0"
    assert settings.API_V1_PREFIX == "/api/v1"
    assert settings.MAX_UPLOAD_MB == 25
    assert settings.MAX_AUDIO_DURATION_SECONDS == 300
    assert settings.DEFAULT_DEVICE == "cpu"
    assert settings.ALLOW_CUDA is True
    assert settings.SEQUENTIAL_INFERENCE is True
    assert settings.AASIST_ENABLED is False
    assert settings.SPEAKER_VERIFICATION_ENABLED is False


def test_cors_origins_assembly():
    settings = Settings(CORS_ORIGINS='["http://localhost:3000", "http://example.com"]')
    assert "http://localhost:3000" in settings.CORS_ORIGINS
    assert "http://example.com" in settings.CORS_ORIGINS

    settings_comma = Settings(CORS_ORIGINS="http://localhost:3000,http://example.com")
    assert "http://localhost:3000" in settings_comma.CORS_ORIGINS
    assert "http://example.com" in settings_comma.CORS_ORIGINS
