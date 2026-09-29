import logging
import warnings

from app.health import check_health

# Suppress progress bars and verbose warnings
warnings.filterwarnings("ignore")
logging.getLogger("pydantic").setLevel(logging.ERROR)
logging.getLogger("langchain").setLevel(logging.ERROR)

from app.agent import generate_query_pipe
from app.config import Configuration


def main():
    config = Configuration()

    check_health(config)
    answer = generate_query_pipe("bears", config)

    for token in answer:
        print(token, end="", flush=True)


if __name__ == "__main__":
    main()
