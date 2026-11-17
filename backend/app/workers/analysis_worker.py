from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Any
from backend.app.core.logging import logger

# Bounded thread pool executor for CPU/GPU audio and ML workloads
# Keeps blocking operations off the async FastAPI event loop
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="voxsentinel_worker")


def submit_analysis_task(fn: Callable[..., Any], *args: Any, **kwargs: Any) -> None:
    """Submits a job to the bounded analysis thread worker."""
    try:
        _executor.submit(fn, *args, **kwargs)
    except Exception as e:
        logger.error(f"Failed to submit analysis task to executor: {str(e)}")
        raise
