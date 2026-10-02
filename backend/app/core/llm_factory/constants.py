from typing import Any

PROVIDER_DEFAULTS: dict[str, dict[str, Any]] = {
    "groq": {
        "model": "llama-3.3-70b-versatile",
        "base_url": None,
    },
    "local": {
        "model": "Qwen3.5-4B-Q4_K_M",
        "base_url": "http://localhost:1234/v1",
    },
    "openrouter": {
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "base_url": "https://openrouter.ai/api/v1",
    },
    "google": {
        "model": "gemini-2.0-flash",
        "base_url": None,
    },
    "openai": {
        "model": "gpt-4o-mini",
        "base_url": None,
    },
}
