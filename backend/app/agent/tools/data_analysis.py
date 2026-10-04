"""Ferramenta LangChain para cálculos matemáticos e estatísticos em sandbox segura."""

from langchain_core.tools import tool

from app.agent.tools.sandbox_env import SecurityError, execute_sandboxed_code


@tool
def calculate_data_metrics(code: str) -> str:
    """
    Executa cálculos matemáticos e estatísticos avançados sobre números em Python puro.

    Ideal para calcular percentis, desvios padrão, medianas, variâncias, correlações,
    taxas de crescimento ou proporções que seriam complexas ou lentas em SQL.
    Módulos disponíveis no ambiente: 'math', 'statistics'.
    O código DEVE atribuir o resultado final a uma variável chamada 'result' ou utilizar print().

    Args:
        code: Código Python em string sem imports. Ex: "result = statistics.stdev([10.5, 20.1, 15.3])"

    Returns:
        String com o valor computado ou mensagem de erro diagnóstica.
    """
    try:
        return execute_sandboxed_code(code)
    except SecurityError as sec_err:
        return f"Bloqueio de Segurança na Sandbox: {sec_err}"
    except SyntaxError as syn_err:
        return f"Erro de Sintaxe no Código Python: {syn_err}"
    except Exception as exc:
        return f"Erro de Execução no Cálculo: {type(exc).__name__} - {exc}"
