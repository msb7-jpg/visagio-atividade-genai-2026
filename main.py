import logging
import warnings

from langchain_core.messages import HumanMessage

# Suppress progress bars and verbose warnings
warnings.filterwarnings("ignore")
logging.getLogger("pydantic").setLevel(logging.ERROR)
logging.getLogger("langchain").setLevel(logging.ERROR)

from app.agent import generate_query
from app.config import Configuration


def main():
    config = Configuration()
    answer = generate_query(
        [HumanMessage(content="What is the capital of USA?")], config
    )
    print("AI Model: ", answer.content)


if __name__ == "__main__":
    main()
