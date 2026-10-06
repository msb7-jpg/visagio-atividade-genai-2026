# Referência: Idiomas de Python 3.12+, Imutabilidade e Qualidade de Código

Este guia reúne padrões de sintaxe moderna, princípios de imutabilidade e boas práticas para código Python limpo e declarativo no backend.

---

## 1. Proibição de Reatribuição de Variáveis com Mesmo Nome (Single Assignment)

Nunca reutilize a mesma variável para propósitos distintos ou etapas subsequentes de transformação de dados. Variáveis reatribuídas mascaram mutações de estado e aumentam drasticamente a chance de bugs.

```python
# ❌ RUIM: Reatribuição contínua da mesma variável
queryset = Work.filter(id=1)
queryset = queryset.delete(price__is_null=True)
queryset = format_queryset(queryset)

# ✅ BOM: Nomes declarativos, sem reatribuição e imutáveis
active_works = Work.filter(id=work_id)
works_without_price = active_works.filter(price__is_null=True)
formatted_works = format_works(works_without_price)
```

---

## 2. Early Returns (Guard Clauses) vs. Aninhamento Profundo

Elimine pirâmides de blocos `if` aninhados. Trate ausências de dados, falhas de autorização e validações prévias no topo da função:

```python
# ❌ RUIM: Aninhamento profundo
def process_user_data(data: dict | None) -> Result | None:
    if data is not None:
        if "id" in data:
            if validate_id(data["id"]):
                return execute(data)
    return None

# ✅ BOM: Early returns diretos e legíveis
def process_user_data(data: dict | None) -> Result | None:
    if not data or "id" not in data:
        return None
    if not validate_id(data["id"]):
        return None
    return execute(data)
```

---

## 3. O Operador Walrus (`:=`)

Evite chamadas redundantes a funções custosas ou vazamento de variáveis para fora de loops e blocos condicionais:

```python
# ✅ BOM: Atribuição concisa no próprio condicional
if (match := re.search(r"(\d+)-([A-Z]+)", content)) is not None:
    process_code(match.group(1), match.group(2))

while (chunk := await stream.read(1024)):
    process_chunk(chunk)
```

---

## 4. Pattern Matching Estruturado (`match/case`)

Utilize `match/case` nativo do Python para desempacotar payloads de rede, eventos ou estruturas polimórficas:

```python
match payload:
    case {"status": "success", "data": result}:
        return handle_success(result)
    case {"status": "error", "message": err}:
        raise DomainProcessingError(err)
    case _:
        raise UnknownPayloadFormatError("Formato não reconhecido")
```

---

## 5. Tipagem Estrita e Recursos Modernos (PEP 695)

1. **Type Aliases Modernos (Python 3.12+):**
   ```python
   type JsonScalar = str | int | float | bool | None
   type PayloadMap = dict[str, JsonScalar]
   ```
2. **Dataclasses Imutáveis:** Para configurações ou DTOs internos sem lógica de validação:
   ```python
   from dataclasses import dataclass

   @dataclass(frozen=True, slots=True)
   class CacheKey:
       namespace: str
       entity_id: str
   ```
3. **`typing.Self` e `typing.override`:** Use `Self` em métodos de builders fluentes e `@override` ao implementar métodos de classes abstratas ou protocolos.
4. **Nomes Descritivos:** Jamais use identificadores de uma única letra (`k`, `v`, `i`, `e`). Prefira `key_name`, `item_value`, `loop_index`, `error_cause`.
