from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    APP_ENV: str = "development"
    APP_NAME: str = "VoxSentinel"
    APP_VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    API_KEY: str = "development_secret_key_change_in_production"
    
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return []

    # Persistence
    DATABASE_URL: str = "sqlite:///./voxsentinel.db"

    # Audio limits & Storage
    MAX_UPLOAD_MB: int = 25
    MAX_AUDIO_DURATION_SECONDS: int = 300
    TEMP_AUDIO_DIR: str = "./tmp/audio"
    RETAIN_RAW_AUDIO: bool = False
    RETAIN_TRANSCRIPTS: bool = False

    # Compute & Execution policies
    DEFAULT_DEVICE: str = "cpu"
    ALLOW_CUDA: bool = True
    SEQUENTIAL_INFERENCE: bool = True
    MAX_GPU_MODELS: int = 1

    # Engine configs
    AASIST_ENABLED: bool = False
    AASIST_CHECKPOINT_PATH: str = ""
    AASIST_MODEL_VERSION: str = ""

    WHISPER_MODEL: str = "base"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"

    SPEAKER_VERIFICATION_ENABLED: bool = False
    REDIS_URL: str = ""


settings = Settings()
