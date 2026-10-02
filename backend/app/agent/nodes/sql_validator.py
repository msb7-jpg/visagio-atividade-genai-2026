import re

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


def validate_sql_query(query: str) -> tuple[bool, str | None]:
    """
    Valida sintaticamente uma consulta SQL para assegurar que:
    1. Seja estritamente uma única declaração.
    2. Seja puramente de leitura (SELECT ou WITH).
    3. Não contenha comandos proibidos de DDL/DML.
    4. Não acesse tabelas internas/protegidas do SQLite.

    Returns:
        (is_valid, error_message)
    """
    if not (cleaned := query.strip().rstrip(";")):
        return False, "Query SQL vazia."

    if not (parsed := sqlparse.parse(cleaned)):
        return False, "Não foi possível analisar a consulta SQL."

    if len(parsed) > 1:
        return False, "Múltiplas instruções SQL não são permitidas. Envie apenas uma declaração."

    stmt: Statement = parsed[0]
    first_token = stmt.get_type()

    if first_token not in ("SELECT", "UNKNOWN"):
        clean_upper = cleaned.lstrip().upper()
        if not clean_upper.startswith("WITH") and not clean_upper.startswith("SELECT"):
            msg = (
                f"Tipo de instrução não permitida: {first_token}. "
                "Apenas SELECT e CTEs (WITH) são autorizadas."
            )
            return False, msg

    for token in stmt.flatten():
        val = token.value.upper()
        
        if val in DISALLOWED_STATEMENTS:
            return False, f"Comando proibido detectado na consulta: {val}"
        
        if token.ttype in (DML, DDL) and val not in ("SELECT", "WITH"):
            return False, f"Declaração não autorizada detectada: {val}"

    lower_query = cleaned.lower()
    for sys_tbl in FORBIDDEN_TABLES:
        
        if re.search(rf"\b{sys_tbl}\b", lower_query):
            return False, f"Acesso proibido à tabela de sistema: {sys_tbl}"

    return True, None
