---
name: backend-coding-standards
description: Diretrizes e padrões arquiteturais para backend moderno em Python 3.12+ e FastAPI: Clean Architecture, Vertical Slices, anti-god files, separação de responsabilidades, early returns, walrus operator, contextlib.suppress, tratamento de concorrência e resiliência. Use ao arquitetar, refatorar ou implementar APIs, serviços, routers, repositórios e fluxos assíncronos no backend.
---

# Padrões Arquiteturais e Boas Práticas de Backend (Python 3.12+ & FastAPI)

Este documento estabelece as diretrizes canônicas, agnósticas a domínio, para desenvolvimento, arquitetura e manutenibilidade de projetos backend modernos.

## 1. Filosofia Arquitetural & Vertical Slices

### 1.1 Vertical Slice Architecture & Ports and Adapters
- Estruture a base de código orientada a funcionalidades (*Vertical Slices*), agrupando código por contexto semântico.
- **Desacoplamento Estrito:** A camada de transporte/HTTP (routers, FastAPI, schemas Pydantic de entrada/saída) **nunca** deve conter lógica de negócios, conhecimento de nós internos de pipelines de dados ou realizar orquestração complexa.
- Os endpoints devem apenas: validar entrada (Pydantic), invocar o serviço/fachada injetado e mapear o resultado para a resposta HTTP.

### 1.2 Statelessness no Transporte HTTP
- O servidor HTTP não deve manter estado conversacional, de sessão pesada ou cursores em memória RAM.
- Toda a persistência, histórico ou cursores de continuidade devem ser delegados ao banco de dados ou a um mecanismo de checkpoint persistido por um identificador (`session_id`, `thread_id`).

### 1.3 Segurança, Permissões e Resiliência (Fail-Fast)
- **Princípio do Menor Privilégio:** Conexões com bancos de dados de leitura ou integrações externas devem operar em modos restritos (ex: `mode=ro`). Operações destrutivas requerem transações atômicas estritas.
- **Fail-Fast:** Jamais silencie falhas de infraestrutura, indisponibilidades de rede (ex: HTTP 429, Timeout) ou credenciais inválidas. Transforme exceções em diagnósticos estruturados de infraestrutura e notifique imediatamente. Falhas de terceiros não devem ser disfarçadas de fluxos de sucesso.

---

## 2. Diretriz Anti-God Files e Decomposição de Responsabilidades (SRP)

É expressamente proibida a criação ou manutenção de *God Files*, *God Classes* e *God Services*.

### 2.1 Separação Estrita (Single Responsibility Principle)
- Módulos com centenas de linhas desempenhando múltiplas funções (roteamento, acesso a dados, regras de negócio e formatação de strings) devem ser imediatamente refatorados e decompostos.
- Categorize estritamente por domínio:
  - `router.py`: Transporte puro e delegação.
  - `schemas.py`: DTOs de entrada e saída (Pydantic V2).
  - `service.py`: Fachada leve de orquestração (coordena, não implementa fluxos pesados internamente).
  - `repository.py` / `subroutines/`: Operações de acesso a dados ou subprocessos concorrentes.
  - `constants.py`: Valores fixos imutáveis.

### 2.2 Controle de Complexidade (McCabe $\le 10$)
- Funções, métodos ou corrotinas com alta complexidade ciclomática (muitos `if/elif/for/try`) devem ser decompostas em subfunções puras, atômicas e descritivas.

### 2.3 Pureza dos Módulos `__init__.py`
- Reservado exclusivamente para documentação do pacote, importações relativas e definição de `__all__`.
- **Proibido:** Instanciar fábricas, singletons ou injetar lógica de negócios em arquivos `__init__.py`.

---

## 3. Idiomas e Práticas de Python 3.12+

### 3.1 Early Returns (Guard Clauses) vs. Aninhamento Profundo
- Elimine "pirâmides do destino". Trate falhas, ausências de dados e validações prévias no topo da função, retornando ou levantando exceções imediatamente.

