import logging
import sys
import json
from datetime import datetime, timezone
class StructuredJsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if hasattr(record, "props") and isinstance(record.props, dict):
            props = record.props.copy()
            for sensitive_key in ("api_key", "password", "token", "audio_bytes", "embedding"):
                if sensitive_key in props:
                    props[sensitive_key] = "[REDACTED]"
            log_entry["properties"] = props

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


def setup_logging(level: str = "INFO") -> None:
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    if not root_logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredJsonFormatter())
        root_logger.addHandler(handler)
logger = logging.getLogger("voxsentinel")