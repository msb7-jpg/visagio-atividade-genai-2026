import logging

from app.core.constants import StreamErrorCode
from app.features.chat.schemas import StreamErrorPayload

logger = logging.getLogger(__name__)


class StreamErrorHandler:
    """
    Responsável por categorizar e formatar exceções ocorridas durante o processamento do chat
    em mensagens amigáveis e estruturadas para o cliente SSE.
    """

    @classmethod
    def format_error(cls, exc: Exception, active_provider: str | None = None) -> StreamErrorPayload:
        """
        Categoriza a exceção capturada e constrói um payload explicativo para o usuário final.

        Args:
            exc: Instância de exceção levantada durante a execução da thread ou LangGraph.
            active_provider: Nome do provedor LLM ativo no momento da falha.

        Returns:
            StreamErrorPayload com raw_error, error_code padronizado e mensagem contextualizada em pt-BR.
        """
        raw_str = str(exc)
        error_lower = raw_str.lower()
        prov_name = active_provider.title() if active_provider else "IA"

        if "402" in error_lower or "resource_exhausted" in error_lower:
            return {
                "error": raw_str,
                "error_code": StreamErrorCode.RESOURCE_EXHAUSTED.value,
                "message": (
                    f"Créditos ou cota da chave de API esgotados no provedor '{prov_name}' "
                    "(402 Resource Exhausted). Acesse o painel de faturamento do provedor "
                    "ou troque o provedor ativo nas configurações."
                ),
            }

        if any(term in error_lower for term in ("401", "unauthorized", "invalid", "não autorizada", "403")):
            return {
                "error": raw_str,
                "error_code": StreamErrorCode.UNAUTHORIZED.value,
                "message": (
                    f"Chave de API inválida ou não autorizada para o provedor '{prov_name}'. "
                    "Verifique ou atualize suas credenciais no painel de configurações."
                ),
            }

        if any(term in error_lower for term in ("connection refused", "connecterror", "failed to connect")):
            return {
                "error": raw_str,
                "error_code": StreamErrorCode.CONNECTION_REFUSED.value,
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
            "error_code": StreamErrorCode.AGENT_ERROR.value,
            "message": f"Ocorreu uma falha no processamento analítico: {raw_str[:200]}",
        }
