import io
import time
import numpy as np
import soundfile as sf
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def synthetic_wav_bytes():
    """Generates synthetic in-memory WAV audio bytes (1.5 seconds sine wave)."""
    sr = 16000
    duration = 1.5
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    wave = (0.5 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)

    buf = io.BytesIO()
    sf.write(buf, wave, sr, format="WAV")
    buf.seek(0)
    return buf.read()


def test_analyze_upload_and_poll(client: TestClient, synthetic_wav_bytes):
    # 1. Upload audio
    files = {"file": ("test_sample.wav", synthetic_wav_bytes, "audio/wav")}
    response = client.post("/api/v1/analyze", files=files)
    assert response.status_code == 202
    data = response.json()
    assert "analysis_id" in data
    analysis_id = data["analysis_id"]

    # 2. Poll analysis result with brief wait for worker
    status_result = "QUEUED"
    res_data = {}
    for _ in range(20):
        time.sleep(0.1)
        res = client.get(f"/api/v1/analysis/{analysis_id}")
        assert res.status_code == 200
        res_data = res.json()
        status_result = res_data["status"]
        if status_result in ("COMPLETED", "FAILED"):
            break

    assert res_data["analysis_id"] == analysis_id
    assert status_result in ("PROCESSING", "COMPLETED")

    # 4. Fetch full report
    report_res = client.get(f"/api/v1/analysis/{analysis_id}/report")
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert report_data["analysis_id"] == analysis_id

    # 5. Check history endpoint
    hist_res = client.get("/api/v1/history?page=1&size=10")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["total"] >= 1
    assert any(item["analysis_id"] == analysis_id for item in hist_data["items"])

    # 6. Delete analysis
    del_res = client.delete(f"/api/v1/analysis/{analysis_id}")
    assert del_res.status_code == 200

    # 7. Verify 404 after deletion
    after_del = client.get(f"/api/v1/analysis/{analysis_id}")
    assert after_del.status_code == 404


def test_speaker_enrollment_consent_required(client: TestClient):
    # Without consent -> 400 Bad Request
    no_consent = client.post(
        "/api/v1/speakers/enroll",
        json={"name": "Alice", "consent_recorded": False},
    )
    assert no_consent.status_code == 400

    # With consent -> 201 Created
    with_consent = client.post(
        "/api/v1/speakers/enroll",
        json={"name": "Alice", "consent_recorded": True},
    )
    assert with_consent.status_code == 201
    speaker_id = with_consent.json()["id"]

    # List speakers
    list_res = client.get("/api/v1/speakers")
    assert list_res.status_code == 200
    assert any(s["id"] == speaker_id for s in list_res.json())

    # Delete speaker
    del_res = client.delete(f"/api/v1/speakers/{speaker_id}")
    assert del_res.status_code == 200


def test_unimplemented_streaming_returns_501(client: TestClient):
    res = client.post("/api/v1/sessions")
    assert res.status_code == 501
    assert "Phase 4" in res.json()["detail"]
