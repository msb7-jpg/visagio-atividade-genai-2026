"""Nó do LangGraph para análises estatísticas e cálculos avançados em sandbox segura."""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig

from app.agent.state import AgentState, AgentStateUpdate
from app.agent.tools.sandbox_env import execute_sandboxed_code
from app.core.llm_factory import get_chat_model

logger = logging.getLogger(__name__)

STATISTICAL_ANALYSIS_PROMPT = """Você é o Especialista em Estatística e Matemática do CineData Analytics.
Você recebeu os seguintes dados analíticos extraídos do banco de dados relacional:
DADOS: {query_result}

PERGUNTA DO USUÁRIO: {user_prompt}

Escreva um script Python EXTREMAMENTE ENXUTO para responder à pergunta com precisão matemática.
REGRAS:
1. NÃO use instruções 'import' (os módulos 'math' e 'statistics' já estão embutidos e prontos para uso).
2. O conjunto de dados já está disponível na variável global 'rows' como uma lista de dicionários.
3. Atribua o resultado numérico ou textual final obrigatoriamente a uma variável chamada 'result'.
4. Retorne APENAS o bloco de código puro em Python, sem explicações em markdown.
"""


def should_run_data_analysis(state: AgentState) -> bool:
    """
    Identifica se a consulta requer cálculo estatístico ou agregação numérica avançada.

    Args:
        state: Estado contendo o histórico de mensagens e os resultados do banco.

    Returns:
        True se termos estatísticos foram identificados e houver registros retornados, False caso contrário.
    """
    rows = state.get("query_result")
    if not rows or len(rows) < 2:
        return False

    messages = state.get("messages", [])
    last_user_message = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_user_message = str(msg.content).lower()
            break

    math_keywords = {
        "desvio padrão",
        "desvio-padrão",
        "variância",
        "variancia",
        "mediana",
        "percentil",
        "quantil",
        "correlação",
        "estatística",
        "estatisticas",
        "taxa composta",
        "cálculo avançado",
    }
    return any(kw in last_user_message for kw in math_keywords)


async def data_analysis_node(state: AgentState, config: RunnableConfig | None = None) -> AgentStateUpdate:
    """
    Executa código estatístico gerado pela LLM em sandbox Python isolada.

    Args:
        state: Estado atual contendo 'query_result' e mensagens.
        config: Configurações de execução com LLM ativa.

    Returns:
        Atualização de estado com 'data_analysis_result'.
    """
    rows = state.get("query_result", [])
    if not rows:
        return {"data_analysis_result": None}

    messages = state.get("messages", [])
    last_user_message = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage) or getattr(msg, "type", "") == "human":
            last_user_message = str(msg.content)
            break

    configurable = (config or {}).get("configurable", {})
    llm = get_chat_model(
        provider=configurable.get("provider"),
        model=configurable.get("model"),
        api_key=configurable.get("api_key"),
        base_url=configurable.get("base_url"),
        timeout_seconds=configurable.get("timeout_seconds") or 30,
        temperature=0.0,
    )

    prompt_content = STATISTICAL_ANALYSIS_PROMPT.format(
        query_result=str(rows[:50]),
        user_prompt=last_user_message,
    )

    try:
        response = await llm.ainvoke([
            SystemMessage(content=prompt_content),
            HumanMessage(content="Gere o código Python puro para o cálculo estatístico."),
        ])
        code = str(response.content).strip()
        if "```" in code:
            # Remove blocos markdown caso o modelo retorne
            lines = code.split("\n")
            cleaned_lines = [line_str for line_str in lines if not line_str.startswith("```")]
            code = "\n".join(cleaned_lines).strip()

        result_str = execute_sandboxed_code(code, initial_vars={"rows": rows})
        logger.info("Cálculo em sandbox estatística concluído: %s", result_str)
        return {
            "data_analysis_result": result_str,
            "thought": f"Cálculo estatístico executado na sandbox segura com resultado: {result_str}.",
        }
    except Exception as exc:
        logger.warning("Falha ao executar cálculo na sandbox estatística: %s", exc)
        return {
            "data_analysis_result": f"Não foi possível concluir o cálculo estatístico automatizado: {exc}",
        }
