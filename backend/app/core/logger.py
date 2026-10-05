import logging

from app.core.config import get_settings


def configure_logging() -> None:
    """Configura o logging da aplicação uma única vez no processo com formato legível e estruturado."""

    settings = get_settings()
    log_format = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    logging.basicConfig(
        level=settings.log_level.upper(),
        format=log_format,
        datefmt=date_format,
        force=True,
    )

    # Silenciar logs excessivamente verbosos de bibliotecas HTTP e ML na inicialização
    for noisy_logger in (
        "httpx",
        "httpcore",
        "huggingface_hub",
        "sentence_transformers",
        "transformers",
        "urllib3",
    ):
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)
