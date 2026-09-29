from langchain_core.messages import BaseMessage

from app.config import Configuration
from app.db import get_model


def generate_query(messages: list[BaseMessage], config: Configuration):
    """
    Call the model to generate a response based on the current state. Given
    the question, it will decide to retrieve using the retriever tool, or simply respond to the user.
    """
    response_model = get_model(config)

    response = response_model.invoke(messages)

    return response
