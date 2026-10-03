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
