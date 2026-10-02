from typing import Any

from langgraph.graph import END, START, StateGraph

from app.agent.state import AgentState


def router_node(state: AgentState) -> dict[str, Any]:
    """
    Nó inicial de classificação de intenção (placeholder para Slice 0).
    Define uma rota padrão caso nenhuma tenha sido atribuída.
    """
    route = state.get("route") or "direct"
    return {"route": route}


def create_agent_graph():
    """
    Compila o StateGraph inicial do agente.
    Nos próximos slices, este grafo incorporará nós de SQL, RAG, visualização e autocorreção.
    """
    workflow = StateGraph(AgentState)

    # Registro de nós
    workflow.add_node("router", router_node)

    # Transições
    workflow.add_edge(START, "router")
    workflow.add_edge("router", END)

    return workflow.compile()
