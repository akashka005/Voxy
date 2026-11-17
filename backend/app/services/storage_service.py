import os
import uuid
from typing import Optional
from backend.app.core.config import settings
from backend.app.core.logging import logger


class StorageService:
    """
    Manages safe temporary audio file storage and deterministic cleanup.
    Uploaded filenames are never used for disk storage or shell operations.
    """

    def __init__(self, temp_dir: Optional[str] = None):
        self.temp_dir = temp_dir or settings.TEMP_AUDIO_DIR
        os.makedirs(self.temp_dir, exist_ok=True)

    def save_temporary_audio(self, content: bytes, extension: str = "bin") -> str:
        """
        Saves raw uploaded bytes using a randomized UUID filename in a controlled directory.
        """
        clean_ext = extension.lstrip(".").lower()
        # Restrict extension to alphanumeric only to avoid path traversal
        clean_ext = "".join(c for c in clean_ext if c.isalnum()) or "bin"

        file_id = str(uuid.uuid4())
        safe_filename = f"{file_id}.{clean_ext}"
        destination = os.path.abspath(os.path.join(self.temp_dir, safe_filename))

        with open(destination, "wb") as f:
            f.write(content)

        return destination

    def cleanup_temporary_file(self, file_path: str) -> None:
        """
        Safely deletes a temporary file unless retention is explicitly enabled in config.
        """
        if settings.RETAIN_RAW_AUDIO:
            logger.info("Raw audio retention enabled; skipping temporary file cleanup.")
            return

        try:
            if file_path and os.path.exists(file_path):
                # Ensure the path is within the temporary directory
                abs_temp = os.path.abspath(self.temp_dir)
                abs_target = os.path.abspath(file_path)
                if abs_target.startswith(abs_temp):
                    os.remove(abs_target)
        except Exception as e:
            logger.warning(f"Failed to delete temporary audio file: {str(e)}")


storage_service = StorageService()
