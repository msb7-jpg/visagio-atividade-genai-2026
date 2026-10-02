from app.shared.docs import EndpointDoc

get_provider_doc = EndpointDoc(
    summary="Obter configuração ativa de provedor de LLM",
    description=(
        "Retorna os dados do provedor de IA atualmente configurado com a chave de API "
        "mascarada por segurança."
    ),
    response_description="Configuração ativa retornada com sucesso.",
)

update_provider_doc = EndpointDoc(
    summary="Atualizar configuração do provedor de LLM ativo",
    description=(
        "Persiste dinamicamente os novos parâmetros de provedor, modelo, chave ou URL base "
        "para as consultas do agente."
    ),
    response_description="Configuração atualizada com sucesso.",
)

test_provider_doc = EndpointDoc(
    summary="Testar conectividade em tempo real com provedor de LLM",
    description=(
        "Executa uma requisição de probe leve e efêmera (timeout de 5s) sem persistir "
        "os dados imediatamente, medindo latência e retornando diagnósticos amigáveis."
    ),
    response_description="Resultado do teste retornado com status, latência e diagnóstico.",
)
