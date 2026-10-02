import re
from typing import Literal

import sqlparse
from sqlparse.sql import Statement
from sqlparse.tokens import DDL, DML

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


def validate_sql_query(
    query: str,
) -> tuple[bool, str | None, Literal["SECURITY_VIOLATION", "RECOVERABLE_SYNTAX"] | None]:
    """
    Valida sintaticamente uma consulta SQL para assegurar que:
    1. Seja estritamente uma única declaração.
    2. Seja puramente de leitura (SELECT ou WITH).
    3. Não contenha comandos proibidos de DDL/DML.
    4. Não acesse tabelas internas/protegidas do SQLite.

    Returns:
        (is_valid, error_message, error_category)
    """
    if not (cleaned := query.strip().rstrip(";")):
        return False, "Query SQL vazia.", "RECOVERABLE_SYNTAX"

    if not (parsed := sqlparse.parse(cleaned)):
        return False, "Não foi possível analisar a consulta SQL.", "RECOVERABLE_SYNTAX"

    if len(parsed) > 1:
        return False, "Múltiplas instruções SQL não são permitidas. Envie apenas uma declaração.", "SECURITY_VIOLATION"

    stmt: Statement = parsed[0]
    first_token = stmt.get_type()

    if first_token not in ("SELECT", "UNKNOWN"):
        clean_upper = cleaned.lstrip().upper()
        if not clean_upper.startswith("WITH") and not clean_upper.startswith("SELECT"):
            msg = (
                f"Tipo de instrução não permitida: {first_token}. "
                "Apenas SELECT e CTEs (WITH) são autorizadas."
            )
            return False, msg, "SECURITY_VIOLATION"

    for token in stmt.flatten():
        val = token.value.upper()
        
        if val in DISALLOWED_STATEMENTS:
            return False, f"Comando proibido detectado na consulta: {val}", "SECURITY_VIOLATION"
        
        if token.ttype in (DML, DDL) and val not in ("SELECT", "WITH"):
            return False, f"Declaração não autorizada detectada: {val}", "SECURITY_VIOLATION"

    lower_query = cleaned.lower()
    for sys_tbl in FORBIDDEN_TABLES:
        
        if re.search(rf"\b{sys_tbl}\b", lower_query):
            return False, f"Acesso proibido à tabela de sistema: {sys_tbl}", "SECURITY_VIOLATION"

    return True, None, None
