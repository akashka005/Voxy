import pytest
from backend.app.engines.authenticity.aasist import AASISTEngine
from backend.app.schemas.common import EngineStatus
from backend.app.audio.segmentation import AudioSegment
import numpy as np


def test_aasist_unconfigured_availability():
    engine = AASISTEngine(checkpoint_path="")
    assert engine.availability() == EngineStatus.UNAVAILABLE

    meta = engine.metadata()
    assert meta.model_name == "AASIST"
    assert len(engine.limitations()) > 0


def test_aasist_unconfigured_infer_no_fabrication():
    engine = AASISTEngine(checkpoint_path="")
    dummy_segment = AudioSegment(
        segment_index=0,
        start_time=0.0,
        end_time=4.0,
        sample_rate=16000,
        num_samples=64000,
        waveform=np.zeros(64000, dtype=np.float32),
        is_speech=True,
        vad_speech_ratio=0.8,
    )

    result = engine.infer([dummy_segment])
    assert result.availability == EngineStatus.UNAVAILABLE
    assert result.score is None
    assert result.confidence is None
    assert len(result.segments) == 0
    assert any("unavailable" in lim.lower() for lim in result.limitations)
