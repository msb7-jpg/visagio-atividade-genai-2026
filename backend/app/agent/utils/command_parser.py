"""Utilitário de parsing e extração de comandos de barra (/) para o CineData."""

import re

from typing_extensions import TypedDict


class SlashCommandInfo(TypedDict, total=False):
    """Metadados do comando de barra identificado na mensagem."""

    name: str
    args: str | None


KNOWN_COMMANDS: dict[str, str] = {
    "chart": "Força geração de gráfico visual (opções: bar, line, pie, doughnut)",
    "sql": "Força rota e execução direta de consulta Text-to-SQL",
    "rag": "Força rota de busca semântica em sinopses e resenhas",
    "hybrid": "Força busca híbrida (semântica + SQL relacional)",
    "direct": "Força resposta direta sem consulta ao banco",
    "explain": "Explica a metodologia analítica ou consulta executada",
    "clear": "Limpeza do contexto conversacional",
}


def parse_slash_command(text: str) -> tuple[SlashCommandInfo | None, str]:
    """
    Identifica comandos iniciados com '/' no início da mensagem.

    Args:
        text: Mensagem original do usuário.

    Returns:
        Tupla contendo as informações do comando (se conhecido) e o texto limpo restante.
    """
    if not text:
        return None, ""

    stripped = text.strip()
    match = re.match(r"^/([a-zA-Z_-]+)(?:\s+(.*))?$", stripped, re.DOTALL)
    if not match:
        return None, text

    cmd_raw = match.group(1).lower()
    args_raw = (match.group(2) or "").strip()

    if cmd_raw in KNOWN_COMMANDS:
        return (
            SlashCommandInfo(name=cmd_raw, args=args_raw or None),
            args_raw or text,
        )

    return None, text
