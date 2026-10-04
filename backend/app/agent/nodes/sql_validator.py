import re
from typing import Literal

import sqlparse
from sqlparse.sql import Statement
from sqlparse.tokens import DDL, DML

from app.core.constants import SqlErrorCategory

DISALLOWED_STATEMENTS = {
    "DROP",
    "DELETE",
    "UPDATE",
    "INSERT",
    "ALTER",
    "CREATE",
    "REPLACE",
    "TRUNCATE",
    "ATTACH",
    "DETACH",
    "PRAGMA",
}
FORBIDDEN_TABLES = {"sqlite_master", "sqlite_sequence", "sqlite_stat1", "sqlite_temp_master"}


def _check_statement_type(stmt: Statement, cleaned: str) -> tuple[bool, str | None]:
    """Verifica se o tipo da declaração é estritamente SELECT ou CTE WITH."""
    first_token = stmt.get_type()
    if first_token in ("SELECT", "UNKNOWN"):
        return True, None

    clean_upper = cleaned.lstrip().upper()
    if clean_upper.startswith(("WITH", "SELECT")):
        return True, None

    msg = f"Tipo de instrução não permitida: {first_token}. Apenas SELECT e CTEs (WITH) são autorizadas."
    return False, msg


def _check_disallowed_tokens(stmt: Statement) -> tuple[bool, str | None]:
    """Verifica a presença de comandos proibidos de DDL/DML na árvore sintática."""
    for token in stmt.flatten():
        val = token.value.upper()
        if val in DISALLOWED_STATEMENTS:
            return False, f"Comando proibido detectado na consulta: {val}"
        if token.ttype in (DML, DDL) and val not in ("SELECT", "WITH"):
            return False, f"Declaração não autorizada detectada: {val}"
    return True, None


def _check_forbidden_tables(lower_query: str) -> tuple[bool, str | None]:
    """Verifica tentativas de acesso a tabelas de sistema do SQLite."""
    for sys_tbl in FORBIDDEN_TABLES:
        if re.search(rf"\b{sys_tbl}\b", lower_query):
            return False, f"Acesso proibido à tabela de sistema: {sys_tbl}"
    return True, None


def validate_sql_query(
    query: str,
) -> tuple[bool, str | None, SqlErrorCategory | Literal["SECURITY_VIOLATION", "RECOVERABLE_SYNTAX"] | None]:
    """
    Valida sintaticamente uma consulta SQL para assegurar integridade analítica e segurança.

    Regras aplicadas:
    1. Seja estritamente uma única declaração.
    2. Seja puramente de leitura (SELECT ou WITH).
    3. Não contenha comandos proibidos de DDL/DML.
    4. Não acesse tabelas internas/protegidas do SQLite.

    Args:
        query: String contendo a consulta SQL gerada.

    Returns:
        Tupla (is_valid, error_message, error_category).
    """
    if not (cleaned := query.strip().rstrip(";")):
        return False, "Query SQL vazia.", SqlErrorCategory.RECOVERABLE_SYNTAX

    if not (parsed := sqlparse.parse(cleaned)):
        return False, "Não foi possível analisar a consulta SQL.", SqlErrorCategory.RECOVERABLE_SYNTAX

    if len(parsed) > 1:
        return (
            False,
            "Múltiplas instruções SQL não são permitidas. Envie apenas uma declaração.",
            SqlErrorCategory.SECURITY_VIOLATION,
        )

    stmt: Statement = parsed[0]

    type_ok, type_err = _check_statement_type(stmt, cleaned)
    if not type_ok:
        return False, type_err, SqlErrorCategory.SECURITY_VIOLATION

    tokens_ok, token_err = _check_disallowed_tokens(stmt)
    if not tokens_ok:
        return False, token_err, SqlErrorCategory.SECURITY_VIOLATION

    tables_ok, table_err = _check_forbidden_tables(cleaned.lower())
    if not tables_ok:
        return False, table_err, SqlErrorCategory.SECURITY_VIOLATION

    return True, None, None
