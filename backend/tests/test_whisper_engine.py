"""
Tests for Whisper speech engine.
Verifies UNAVAILABLE contract when model is not downloaded, and that
the engine never raises exceptions (always returns a valid result object).
"""
import numpy as np
import pytest

from backend.app.engines.speech.whisper import WhisperSpeechEngine
from backend.app.schemas.common import EngineStatus


class TestWhisperEngineContract:
    def test_engine_instantiation(self):
        engine = WhisperSpeechEngine(model_size="base", device="cpu", compute_type="int8")
        assert engine.model_size == "base"
        assert engine.device == "cpu"

    def test_metadata_shape(self):
        engine = WhisperSpeechEngine(model_size="tiny")
        meta = engine.metadata()
        assert meta.engine_name == "speech_whisper"
        assert meta.version == "tiny"

    def test_limitations_non_empty(self):
        engine = WhisperSpeechEngine()
        lims = engine.limitations()
        assert len(lims) >= 1

    def test_infer_without_load_returns_valid_result(self):
        """
        When the model hasn't been loaded (and sandbox blocks network),
        infer() must return a SpeechIntelligenceResult — never raise.
        """
        engine = WhisperSpeechEngine(model_size="base", device="cpu", compute_type="int8")
        # Trigger lazy load — will fail to download in sandbox (no network)
        waveform = np.zeros(16000, dtype=np.float32)
        result = engine.infer(waveform, sample_rate=16000)

        # Must always return a valid result object regardless of network
        assert result is not None
        assert result.model_id == "faster-whisper"
        # In sandbox (no network) it will be UNAVAILABLE or FAILED — never raises
        assert result.availability in (
            EngineStatus.AVAILABLE,
            EngineStatus.UNAVAILABLE,
            EngineStatus.FAILED,
        )
        # segments is always a list
        assert isinstance(result.segments, list)

    def test_infer_unavailable_returns_no_transcript(self):
        """
        When engine is UNAVAILABLE, transcript must be None and segments empty.
        """
        engine = WhisperSpeechEngine(model_size="base", device="cpu", compute_type="int8")
        # Force UNAVAILABLE without loading
        from backend.app.schemas.common import EngineStatus as ES
        engine._is_loaded = True
        engine._status = ES.UNAVAILABLE
        engine._model = None

        waveform = np.zeros(16000, dtype=np.float32)
        result = engine.infer(waveform, sample_rate=16000)

        assert result.availability == EngineStatus.UNAVAILABLE
        assert result.transcript is None
        assert result.segments == []
