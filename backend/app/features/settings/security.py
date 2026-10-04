import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _get_fernet() -> Fernet:
    """Instancia o cifrador Fernet a partir da secret_key configurada."""
    secret = get_settings().secret_key
    # Deriva uma chave de 32 bytes compatível com Fernet via SHA-256
    key_bytes = hashlib.sha256(secret.encode("utf-8")).digest()
    url_safe_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(url_safe_key)


def encrypt_api_key(raw_key: str | None) -> str | None:
    """
    Criptografa a chave de API em formato reversível seguro para persistência no banco.
    Se já estiver criptografada ou for nula/vazia, retorna adequadamente.
    """
    if not raw_key:
        return None
    trimmed = raw_key.strip()
    if not trimmed:
        return None
    try:
        fernet = _get_fernet()
        encrypted_bytes = fernet.encrypt(trimmed.encode("utf-8"))
        return f"enc::{encrypted_bytes.decode('utf-8')}"
    except Exception as exc:
        logger.error("Erro ao criptografar chave de API: %s", exc)
        return raw_key


def decrypt_api_key(stored_key: str | None) -> str | None:
    """
    Descriptografa a chave de API recuperada do banco.
    Suporta chaves legadas salvas em plain text transparentemente.
    """
    if not stored_key:
        return None
    trimmed = stored_key.strip()
    if not trimmed.startswith("enc::"):
        # Chave legada salva em texto puro antes da migração
        return trimmed

    token = trimmed[5:]
    try:
        fernet = _get_fernet()
        decrypted_bytes = fernet.decrypt(token.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except InvalidToken:
        logger.error("Token de criptografia inválido ou secret_key incompatível.")
        return None
    except Exception as exc:
        logger.error("Erro inesperado ao descriptografar chave de API: %s", exc)
        return None


def mask_api_key(key: str | None) -> str | None:
    """Mascara uma chave de API para retorno seguro via HTTP."""
    if not key:
        return None
    trimmed = key.strip()
    if len(trimmed) <= 8:
        return "********"
    return f"{trimmed[:4]}...{trimmed[-4:]}"


def is_masked_api_key(key: str | None) -> bool:
    """Verifica se a string de chave é uma representação mascarada."""
    if not key:
        return False
    trimmed = key.strip()
    return "..." in trimmed or trimmed == "********" or "*" in trimmed


