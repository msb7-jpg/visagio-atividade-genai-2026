import uuid

import pytest
from langchain_core.messages import AIMessage, HumanMessage

from app.agent.graph import create_agent_graph
from app.db.checkpointer import get_checkpointer


@pytest.mark.asyncio
async def test_agent_graph_state_persistence_with_checkpointer():
    """
    Valida se o StateGraph mantém mensagens entre invocações na mesma thread_id
    através do AsyncSqliteSaver.
    """
    async with get_checkpointer() as saver:
        await saver.setup()
        graph = create_agent_graph(checkpointer=saver)

        thread_id = f"test-thread-{uuid.uuid4()}"
        config = {"configurable": {"thread_id": thread_id}}

        # Inicia com uma pergunta
        state = await graph.aget_state(config)
        assert state.values == {}

        # Simula escrita com id hexadecimal / UUID válido
        valid_checkpoint_id = str(uuid.uuid4())
        await saver.aput(
            config={"configurable": {"thread_id": thread_id, "checkpoint_ns": ""}},
            checkpoint={
                "v": 1,
                "id": valid_checkpoint_id,
                "ts": "2026-10-03T12:00:00Z",
                "channel_values": {
                    "messages": [
                        HumanMessage(content="Qual o filme mais lucrativo?"),
                        AIMessage(content="Avatar foi o mais lucrativo."),
                    ],
                    "title": "Filme Mais Lucrativo",
                },
                "channel_versions": {},
                "versions_seen": {},
            },
            metadata={"source": "test", "step": 1, "writes": {}},
            new_versions={},
        )

        # Recupera estado atualizado pela thread_id
        loaded_state = await graph.aget_state(config)
        assert len(loaded_state.values.get("messages", [])) == 2
        assert loaded_state.values["messages"][0].content == "Qual o filme mais lucrativo?"
        assert loaded_state.values["messages"][1].content == "Avatar foi o mais lucrativo."
