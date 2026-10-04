"""Ambiente de execução Python em sandbox estrita e segura para análises matemáticas."""

import ast
import io
import math
import statistics
from contextlib import redirect_stdout
from typing import Any

from app.shared.exceptions import SecurityError

SAFE_BUILTINS: dict[str, Any] = {
    "abs": abs,
    "all": all,
    "any": any,
    "bool": bool,
    "dict": dict,
    "enumerate": enumerate,
    "float": float,
    "int": int,
    "len": len,
    "list": list,
    "max": max,
    "min": min,
    "pow": pow,
    "range": range,
    "round": round,
    "sorted": sorted,
    "str": str,
    "sum": sum,
    "zip": zip,
}

FORBIDDEN_AST_NODES = (
    ast.Import,
    ast.ImportFrom,
)

FORBIDDEN_NAMES = {
    "__import__",
    "open",
    "eval",
    "exec",
    "compile",
    "globals",
    "locals",
    "getattr",
    "setattr",
    "delattr",
    "hasattr",
    "memoryview",
    "breakpoint",
    "input",
    "exit",
    "quit",
}


def validate_python_code(code: str) -> None:
    """
    Analisa a árvore sintática (AST) do código para rejeitar imports e operações não autorizadas.

    Args:
        code: Código Python em string.

    Raises:
        SecurityError: Se o código contiver imports ou chamadas a funções perigosas.
        SyntaxError: Se o código for sintaticamente inválido.
    """
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        raise SyntaxError(f"Erro sintático no código Python: {e}") from e

    for node in ast.walk(tree):
        if isinstance(node, FORBIDDEN_AST_NODES):
            raise SecurityError("Instruções 'import' não são permitidas na sandbox.")

        if isinstance(node, ast.Name) and node.id in FORBIDDEN_NAMES:
            raise SecurityError(f"Acesso ao identificador perigoso '{node.id}' foi bloqueado.")

        if isinstance(node, ast.Attribute) and node.attr.startswith("__"):
            raise SecurityError(f"Acesso a atributos privados dunder ('{node.attr}') é estritamente proibido.")


def execute_sandboxed_code(code: str, initial_vars: dict[str, Any] | None = None) -> str:
    """
    Executa o código em um namespace restrito com builtins seguros e módulos math e statistics.

    Args:
        code: Trecho de código Python a ser executado.
        initial_vars: Variáveis iniciais injetadas no ambiente (ex: dados analíticos).

    Returns:
        String com o valor da variável 'result' ou com a saída impressa via stdout.
    """
    validate_python_code(code)

    stdout_buffer = io.StringIO()
    local_env: dict[str, Any] = {
        "__builtins__": SAFE_BUILTINS,
        "math": math,
        "statistics": statistics,
    }

    if initial_vars:
        local_env.update({k: v for k, v in initial_vars.items() if not k.startswith("__")})

    with redirect_stdout(stdout_buffer):
        exec(code, local_env)  # ruff: ignore[exec-builtin] - código pré-validado via AST sem imports ou builtins do SO

    output = stdout_buffer.getvalue().strip()

    if "result" in local_env and local_env["result"] is not None:
        res = local_env["result"]
        if isinstance(res, float):
            return f"{res:.4f}".rstrip("0").rstrip(".") if "." in f"{res:.4f}" else str(res)
        return str(res)

    if output:
        return output

    return "Cálculo executado com sucesso, porém nenhuma variável 'result' ou saída impressa foi detectada."
