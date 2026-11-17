import logging
import sys
import json
from datetime import datetime, timezone


class StructuredJsonFormatter(logging.Formatter):
    """
    Structured JSON formatter for application logs.
    Ensures safe, structured log output and prevents leakage of raw audio or secrets.
    """

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Include structured extra attributes if provided
        if hasattr(record, "props") and isinstance(record.props, dict):
            # Sanitize sensitive fields if present
            props = record.props.copy()
            for sensitive_key in ("api_key", "password", "token", "audio_bytes", "embedding"):
                if sensitive_key in props:
                    props[sensitive_key] = "[REDACTED]"
            log_entry["properties"] = props

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


def setup_logging(level: str = "INFO") -> None:
    """Configures application-wide logging."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Avoid duplicate handlers
    if not root_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJsonFormatter())
        root_logger.addHandler(handler)


logger = logging.getLogger("voxsentinel")
