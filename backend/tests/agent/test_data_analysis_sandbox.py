"""Testes de segurança e execução para a sandbox matemática e estatística."""

import pytest

from app.agent.tools.data_analysis import calculate_data_metrics
from app.agent.tools.sandbox_env import SecurityError, execute_sandboxed_code, validate_python_code


def test_valid_math_and_statistics_execution():
    """Valida cálculos legítimos utilizando os módulos math e statistics."""
    # Sem 'import' explícito, os módulos já estão disponíveis
    clean_code = """
data = [10.0, 20.0, 30.0, 40.0, 50.0]
avg = statistics.mean(data)
sqrt_avg = math.sqrt(avg)
result = round(sqrt_avg, 2)
"""
    output = execute_sandboxed_code(clean_code)
    assert output == "5.48"


def test_calculate_data_metrics_tool():
    """Testa a invocação da tool LangChain com cálculo de mediana."""
    code = "result = statistics.median([100, 20, 50])"
    tool_output = calculate_data_metrics.invoke({"code": code})
    assert tool_output == "50"


@pytest.mark.parametrize(
    "malicious_code",
    [
        "import os; os.system('ls')",
        "from sys import modules",
        "__import__('os').system('echo hack')",
        "open('/etc/passwd', 'r').read()",
        "eval('2 + 2')",
        "exec('print(1)')",
        "().__class__.__base__.__subclasses__()",
        "globals()['__builtins__']",
    ],
)
def test_sandbox_blocks_malicious_code(malicious_code: str):
    """Garante que qualquer tentativa de fuga ou operação perigosa seja bloqueada na AST."""
    with pytest.raises(SecurityError):
        validate_python_code(malicious_code)

    tool_result = calculate_data_metrics.invoke({"code": malicious_code})
    assert "Bloqueio de Segurança" in tool_result


def test_sandbox_with_initial_variables():
    """Testa a injeção segura de variáveis na sandbox (ex: linhas retornadas do banco)."""
    rows = [{"titulo": "Filme A", "lucro": 1000}, {"titulo": "Filme B", "lucro": 3000}]
    code = "result = sum(r['lucro'] for r in rows)"
    output = execute_sandboxed_code(code, initial_vars={"rows": rows})
    assert output == "4000"
