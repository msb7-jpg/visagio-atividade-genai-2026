"""Testes para o utilitário de parsing de comandos de barra (command_parser)."""

import pytest

from app.agent.utils.command_parser import parse_slash_command


def test_parse_slash_command_simple():
    cmd, clean_text = parse_slash_command("/chart")
    assert cmd is not None
    assert cmd["name"] == "chart"
    assert cmd["args"] is None
    assert clean_text == "/chart"


def test_parse_slash_command_with_args():
    cmd, clean_text = parse_slash_command("/chart bar Top 5 produtoras")
    assert cmd is not None
    assert cmd["name"] == "chart"
    assert cmd["args"] == "bar Top 5 produtoras"
    assert clean_text == "bar Top 5 produtoras"


def test_parse_slash_command_sql_and_rag():
    cmd_sql, clean_sql = parse_slash_command("/sql Quais filmes faturaram mais de 100M?")
    assert cmd_sql is not None
    assert cmd_sql["name"] == "sql"
    assert clean_sql == "Quais filmes faturaram mais de 100M?"

    cmd_rag, clean_rag = parse_slash_command("/rag Encontre sinopses com viagens no tempo")
    assert cmd_rag is not None
    assert cmd_rag["name"] == "rag"
    assert clean_rag == "Encontre sinopses com viagens no tempo"


def test_parse_slash_command_unknown_returns_none():
    cmd, clean_text = parse_slash_command("/unknown_command faça algo")
    assert cmd is None
    assert clean_text == "/unknown_command faça algo"


def test_parse_slash_command_regular_text():
    cmd, clean_text = parse_slash_command("Qual a receita de Avatar?")
    assert cmd is None
    assert clean_text == "Qual a receita de Avatar?"


def test_parse_slash_command_empty():
    cmd, clean_text = parse_slash_command("")
    assert cmd is None
    assert clean_text == ""
