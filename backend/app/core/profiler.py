"""Mecanismo de profiling de queries SQLAlchemy e detecção de N+1."""

import contextvars
import logging
import time
from collections import Counter
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from fastapi import Request, Response
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncEngine
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("app.profiler")

SLOW_QUERY_THRESHOLD_MS = 100.0
HIGH_QUERY_COUNT_THRESHOLD = 8
N_PLUS_ONE_DUPLICATE_THRESHOLD = 3


@dataclass
class QueryRecord:
    statement: str
    duration_ms: float
    parameters: Any


_current_queries: contextvars.ContextVar[list[QueryRecord] | None] = contextvars.ContextVar(
    "_current_queries", default=None
)


def start_profiling() -> list[QueryRecord]:
    """Inicia o rastreamento de queries no contexto assíncrono atual."""
    records: list[QueryRecord] = []
    _current_queries.set(records)
    return records


def stop_profiling() -> list[QueryRecord]:
    """Finaliza o rastreamento e retorna as queries coletadas."""
    records = _current_queries.get() or []
    _current_queries.set(None)
    return records


def get_current_query_records() -> list[QueryRecord] | None:
    return _current_queries.get()


def setup_query_profiler(engine: AsyncEngine) -> None:
    """Registra listeners na engine SQLAlchemy para interceptar execuções de queries."""
    sync_engine = engine.sync_engine

    @event.listens_for(sync_engine, "before_cursor_execute")
    def before_cursor_execute(
        conn: Any,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None:
        del cursor, executemany
        conn.info.setdefault("query_start_time", []).append(time.perf_counter())

    @event.listens_for(sync_engine, "after_cursor_execute")
    def after_cursor_execute(
        conn: Any,
        cursor: Any,
        statement: str,
        parameters: Any,
        context: Any,
        executemany: bool,
    ) -> None:
        del cursor, executemany, context
        start_times = conn.info.get("query_start_time")
        if start_times:
            start_time = start_times.pop()
            duration_ms = (time.perf_counter() - start_time) * 1000.0
        else:
            duration_ms = 0.0

        records = get_current_query_records()
        if records is not None:
            records.append(
                QueryRecord(
                    statement=statement,
                    duration_ms=duration_ms,
                    parameters=parameters,
                )
            )

        if duration_ms >= SLOW_QUERY_THRESHOLD_MS:
            clean_stmt = " ".join(statement.split())
            logger.warning(
                "[SLOW QUERY] %dms > %.1fms threshold | SQL: %s",
                int(duration_ms),
                SLOW_QUERY_THRESHOLD_MS,
                clean_stmt[:300],
            )


def analyze_queries_for_n_plus_one(records: list[QueryRecord]) -> list[tuple[str, int]]:
    """Analisa queries executadas e retorna declarações repetidas que indicam problema de N+1."""
    # Normaliza whitespace para agrupamento
    normalized = [" ".join(record.statement.split()) for record in records]
    counts = Counter(normalized)
    return [(stmt, count) for stmt, count in counts.items() if count >= N_PLUS_ONE_DUPLICATE_THRESHOLD]


class QueryProfilerMiddleware(BaseHTTPMiddleware):
    """Middleware FastAPI que mede queries, tempo de banco e alerta sobre N+1."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        start_profiling()
        req_start_time = time.perf_counter()

        try:
            response = await call_next(request)
        finally:
            req_duration_ms = (time.perf_counter() - req_start_time) * 1000.0
            records = stop_profiling()

            query_count = len(records)
            db_time_ms = sum(record.duration_ms for record in records)

            # Detecção de N+1
            n_plus_one_suspects = analyze_queries_for_n_plus_one(records)
            for stmt, count in n_plus_one_suspects:
                logger.warning(
                    "[N+1 DETECTED] %s %s - Query executada %d vezes: %s",
                    request.method,
                    request.url.path,
                    count,
                    stmt[:250],
                )

            # Alerta de volume alto de queries
            if query_count >= HIGH_QUERY_COUNT_THRESHOLD:
                logger.warning(
                    "[HIGH QUERY COUNT] %s %s disparou %d queries (DB: %.2fms, Total: %.2fms)",
                    request.method,
                    request.url.path,
                    query_count,
                    db_time_ms,
                    req_duration_ms,
                )
            else:
                logger.debug(
                    "%s %s | %d queries | DB: %.2fms | Total: %.2fms",
                    request.method,
                    request.url.path,
                    query_count,
                    db_time_ms,
                    req_duration_ms,
                )

        response.headers["X-Query-Count"] = str(query_count)
        response.headers["X-DB-Time-Ms"] = f"{db_time_ms:.2f}"
        response.headers["X-Process-Time-Ms"] = f"{req_duration_ms:.2f}"

        return response
