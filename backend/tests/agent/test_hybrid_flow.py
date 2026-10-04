"""Testes de integração para o fluxo de roteamento semântico e híbrido (RAG + SQL)."""

import pytest
from langchain_core.messages import HumanMessage

from app.agent.graph import route_decision, semantic_decision
from app.agent.nodes.semantic_rag import semantic_search_node
from app.core.constants import AgentNode


def test_route_and_semantic_decisions():
    """Valida as bifurcações condicionais na FSM do LangGraph."""
    # Roteamento inicial
    assert route_decision({"route": "direct"}) == AgentNode.SYNTHESIZER.value
    assert route_decision({"route": "sql"}) == AgentNode.SQL_GENERATOR.value
    assert route_decision({"route": "rag"}) == AgentNode.SEMANTIC_SEARCH.value
    assert route_decision({"route": "hybrid"}) == AgentNode.SEMANTIC_SEARCH.value

    # Decisão pós-busca semântica
    assert semantic_decision({"route": "rag"}) == AgentNode.SYNTHESIZER.value
    assert semantic_decision({"route": "hybrid"}) == AgentNode.SQL_GENERATOR.value


@pytest.mark.asyncio
async def test_semantic_search_node_execution():
    """Testa a execução do nó semantic_search_node populando o estado."""
    state = {
        "messages": [HumanMessage(content="filmes de ficção científica com inteligência artificial")],
        "route": "rag",
    }
    update = await semantic_search_node(state)
    assert "semantic_results" in update
    assert len(update["semantic_results"]) > 0
    assert "thought" in update
    assert "Busca semântica vetorial" in update["thought"]
