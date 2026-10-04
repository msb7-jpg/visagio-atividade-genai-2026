from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from app.core.config import get_settings


@asynccontextmanager
async def get_checkpointer() -> AsyncGenerator[AsyncSqliteSaver, None]:
    """
    Fornece uma instância gerenciada de AsyncSqliteSaver para checkpoints de threads do LangGraph.
    """
    settings = get_settings()
    db_path = Path(settings.checkpointer_db_path).resolve()  # ruff: ignore[blocking-path-method-in-async-function]
    db_path.parent.mkdir(parents=True, exist_ok=True)

    async with AsyncSqliteSaver.from_conn_string(str(db_path)) as saver:
        yield saver