```python
# ❌ RUIM: Aninhamento excessivo
def process_data(data: dict | None) -> Result | None:
    if data is not None:
        if "id" in data:
            if validate_id(data["id"]):
                return do_process(data)
    return None

# ✅ BOM: Early returns diretos e legíveis
def process_data(data: dict | None) -> Result | None:
    if not data or "id" not in data:
        return None
    if not validate_id(data["id"]):
        return None
    return do_process(data)
```

### 3.2 O Operador Walrus (`:=`)
- Evite chamadas duplicadas de métodos custosos ou vazamento de variáveis para fora do escopo necessário usando o operador de atribuição de expressão (walrus).

```python
# ✅ BOM: Atribuição limpa e uso eficiente
if (match := re.search(r"pattern", content)) is not None:
    process(match.group(1))

while (chunk := await stream.read(1024)):
    process_chunk(chunk)
```

### 3.3 Supressão Elegante (`contextlib.suppress`)
- Elimine blocos ruidosos e inexpressivos de `try/except: pass`.
- NUNCA suprima `Exception` de forma genérica. Seja declarativo sobre qual falha específica é aceitável.

```python
# ❌ RUIM
try:
    os.remove(temp_path)
except FileNotFoundError:
    pass

# ✅ BOM
from contextlib import suppress

with suppress(FileNotFoundError):
    os.remove(temp_path)
```

### 3.4 Pattern Matching (`match/case`) Estruturado
- Utilize `match/case` do Python 3.10+ para destrinchar eventos, respostas HTTP padronizadas ou classes abstratas (AST), ao invés de longas cadeias de `if isinstance(...)`.

```python
match response:
    case {"status": 200, "data": payload}:
        return process(payload)
    case {"status": 404, "error": msg}:
        raise NotFoundError(msg)
    case _:
        raise UnknownResponseError("Formato não reconhecido")
```

### 3.5 Context Managers Modernos
- Para controle determinístico de desalocação de recursos, cursores de banco, timers de execução ou locks (travas de concorrência), use `@contextmanager` ou `@asynccontextmanager`. Garantem cleanup e desacoplamento via `try/finally` explícito sob o capô.

---

## 4. Tipagem Estrita, Contratos e Imutabilidade

- **Proibição de `dict[str, Any]`:** Estruturas fracamente tipadas vazam detalhes de implementação. Use `TypedDict` para dicionários nativos que garantam chaves ou Pydantic `BaseModel` com descrições (`Field`) para fronteiras e validação estrita.
- **Dataclasses Imutáveis:** Para objetos de registro, configuração estática ou DTOs internos sem complexidade de validação em tempo de execução: `@dataclass(frozen=True, slots=True)`.
- **Novas Features (PEP 695):** Utilize `type NewAlias = ...` para definição moderna de type aliases genéricos; use `typing.Self` em builders e `typing.override` em implementações concretas de classes abstratas.

---

## 5. Tratamento de Exceções e Resiliência

- **Hierarquia Clara (PEP 8 / N818):** Sempre crie exceções base do domínio que herdem de `Exception` e terminem com o sufixo `Error` (ex: `BaseDomainError` -> `IntegrationTimeoutError`).
- NUNCA engula `Exception` genericamente (`except Exception:` sem raise). Erros inesperados de memória, teclado ou interrupção de sistema operacional não devem ser mascarados.
- Em caso de exceções esperadas, intercepte, enriqueça com contexto no log estruturado e decida se a ação permite nova tentativa ou se deve gerar um erro amigável na API.

---

## 6. Agnosticismo de Utilitários e Qualidade de Código

- **Agnosticismo em Infraestrutura (SRP):** Funções utilitárias e serializadores (JSON, CSV, conversores) não devem possuir conhecimento de regras de domínio ou condicionais de negócio. Eles processam sequências e formatos anonimamente.
- **Eliminação de Nomes Crípticos:** Em pipelines de dados, iterações e algoritmos, é estritamente proibido usar identificadores de uma única letra (`k`, `v`, `r`, `i`, `e`). Adote nomenclatura autodescritiva (`key_name`, `record_value`, `row_data`, `index`, `error_cause`).
