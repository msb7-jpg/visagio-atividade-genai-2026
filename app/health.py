import requests

from app.config import Configuration


def check_health(config: Configuration):
    url = config.model_health_url
    response = requests.get(url)

    if response.status_code != 200:
        raise ValueError(f"The AI Server is not running (HTTP {response.status_code}).")

    try:
        content = response.json()
    except requests.exceptions.JSONDecodeError:
        raise ValueError("The AI Server returned an invalid response.")

    if content.get("status") != "ok":
        raise ValueError("The AI Server is not running.")

    print("All Health Checks Passed!")
