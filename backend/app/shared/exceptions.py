from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from fastapi import FastAPI, Request


class DomainError(Exception):
    """
    Exceção base para erros de domínio da aplicação CineData Analytics.

    Attributes:
        message: Mensagem explicativa do erro de domínio.
        code: Código semântico padronizado da falha.
    """

    def __init__(self, message: str, code: str = "DOMAIN_ERROR") -> None:
        """
        Inicializa a exceção com uma mensagem amigável e código de erro.

        Args:
            message: Descrição textual do erro.
            code: Código legível por máquina identificando a falha.
        """
        super().__init__(message)
        self.message = message
        self.code = code


# Alias para retrocompatibilidade
DomainException = DomainError


class SecurityError(Exception):
    """Exceção levantada quando código não autorizado tenta violar a sandbox."""


class DatabaseReadError(DomainError):
    """
    Lançada quando ocorre uma falha na consulta somente-leitura ao banco analítico.

    Attributes:
        message: Descrição do erro de leitura.
        code: Código 'DATABASE_READ_ERROR'.
    """

    def __init__(self, message: str) -> None:
        """
        Inicializa o erro de leitura do banco de dados.

        Args:
            message: Mensagem descritiva da falha de conexão ou execução.
        """
        super().__init__(message, code="DATABASE_READ_ERROR")


class ProviderUnavailableError(DomainError):
    """
    Lançada quando o provedor de LLM configurado está inacessível ou com cota esgotada.

    Attributes:
        message: Descrição da indisponibilidade do provedor.
        code: Código 'PROVIDER_UNAVAILABLE'.
        status_code: Código HTTP retornado pela API remota.
    """

    def __init__(self, message: str, status_code: int = 503) -> None:
        """
        Inicializa o erro de indisponibilidade de provedor LLM.

        Args:
            message: Detalhes da recusa ou falha da API.
            status_code: Código de status HTTP (padrão: 503).
        """
        super().__init__(message, code="PROVIDER_UNAVAILABLE")
        self.status_code = status_code


class ActiveSessionConflictError(DomainError):
    """Lançada quando uma mutação é impedida por sessões analíticas em andamento."""

    def __init__(self, message: str = "Operação bloqueada enquanto houver sessão ativa em andamento.") -> None:
        super().__init__(message, code="ACTIVE_SESSION_CONFLICT")


class ResourceNotFoundError(DomainError):
    """Lançada quando uma entidade de domínio não é encontrada."""

    def __init__(self, resource: str, identifier: str) -> None:
        super().__init__(
            f"{resource} com identificador '{identifier}' não foi encontrado(a).",
            code="RESOURCE_NOT_FOUND",
        )
        self.resource = resource
        self.identifier = identifier


def register_exception_handlers(app: FastAPI | Any) -> None:
    """
    Registra centralizadamente todos os manipuladores de exceções de domínio da aplicação FastAPI.

    Args:
        app: Instância da aplicação FastAPI.
    """
    from fastapi.responses import JSONResponse

    @app.exception_handler(ActiveSessionConflictError)
    def handle_active_session_conflict(_request: Request, exc: ActiveSessionConflictError) -> JSONResponse:
        """Mapeamento central para conflito de sessão concorrente (409 Conflict)."""
        return JSONResponse(
            status_code=409,
            content={"detail": exc.message, "code": exc.code},
        )

    @app.exception_handler(ResourceNotFoundError)
    def handle_resource_not_found(_request: Request, exc: ResourceNotFoundError) -> JSONResponse:
        """Mapeamento central para entidade não localizada (404 Not Found)."""
        return JSONResponse(
            status_code=404,
            content={"detail": exc.message, "code": exc.code, "resource": exc.resource, "id": exc.identifier},
        )

    @app.exception_handler(ProviderUnavailableError)
    def handle_provider_unavailable(_request: Request, exc: ProviderUnavailableError) -> JSONResponse:
        """Mapeamento central para indisponibilidade de provedor LLM (503 Service Unavailable)."""
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message, "code": exc.code},
        )

    @app.exception_handler(DomainError)
    def handle_domain_error(_request: Request, exc: DomainError) -> JSONResponse:
        """Mapeamento central de fallback para DomainError genérico (400 Bad Request)."""
        return JSONResponse(
            status_code=400,
            content={"detail": exc.message, "code": exc.code},
        )
