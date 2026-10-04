import contextlib
import logging
import time

from app.db.checkpointer import get_checkpointer
from app.features.chat.schemas import ThreadSummaryDTO

logger = logging.getLogger(__name__)


class ThreadRepository:
    """
    Repositório para persistência, metadados e listagem de threads/sessões
    integrado com o banco SQLite de checkpoints do LangGraph.
    """

    @classmethod
    async def init_schema(cls) -> None:
        """Garante que a tabela thread_metadata exista no banco de checkpoints."""
        async with get_checkpointer() as saver, saver.conn.cursor() as cur:
            await saver.setup()
            await cur.execute(
                """
                CREATE TABLE IF NOT EXISTS thread_metadata (
                    thread_id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                )
                """
            )
            await cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_thread_metadata_updated ON thread_metadata(updated_at DESC)"
            )
            await saver.conn.commit()

    @classmethod
    async def get_or_create_thread(cls, thread_id: str, default_title: str = "Nova Conversa") -> ThreadSummaryDTO:
        now = time.time()
        await cls.init_schema()
        async with get_checkpointer() as saver, saver.conn.cursor() as cur:
            await cur.execute(
                "SELECT thread_id, title, created_at, updated_at FROM thread_metadata WHERE thread_id = ?",
                (thread_id,),
            )
            row = await cur.fetchone()
            if row:
                return ThreadSummaryDTO(
                    thread_id=row[0],
                    title=row[1],
                    created_at=row[2],
                    updated_at=row[3],
                )

            await cur.execute(
                """
                INSERT INTO thread_metadata (thread_id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                """,
                (thread_id, default_title, now, now),
            )
            await saver.conn.commit()
            return ThreadSummaryDTO(
                thread_id=thread_id,
                title=default_title,
                created_at=now,
                updated_at=now,
            )

    @classmethod
    async def update_thread_title(cls, thread_id: str, title: str) -> None:
        now = time.time()
        await cls.init_schema()
        async with get_checkpointer() as saver, saver.conn.cursor() as cur:
            await cur.execute(
                """
                INSERT INTO thread_metadata (thread_id, title, created_at, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(thread_id) DO UPDATE SET
                    title = excluded.title,
                    updated_at = excluded.updated_at
                """,
                (thread_id, title, now, now),
            )
            await saver.conn.commit()

    @classmethod
    async def touch_thread(cls, thread_id: str) -> None:
        now = time.time()
        await cls.init_schema()
        async with get_checkpointer() as saver, saver.conn.cursor() as cur:
            await cur.execute(
                "UPDATE thread_metadata SET updated_at = ? WHERE thread_id = ?",
                (now, thread_id),
            )
            await saver.conn.commit()

    @classmethod
    async def list_threads(cls, limit: int = 50, offset: int = 0) -> list[ThreadSummaryDTO]:
        await cls.init_schema()
        async with get_checkpointer() as saver, saver.conn.cursor() as cur:
            await cur.execute(
                """
                SELECT thread_id, title, created_at, updated_at
                FROM thread_metadata
                ORDER BY updated_at DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset),
            )
            rows = await cur.fetchall()
            return [
                ThreadSummaryDTO(
                    thread_id=r[0],
                    title=r[1],
                    created_at=r[2],
                    updated_at=r[3],
                )
                for r in rows
            ]

    @classmethod
    async def delete_thread(cls, thread_id: str) -> bool:
        await cls.init_schema()
        async with get_checkpointer() as saver:
            if hasattr(saver, "adelete_thread"):
                with contextlib.suppress(Exception):
                    await saver.adelete_thread(thread_id)

            async with saver.conn.cursor() as cur:
                await cur.execute("DELETE FROM checkpoints WHERE thread_id = ?", (thread_id,))
                await cur.execute("DELETE FROM writes WHERE thread_id = ?", (thread_id,))
                await cur.execute("DELETE FROM thread_metadata WHERE thread_id = ?", (thread_id,))
                deleted = cur.rowcount > 0
                await saver.conn.commit()
                return deleted

    @classmethod
    async def get_thread_summary(cls, thread_id: str) -> ThreadSummaryDTO | None:
        await cls.init_schema()
        async with get_checkpointer() as saver, saver.conn.cursor() as cur:
            await cur.execute(
                "SELECT thread_id, title, created_at, updated_at FROM thread_metadata WHERE thread_id = ?",
                (thread_id,),
            )
            row = await cur.fetchone()
            if not row:
                return None
            return ThreadSummaryDTO(
                thread_id=row[0],
                title=row[1],
                created_at=row[2],
                updated_at=row[3],
            )
