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
