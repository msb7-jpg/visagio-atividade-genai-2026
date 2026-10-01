from langchain_core.messages import BaseMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.core.config import Configuration
from app.db import get_model


def generate_query(messages: list[BaseMessage], config: Configuration):
    """
    Call the model to generate a response based.
    """
    response_model = get_model(config)
    response = response_model.invoke(messages)
    return response


def generate_query_pipe(topic: str, config: Configuration):
    """
    Call the model to generate a response based.
    """

    prompt = ChatPromptTemplate.from_template("Tell me a joke about {topic}")
    model = get_model(config)
    parser = StrOutputParser()
    chain = prompt | model | parser
    return chain.stream({"topic": topic})
