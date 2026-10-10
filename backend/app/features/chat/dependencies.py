from typing import Annotated

from fastapi import Depends

from app.features.chat.service import AgentChatService
from app.features.chat.threads_service import ThreadsService, get_threads_service


def get_chat_service() -> AgentChatService:
    return AgentChatService()


ChatSvc = Annotated[AgentChatService, Depends(get_chat_service)]
ThreadsSvc = Annotated[ThreadsService, Depends(get_threads_service)]
