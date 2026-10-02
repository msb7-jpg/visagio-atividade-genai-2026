from typing import Any

PROVIDER_DEFAULTS: dict[str, dict[str, Any]] = {
    "groq": {
        "model": "openai/gpt-oss-120b",
        "base_url": None,
    },
    "local": {
        "model": "Qwen3.5-4B-Q4_K_M",
        "base_url": "http://localhost:1234/v1",
    },
    "openrouter": {
        "model": "apodex/apodex-1.1-mini:free",
        "base_url": "https://openrouter.ai/api/v1",
    },
    "google": {
        "model": "gemini-2.5-flash",
        "base_url": None,
    },
}
