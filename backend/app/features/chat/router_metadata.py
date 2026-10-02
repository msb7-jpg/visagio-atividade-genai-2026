from app.shared.docs import EndpointDoc

STREAM_CHAT_DOC = EndpointDoc(
    summary="Processar pergunta e transmitir resposta via SSE",
    description=(
        "Executa o agente analítico (LangGraph) para responder à pergunta do usuário, "
        "emitindo eventos de Server-Sent Events (SSE) em tempo real: progresso de nós, "
        "raciocínio interno, SQL gerado, dados tabulares e tokens de resposta."
    ),
    response_description="Stream assíncrono de eventos no formato text/event-stream.",
)
