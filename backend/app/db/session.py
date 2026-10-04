import logging
import sqlite3
from collections.abc import Generator
from contextlib import contextmanager, suppress
from pathlib import Path

import sqlite_vec

from app.core.config import get_settings
from app.shared.exceptions import DatabaseReadError

logger = logging.getLogger(__name__)


def get_db_path() -> Path:
    """Retorna o caminho validado para o arquivo cinerocket.db."""
    settings = get_settings()
    path = Path(settings.sqlite_db_path).resolve()
    if not path.exists():
        raise FileNotFoundError(f"Banco de dados analítico não encontrado em: {path}")
    return path


@contextmanager
def get_readonly_db_connection(enable_vec: bool = True) -> Generator[sqlite3.Connection, None, None]:
    """
    Context manager que abre uma conexão SQLite estritamente READ-ONLY (mode=ro).
    Garante bloqueio físico de tentativas de escrita (INSERT, UPDATE, DELETE, DROP).
    Opcionalmente carrega a extensão sqlite-vec para suporte a funções vetoriais nativas.
    """
    db_path = get_db_path()
    # Conexão estritamente Read-Only em nível de driver SQLite URI
    uri = f"file:{db_path.as_posix()}?mode=ro"
    try:
        conn = sqlite3.connect(uri, uri=True, timeout=10.0)
        conn.row_factory = sqlite3.Row
        if enable_vec:
            try:
                conn.enable_load_extension(True)
                sqlite_vec.load(conn)
                conn.enable_load_extension(False)
            except Exception as e:
                logger.debug("Extensão sqlite-vec não carregada: %s", e)
        yield conn
    except sqlite3.OperationalError as e:
        raise DatabaseReadError(f"Erro ao acessar banco analítico em modo read-only: {e}") from e
    finally:
        with suppress(Exception):
            conn.close()
