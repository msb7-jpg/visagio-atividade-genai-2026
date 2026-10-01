from langchain.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from app.core.config import Configuration


def get_model(config: Configuration) -> BaseChatModel:
    """Instantiate the chat model dynamically based on GraphConfiguration."""
    return ChatOpenAI(
        api_key=SecretStr(config.model_api_key),
        base_url=config.model_base_url,
        model=config.model_name,
    )
