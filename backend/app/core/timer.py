import time
from typing import Any


class ExecutionTimer:
    """
    Utilitário canônico de temporização e medição de latência.
    Suporta uso como Context Manager e operações estáticas/de classe.
    """

    def __init__(self):
        self._start_time: float = 0.0
        self._end_time: float | None = None

    def __enter__(self) -> "ExecutionTimer":
        self._start_time = time.perf_counter()
        self._end_time = None
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        self._end_time = time.perf_counter()

    def start(self) -> "ExecutionTimer":
        self._start_time = time.perf_counter()
        self._end_time = None
        return self

    def stop(self) -> float:
        self._end_time = time.perf_counter()
        return self.elapsed_ms

    @property
    def elapsed_seconds(self) -> float:
        current = self._end_time if self._end_time is not None else time.perf_counter()
        return current - self._start_time

    @property
    def elapsed_ms(self) -> float:
        return round(self.elapsed_seconds * 1000.0, 2)

    @property
    def duration_ms_int(self) -> int:
        return int(self.elapsed_seconds * 1000)

    @classmethod
    def perf_counter(cls) -> float:
        return time.perf_counter()

    @classmethod
    def now_ms(cls) -> float:
        return round(time.perf_counter() * 1000.0, 2)
