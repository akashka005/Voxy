from typing import List, Optional, Any
import numpy as np

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.schemas.common import EngineStatus, EngineMetadata
from backend.app.schemas.speech import SpeechIntelligenceResult, TranscriptSegment
from backend.app.engines.base import BaseEngine


class WhisperSpeechEngine(BaseEngine):
    """
    Speech Intelligence / ASR engine based on faster-whisper.
    Produces timestamped transcript segments and language identification.
    Strictly keeps ASR confidence separate from voice authenticity evidence.
    """

    engine_name = "speech_whisper"

    def __init__(
        self,
        model_size: Optional[str] = None,
        device: Optional[str] = None,
        compute_type: Optional[str] = None,
    ):
        self.model_size = model_size or settings.WHISPER_MODEL
        self.device = device or settings.WHISPER_DEVICE
        self.compute_type = compute_type or settings.WHISPER_COMPUTE_TYPE

        self._model = None
        self._is_loaded = False
        self._status: EngineStatus = EngineStatus.UNAVAILABLE
        self._limitations: List[str] = [
            "Transcription confidence reflects acoustic clarity only; it is never evidence of voice authenticity.",
            "Heavily compressed or noisy telephony audio may degrade word accuracy.",
        ]

    def availability(self) -> EngineStatus:
        return self._status

    def metadata(self) -> EngineMetadata:
        return EngineMetadata(
            engine_name=self.engine_name,
            model_name="faster-whisper",
            version=self.model_size,
            device=self.device,
            details={"compute_type": self.compute_type},
        )

    def limitations(self) -> List[str]:
        return list(self._limitations)

    def load(self) -> None:
        if self._is_loaded:
            return

        try:
            from faster_whisper import WhisperModel
            logger.info(f"Loading faster-whisper model '{self.model_size}' on {self.device} ({self.compute_type})...")
            self._model = WhisperModel(
                self.model_size,
                device=self.device,
                compute_type=self.compute_type,
            )
            self._status = EngineStatus.AVAILABLE
            self._is_loaded = True
            logger.info("faster-whisper model loaded successfully.")
        except ImportError:
            self._status = EngineStatus.UNAVAILABLE
            self._is_loaded = True
            logger.info("faster-whisper is not installed; Speech Intelligence marked UNAVAILABLE.")
        except Exception as e:
            self._status = EngineStatus.FAILED
            self._is_loaded = True
            logger.error(f"Failed to load faster-whisper model: {str(e)}")

    def infer(self, waveform: np.ndarray, sample_rate: int = 16000) -> SpeechIntelligenceResult:
        """
        Transcribes 16 kHz mono waveform and returns timestamped segments.
        """
        if not self._is_loaded:
            self.load()

        if self._status != EngineStatus.AVAILABLE or self._model is None:
            return SpeechIntelligenceResult(
                availability=self._status,
                model_id="faster-whisper",
                model_version=self.model_size,
                language=None,
                transcript=None,
                segments=[],
                limitations=self.limitations() + ["ASR engine unavailable; transcription not executed."],
            )

        try:
            # faster-whisper accepts float32 numpy array directly
            segments_gen, info = self._model.transcribe(
                waveform,
                beam_size=3,
                language=None,
                vad_filter=True,
            )

            detected_segments: List[TranscriptSegment] = []
            full_text_parts: List[str] = []

            for idx, seg in enumerate(segments_gen):
                text_clean = seg.text.strip()
                if text_clean:
                    full_text_parts.append(text_clean)
                    detected_segments.append(
                        TranscriptSegment(
                            segment_index=idx,
                            start_time=float(seg.start),
                            end_time=float(seg.end),
                            text=text_clean,
                            confidence=float(np.exp(seg.avg_logprob)) if seg.avg_logprob is not None else None,
                            language=info.language,
                        )
                    )

            full_transcript = " ".join(full_text_parts) if full_text_parts else ""

            return SpeechIntelligenceResult(
                availability=EngineStatus.AVAILABLE,
                model_id="faster-whisper",
                model_version=self.model_size,
                language=info.language,
                transcript=full_transcript,
                segments=detected_segments,
                limitations=self.limitations(),
            )
        except Exception as e:
            logger.error(f"Transcription failed: {str(e)}")
            return SpeechIntelligenceResult(
                availability=EngineStatus.FAILED,
                model_id="faster-whisper",
                model_version=self.model_size,
                language=None,
                transcript=None,
                segments=[],
                limitations=self.limitations() + [f"Transcription failed: {str(e)}"],
            )
