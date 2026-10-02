import re
import sqlite3
from typing import Any

from langchain_core.tools import tool

from app.db.session import get_readonly_db_connection
from app.shared.exceptions import DatabaseReadError

FORBIDDEN_KEYWORDS_PATTERN = re.compile(
    r"\b(DROP|DELETE|UPDATE|INSERT|ALTER|ATTACH|DETACH|CREATE|REPLACE|PRAGMA|VACUUM|REINDEX)\b",
    re.IGNORECASE,
)


@tool
def execute_sql_query(query: str) -> list[dict[str, Any]]:
    """
    Executa uma consulta analítica SQL em modo read-only (SELECT) no banco cinerocket.db.

    Args:
        query: Consulta SQL a ser executada. Deve começar com SELECT ou WITH.

    Returns:
        Lista de dicionários representando as linhas retornadas, limitado a 100 linhas.
    """
    cleaned_query = query.strip().rstrip(";")

    # Bloqueio em regex para palavras-chave de mutação
    if FORBIDDEN_KEYWORDS_PATTERN.search(cleaned_query):
        raise ValueError("Operação proibida: a consulta contém comandos de modificação ou DDL.")

    upper_clean = cleaned_query.lstrip().upper()
    if not (upper_clean.startswith("SELECT") or upper_clean.startswith("WITH")):
        raise ValueError("Apenas consultas que iniciem com SELECT ou WITH são permitidas.")

    # Conexão física read-only protegida no SQLite (mode=ro)
    try:
        with get_readonly_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(cleaned_query)
            rows = cursor.fetchmany(100)
            return [dict(row) for row in rows]
    except sqlite3.OperationalError as e:
        raise DatabaseReadError(f"Erro de execução SQLite: {e}") from e
