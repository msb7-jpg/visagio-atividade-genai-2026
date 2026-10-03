import logging
from typing import Any

logger = logging.getLogger(__name__)


class StreamErrorHandler:
    """
    Responsável por categorizar e formatar exceções ocorridas durante o processamento do chat
    em mensagens amigáveis e estruturadas para o cliente SSE.
    """

    @classmethod
    def format_error(
        cls, exc: Exception, active_provider: str | None = None
    ) -> dict[str, str]:
        raw_str = str(exc)
        error_lower = raw_str.lower()
        prov_name = active_provider.title() if active_provider else "IA"

        if "402" in error_lower or "resource_exhausted" in error_lower:
            return {
                "error": raw_str,
                "error_code": "RESOURCE_EXHAUSTED",
                "message": (
                    f"Créditos ou cota da chave de API esgotados no provedor '{prov_name}' "
                    "(402 Resource Exhausted). Acesse o painel de faturamento do provedor "
                    "ou troque o provedor ativo nas configurações."
                ),
            }

        if (
            "401" in error_lower
            or "unauthorized" in error_lower
            or "invalid" in error_lower
            or "não autorizada" in error_lower
            or "403" in error_lower
        ):
            return {
                "error": raw_str,
                "error_code": "UNAUTHORIZED",
                "message": (
                    f"Chave de API inválida ou não autorizada para o provedor '{prov_name}'. "
                    "Verifique ou atualize suas credenciais no painel de configurações."
                ),
            }

        if (
            "connection refused" in error_lower
            or "connecterror" in error_lower
            or "failed to connect" in error_lower
        ):
            return {
                "error": raw_str,
                "error_code": "CONNECTION_REFUSED",
                "message": (
                    f"Não foi possível conectar ao servidor do provedor '{prov_name}'. "
                    "Verifique se o serviço local ou remoto está online e acessível."
                ),
            }

        if "timed out" in error_lower or "timeout" in error_lower:
            return {
                "error": raw_str,
                "error_code": "TIMEOUT",
                "message": (
                    f"Tempo limite excedido ao aguardar resposta do provedor '{prov_name}'. "
                    "O modelo pode estar sobrecarregado no momento."
                ),
            }

        return {
            "error": raw_str,
            "error_code": "AGENT_ERROR",
            "message": f"Ocorreu uma falha no processamento analítico: {raw_str[:200]}",
        }
