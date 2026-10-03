def mask_api_key(key: str | None) -> str | None:
    """Mascara uma chave de API para retorno seguro via HTTP."""
    if not key:
        return None
    trimmed = key.strip()
    if len(trimmed) <= 8:
        return "********"
    return f"{trimmed[:4]}...{trimmed[-4:]}"
