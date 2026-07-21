import json
import os
from app.config import settings

DEFAULT_SETTINGS = {
    "llm": {"api_url": "https://api.deepseek.com/v1/chat/completions", "api_key": ""},
    "embedding": {"api_url": "", "api_key": ""},
    "rerank": {"api_url": "", "api_key": ""},
    "mineru": {"api_url": "", "api_key": ""},
}


def _load_file() -> dict:
    if os.path.exists(settings.SETTINGS_FILE):
        try:
            with open(settings.SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            merged = DEFAULT_SETTINGS.copy()
            for k in merged:
                if k in data:
                    merged[k].update(data[k])
            return merged
        except Exception:
            return DEFAULT_SETTINGS
    return DEFAULT_SETTINGS.copy()


def get_settings() -> dict:
    return _load_file()


def save_settings(data: dict) -> dict:
    current = _load_file()
    for key in ["llm", "embedding", "rerank", "mineru"]:
        if key in data and isinstance(data[key], dict):
            current.setdefault(key, {})
            if "api_url" in data[key]:
                current[key]["api_url"] = data[key]["api_url"]
            if "api_key" in data[key]:
                current[key]["api_key"] = data[key]["api_key"]
    os.makedirs(os.path.dirname(settings.SETTINGS_FILE), exist_ok=True)
    with open(settings.SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(current, f, ensure_ascii=False, indent=2)
    return current


def get_service_config() -> dict:
    """Returns merged config from saved settings + env fallback."""
    saved = _load_file()

    def _(key: str, field: str, env_var: str, default: str = "") -> str:
        val = saved.get(key, {}).get(field, "")
        if not val:
            val = os.getenv(env_var, default)
        return val

    return {
        "LLM_API_URL": _("llm", "api_url", "LLM_API_URL", "https://api.deepseek.com/v1/chat/completions"),
        "LLM_API_KEY": _("llm", "api_key", "LLM_API_KEY", ""),
        "EMBEDDING_API_URL": _("embedding", "api_url", "EMBEDDING_API_URL", ""),
        "EMBEDDING_API_KEY": _("embedding", "api_key", "EMBEDDING_API_KEY", ""),
        "RERANK_API_URL": _("rerank", "api_url", "RERANK_API_URL", ""),
        "RERANK_API_KEY": _("rerank", "api_key", "RERANK_API_KEY", ""),
        "MINERU_API_URL": _("mineru", "api_url", "MINERU_API_URL", ""),
        "MINERU_API_KEY": _("mineru", "api_key", "MINERU_API_KEY", ""),
    }
