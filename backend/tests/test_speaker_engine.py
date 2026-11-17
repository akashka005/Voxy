"""
Tests for ECAPA-TDNN speaker engine stub (Phase 2).
Verifies UNAVAILABLE contract — no fabricated embeddings or similarity scores.
"""
import numpy as np
import pytest

from backend.app.engines.speaker.ecapa import ECAPATDNNEngine
from backend.app.schemas.common import EngineStatus, SpeakerMatchStatus


class TestECAPAEngineStub:
    def setup_method(self):
        self.engine = ECAPATDNNEngine()

    def test_engine_not_available(self):
        assert self.engine.availability() == EngineStatus.UNAVAILABLE

    def test_metadata(self):
        meta = self.engine.metadata()
        assert meta.engine_name == "speaker_ecapa"
        assert meta.details["phase"] == 2

    def test_embed_returns_none(self):
        waveform = np.zeros(16000, dtype=np.float32)
        result = self.engine.embed(waveform, sample_rate=16000)
        assert result is None, "Phase 2 stub must not return an embedding"

    def test_compare_returns_none(self):
        a = np.zeros(192, dtype=np.float32)
        b = np.ones(192, dtype=np.float32)
        result = self.engine.compare(a, b)
        assert result is None, "Phase 2 stub must not return a similarity score"

    def test_infer_returns_unavailable(self):
        waveform = np.zeros(16000, dtype=np.float32)
        result = self.engine.infer(waveform)
        assert result.availability == EngineStatus.UNAVAILABLE
        assert result.similarity is None
        assert result.status == SpeakerMatchStatus.INCONCLUSIVE
        assert len(result.limitations) > 0
