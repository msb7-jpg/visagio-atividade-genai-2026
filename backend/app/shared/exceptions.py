class DomainException(Exception):
    """Exceção base para erros de domínio da aplicação CineData."""

    def __init__(self, message: str, code: str = "DOMAIN_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


class DatabaseReadError(DomainException):
    """Lançada quando ocorre uma falha na consulta somente-leitura ao banco analítico."""

    def __init__(self, message: str):
        super().__init__(message, code="DATABASE_READ_ERROR")


class ProviderUnavailableError(DomainException):
    """Lançada quando o provedor de LLM configurado está inacessível ou com cota esgotada."""

    def __init__(self, message: str, status_code: int = 503):
        super().__init__(message, code="PROVIDER_UNAVAILABLE")
        self.status_code = status_code
