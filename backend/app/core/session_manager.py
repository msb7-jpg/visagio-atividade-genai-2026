import asyncio
import logging
from collections.abc import Set

logger = logging.getLogger(__name__)


class ActiveSessionManager:
    """
    Gerenciador thread-safe em memória para rastrear sessões ativas de inferência e streaming.
    Permite bloquear alterações concorrentes que possam invalidar a execução in-flight.
    """

    def __init__(self):
        self._active_sessions: set[str] = set()
        self._lock = asyncio.Lock()

    async def register_session(self, session_id: str) -> None:
        async with self._lock:
            self._active_sessions.add(session_id)
            logger.debug("Sessão ativa registrada: %s (Total: %d)", session_id, len(self._active_sessions))

    async def unregister_session(self, session_id: str) -> None:
        async with self._lock:
            self._active_sessions.discard(session_id)
            logger.debug("Sessão ativa desregistrada: %s (Total: %d)", session_id, len(self._active_sessions))

    async def has_active_sessions(self) -> bool:
        async with self._lock:
            return len(self._active_sessions) > 0

    async def get_active_sessions(self) -> list[str]:
        async with self._lock:
            return list(self._active_sessions)

    async def clear_all(self) -> None:
        async with self._lock:
            self._active_sessions.clear()


_session_manager_instance: ActiveSessionManager | None = None


def get_session_manager() -> ActiveSessionManager:
    """Retorna a instância singleton do gerenciador de sessões ativas."""
    global _session_manager_instance
    if _session_manager_instance is None:
        _session_manager_instance = ActiveSessionManager()
    return _session_manager_instance
