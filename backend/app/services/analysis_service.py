import time
from typing import Optional, List
from sqlalchemy.orm import Session

from backend.app.core.logging import logger
from backend.app.db import session as db_session_module
from backend.app.db.repositories.analysis_repo import AnalysisRepository
from backend.app.schemas.analysis import AnalysisOptions
from backend.app.services.audio_service import audio_service
from backend.app.services.storage_service import storage_service
from backend.app.engines.authenticity.aasist import AASISTEngine
from backend.app.engines.speech.whisper import WhisperSpeechEngine
from backend.app.engines.fraud.classifier import FraudRuleEngine
from backend.app.intelligence.temporal_analyzer import temporal_analyzer
from backend.app.intelligence.fusion import risk_fusion_engine
from backend.app.workers.analysis_worker import submit_analysis_task


class AnalysisService:
    def __init__(self):
        self.aasist_engine = AASISTEngine()
        self.whisper_engine = WhisperSpeechEngine()
        self.fraud_engine = FraudRuleEngine()

    def enqueue_analysis_job(
        self,
        db: Session,
        temp_file_path: str,
        original_filename: Optional[str] = None,
        options: Optional[AnalysisOptions] = None,
    ) -> str:
        """
        Registers analysis in database as QUEUED and enqueues worker task.
        """
        repo = AnalysisRepository(db)
        analysis = repo.create_analysis(filename=original_filename)
        analysis_id = analysis.id

        submit_analysis_task(
            self._execute_pipeline,
            analysis_id,
            temp_file_path,
            options or AnalysisOptions(),
        )

        return analysis_id

    def _execute_pipeline(
        self,
        analysis_id: str,
        temp_file_path: str,
        options: AnalysisOptions,
    ) -> None:
        """
        Sequential execution pipeline running within worker thread.
        """
        db = db_session_module.SessionLocal()
        repo = AnalysisRepository(db)
        start_time = time.time()

        try:
            logger.info(f"Starting analysis job {analysis_id}...")
            repo.update_status(analysis_id, "PROCESSING")

            # 1. Decode & Preprocess Audio
            bundle = audio_service.process_file(temp_file_path)

            # 2. Sequential Engine Execution
            # A. Authenticity Engine
            auth_result = None
            if options.enable_authenticity:
                logger.info(f"Executing authenticity engine for job {analysis_id}...")
                auth_result = self.aasist_engine.infer(bundle.segments)

            # B. Speech Intelligence (ASR)
            speech_result = None
            if options.enable_speech:
                logger.info(f"Executing speech intelligence for job {analysis_id}...")
                speech_result = self.whisper_engine.infer(bundle.preprocessed_waveform)

            # C. Fraud Intent Analysis
            fraud_result = None
            if options.enable_fraud:
                logger.info(f"Executing fraud intent engine for job {analysis_id}...")
                transcript_text = speech_result.transcript if speech_result else ""
                transcript_segments = speech_result.segments if speech_result else []
                fraud_result = self.fraud_engine.infer(transcript_text, transcript_segments)

            # 3. Temporal Trust Analysis
            auth_segs = auth_result.segments if auth_result else []
            temporal_result = temporal_analyzer.analyze(
                authenticity_segments=auth_segs,
                speech_ratio=bundle.speech_ratio,
            )

            # 4. Uncertainty-Aware Risk Fusion
            logger.info(f"Synthesizing risk fusion for job {analysis_id}...")
            assessment, evidence_items = risk_fusion_engine.fuse(
                authenticity=auth_result,
                fraud=fraud_result,
                speaker=None,  # Speaker verification deferred to Phase 2
                audio_speech_ratio=bundle.speech_ratio,
            )

            # 5. Persist Results
            repo.save_analysis_results(
                analysis_id=analysis_id,
                decoded=bundle.decoded,
                assessment=assessment,
                authenticity=auth_result,
                speech=speech_result,
                fraud=fraud_result,
                speaker=None,
                evidence=evidence_items,
            )

            elapsed_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Analysis job {analysis_id} completed successfully in {elapsed_ms} ms.")

        except Exception as e:
            logger.error(f"Analysis job {analysis_id} failed: {str(e)}", exc_info=True)
            repo.update_status(analysis_id, "FAILED", error_message=str(e))
        finally:
            # Deterministic cleanup of uploaded temp audio
            storage_service.cleanup_temporary_file(temp_file_path)
            db.close()


analysis_service = AnalysisService()
