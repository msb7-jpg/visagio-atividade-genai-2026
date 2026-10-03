from unittest.mock import AsyncMock, patch

import pytest
from langchain_core.messages import AIMessage

from app.features.chat.subroutines.title_generator import TitleGeneratorSubroutine
from app.features.chat.thread_repository import ThreadRepository
from app.features.settings.schemas import ProviderConfigDTO


@pytest.mark.asyncio
async def test_title_generator_subroutine_success():
    thread_id = "test-title-sub-123"
    await ThreadRepository.get_or_create_thread(thread_id, default_title="Nova Conversa")

    provider_cfg = ProviderConfigDTO(
        provider="groq",
        model="llama-3.3-70b-versatile",
        api_key="gsk_fake",
        timeout_seconds=10,
    )

    mock_llm = AsyncMock()
    mock_llm.ainvoke.return_value = AIMessage(content="Ranking de Bilheterias")

    callback_called = False
    callback_title = ""

    def on_title_cb(tid, title):
        nonlocal callback_called, callback_title
        callback_called = True
        callback_title = title

    with patch(
        "app.features.chat.subroutines.title_generator.get_chat_model",
        return_value=mock_llm,
    ):
        task = TitleGeneratorSubroutine.spawn(
            thread_id=thread_id,
            user_message="Quais os filmes de maior bilheteria?",
            provider_config=provider_cfg,
            on_title_generated=on_title_cb,
        )
        generated_title = await task

        assert generated_title == "Ranking de Bilheterias"
        assert callback_called is True
        assert callback_title == "Ranking de Bilheterias"

        saved_thread = await ThreadRepository.get_thread_summary(thread_id)
        assert saved_thread is not None
        assert saved_thread.title == "Ranking de Bilheterias"
