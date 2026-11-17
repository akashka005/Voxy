from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "VoxSentinel"
    assert data["version"] == "0.1.0"
    assert data["health"] == "/api/v1/health"


def test_health_endpoint(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "ok"
    assert data["app_name"] == "VoxSentinel"
    assert data["app_version"] == "0.1.0"
    assert data["database"] == "connected"
    assert "timestamp" in data

    # Verify engines block exists with real availability states
    engines = data["engines"]
    assert "authenticity" in engines
    assert "speaker_verification" in engines
    assert "speech_intelligence" in engines
    assert "fraud_intelligence" in engines
    assert "temporal_analysis" in engines
    assert "risk_fusion" in engines

    # By default, without configured checkpoints, status must be UNAVAILABLE
    assert engines["authenticity"]["status"] == "UNAVAILABLE"
    assert engines["speaker_verification"]["status"] == "UNAVAILABLE"
    assert engines["speech_intelligence"]["status"] == "UNAVAILABLE"
    assert engines["fraud_intelligence"]["status"] == "UNAVAILABLE"
    assert engines["temporal_analysis"]["status"] == "UNAVAILABLE"
    assert engines["risk_fusion"]["status"] == "UNAVAILABLE"

    # Limitations should be present
    assert len(engines["authenticity"]["limitations"]) > 0
