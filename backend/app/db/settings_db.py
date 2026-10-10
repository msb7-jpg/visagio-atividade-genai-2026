from pathlib import Path
from typing import Any

import aiosqlite

from app.features.settings.security import decrypt_api_key, encrypt_api_key


def get_settings_db_path() -> Path:
    """Retorna o caminho do banco SQLite exclusivo para configurações da aplicação."""
    base_dir = Path(__file__).resolve().parent.parent.parent
    return base_dir / "app_settings.db"


async def init_settings_db() -> None:
    """Cria a tabela de configurações de provedores caso não exista."""
    db_path = get_settings_db_path()
    async with aiosqlite.connect(str(db_path)) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS user_model_configs (
                user_id TEXT NOT NULL DEFAULT 'default_user',
                provider TEXT NOT NULL,
                model TEXT NOT NULL,
                api_key TEXT,
                base_url TEXT,
                timeout_seconds INTEGER DEFAULT 30,
                extra_kwargs TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, provider)
            );
            """
        )
        await db.commit()


async def save_user_provider_config(
    user_id: str,
    provider: str,
    model: str,
    api_key: str | None,
    base_url: str | None,
    timeout_seconds: int = 30,
    extra_kwargs: str | None = None,
) -> None:
    """Salva ou atualiza a configuração de um provedor para o usuário no banco com chave criptografada."""
    await init_settings_db()
    db_path = get_settings_db_path()
    encrypted_key = encrypt_api_key(api_key) if api_key else None
    async with aiosqlite.connect(str(db_path)) as db:
        await db.execute(
            """
            INSERT INTO user_model_configs (
                user_id, provider, model, api_key, base_url, timeout_seconds, extra_kwargs, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id, provider) DO UPDATE SET
                model = excluded.model,
                api_key = COALESCE(excluded.api_key, user_model_configs.api_key),
                base_url = excluded.base_url,
                timeout_seconds = excluded.timeout_seconds,
                extra_kwargs = excluded.extra_kwargs,
                updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, provider, model, encrypted_key, base_url, timeout_seconds, extra_kwargs),
        )
        await db.commit()


async def get_user_provider_config(user_id: str, provider: str) -> dict[str, Any] | None:
    """Busca a configuração salva de um provedor específico para o usuário com api_key descriptografada."""
    await init_settings_db()
    db_path = get_settings_db_path()
    async with aiosqlite.connect(str(db_path)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT provider, model, api_key, base_url, timeout_seconds, extra_kwargs, updated_at
            FROM user_model_configs
            WHERE user_id = ? AND provider = ?
            """,
            (user_id, provider),
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                data = dict(row)
                if data.get("api_key"):
                    data["api_key"] = decrypt_api_key(data["api_key"])
                return data
    return None


async def get_all_saved_providers(user_id: str = "default_user") -> list[str]:
    """Retorna a lista de nomes dos provedores configurados e salvos no banco para o usuário."""
    await init_settings_db()
    db_path = get_settings_db_path()
    async with (
        aiosqlite.connect(str(db_path)) as db,
        db.execute(
            """
            SELECT provider
            FROM user_model_configs
            WHERE user_id = ?
            ORDER BY updated_at DESC
            """,
            (user_id,),
        ) as cursor,
    ):
        rows = await cursor.fetchall()
        return [row[0] for row in rows]


async def get_active_provider_config(user_id: str = "default_user") -> dict[str, Any] | None:
    """Retorna a configuração mais recentemente atualizada para o usuário com api_key descriptografada."""
    await init_settings_db()
    db_path = get_settings_db_path()
    async with aiosqlite.connect(str(db_path)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT provider, model, api_key, base_url, timeout_seconds, extra_kwargs
            FROM user_model_configs
            WHERE user_id = ?
            ORDER BY updated_at DESC
            LIMIT 1
            """,
            (user_id,),
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                data = dict(row)
                if data.get("api_key"):
                    data["api_key"] = decrypt_api_key(data["api_key"])
                return data
    return None


async def get_all_user_provider_configs(
    user_id: str = "default_user",
) -> dict[str, dict[str, Any]]:
    """Retorna todas as configurações salvas indexadas pelo nome do provedor com api_key descriptografada."""
    await init_settings_db()
    db_path = get_settings_db_path()
    result = {}
    async with aiosqlite.connect(str(db_path)) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """
            SELECT provider, model, api_key, base_url, timeout_seconds, extra_kwargs, updated_at
            FROM user_model_configs
            WHERE user_id = ?
            ORDER BY updated_at DESC
            """,
            (user_id,),
        ) as cursor:
            rows = await cursor.fetchall()
            for row in rows:
                item = dict(row)
                if item.get("api_key"):
                    item["api_key"] = decrypt_api_key(item["api_key"])
                result[item["provider"]] = item
    return result


def get_active_provider_config_sync(user_id: str = "default_user") -> dict[str, Any] | None:
    """Busca síncrona da configuração mais recente no banco SQLite com api_key descriptografada."""
    import sqlite3

    db_path = get_settings_db_path()
    if not db_path.exists():
        return None
    try:
        with sqlite3.connect(str(db_path)) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                """
                SELECT provider, model, api_key, base_url, timeout_seconds, extra_kwargs
                FROM user_model_configs
                WHERE user_id = ?
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (user_id,),
            )
            row = cursor.fetchone()
            if row:
                data = dict(row)
                if data.get("api_key"):
                    data["api_key"] = decrypt_api_key(data["api_key"])
                return data
    except Exception:
        return None
    return None


def get_user_provider_config_sync(user_id: str, provider: str) -> dict[str, Any] | None:
    """Busca síncrona da configuração de um provedor específico no banco SQLite com api_key descriptografada."""
    import sqlite3

    db_path = get_settings_db_path()
    if not db_path.exists():
        return None
    try:
        with sqlite3.connect(str(db_path)) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.execute(
                """
                SELECT provider, model, api_key, base_url, timeout_seconds, extra_kwargs, updated_at
                FROM user_model_configs
                WHERE user_id = ? AND provider = ?
                """,
                (user_id, provider),
            )
            row = cursor.fetchone()
            if row:
                data = dict(row)
                if data.get("api_key"):
                    data["api_key"] = decrypt_api_key(data["api_key"])
                return data
    except Exception:
        return None
    return None
