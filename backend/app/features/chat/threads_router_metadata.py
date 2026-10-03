from app.shared.docs import EndpointDoc

LIST_THREADS_DOC = EndpointDoc(
    summary="Listar conversas e threads anteriores",
    description="Retorna lista paginada de threads persistidas ordenadas pelas mais recentes.",
    response_description="Array de resumos de threads (ThreadSummaryDTO).",
)

GET_THREAD_DOC = EndpointDoc(
    summary="Obter histórico completo de uma thread",
    description="Recupera metadados e histórico de mensagens persistidas para a thread informada.",
    response_description="Objeto com metadados e mensagens da thread (ThreadDetailDTO).",
)

DELETE_THREAD_DOC = EndpointDoc(
    summary="Excluir thread de conversa",
    description="Remove permanentemente uma thread e todos os seus checkpoints de persistência.",
    response_description="Status booleano confirmando a exclusão com sucesso.",
)
