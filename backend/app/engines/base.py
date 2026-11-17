from abc import ABC, abstractmethod
from typing import Any, List
from backend.app.schemas.common import EngineStatus, EngineMetadata


class BaseEngine(ABC):
    """
    Common lifecycle and interface contract for all VoxSentinel inference engines.
    Engines stay independent and strictly separate model loading from inference.
    """

    engine_name: str

    @abstractmethod
    def load(self) -> None:
        """Load and validate model resources lazily."""
        pass

    @abstractmethod
    def infer(self, payload: Any) -> Any:
        """Run inference on the payload and return a typed result."""
        pass

    @abstractmethod
    def availability(self) -> EngineStatus:
        """
        Return the availability status of the engine:
        - AVAILABLE: Model/checkpoint verified and ready for inference.
        - UNAVAILABLE: Checkpoint missing, disabled, or dependency absent.
        - FAILED: Engine encountered an unrecoverable failure during execution.
        - INCONCLUSIVE: Inference executed but evidence was insufficient.
        """
        pass

    @abstractmethod
    def metadata(self) -> EngineMetadata:
        """Return model identifier, version, compute device, and checkpoint details."""
        pass

    @abstractmethod
    def limitations(self) -> List[str]:
        """Return known limitations and boundaries for this engine."""
        pass
