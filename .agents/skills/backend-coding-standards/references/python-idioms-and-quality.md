# Reference: Python 3.12+ Idioms, Immutability, and Code Quality

This guide compiles modern syntax patterns, immutability principles, and best practices for clean and declarative backend Python code.

---

## 1. Prohibition of Reassigning Variables with the Same Name (Single Assignment)

Never reuse the same variable name for distinct purposes or subsequent data transformation steps. Reassigned variables obscure state mutations and drastically increase bug risks.

```python
# ❌ BAD: Continual reassignment of the same variable
queryset = Work.filter(id=1)
queryset = queryset.delete(price__is_null=True)
queryset = format_queryset(queryset)

# ✅ GOOD: Declarative, unassigned, and immutable variable names
active_works = Work.filter(id=work_id)
works_without_price = active_works.filter(price__is_null=True)
formatted_works = format_works(works_without_price)
```

---

## 2. Early Returns (Guard Clauses) vs. Deep Nesting

Eliminate pyramids of deeply nested `if` blocks. Handle missing data, authorization failures, and precondition checks upfront at the start of the function:

```python
# ❌ BAD: Deep nesting
def process_user_data(data: dict | None) -> Result | None:
    if data is not None:
        if "id" in data:
            if validate_id(data["id"]):
                return execute(data)
    return None

# ✅ GOOD: Direct and readable early returns
def process_user_data(data: dict | None) -> Result | None:
    if not data or "id" not in data:
        return None
    if not validate_id(data["id"]):
        return None
    return execute(data)
```

---

## 3. The Walrus Operator (`:=`)

Avoid redundant calls to expensive functions or leaking variables outside loops and conditional blocks:

```python
# ✅ GOOD: Concise assignment within the condition itself
if (match := re.search(r"(\d+)-([A-Z]+)", content)) is not None:
    process_code(match.group(1), match.group(2))

while (chunk := await stream.read(1024)):
    process_chunk(chunk)
```

---

## 4. Structural Pattern Matching (`match/case`)

Use Python's native `match/case` to unpack network payloads, events, or polymorphic structures:

```python
match payload:
    case {"status": "success", "data": result}:
        return handle_success(result)
    case {"status": "error", "message": err}:
        raise DomainProcessingError(err)
    case _:
        raise UnknownPayloadFormatError("Unrecognized format")
```

---

## 5. Strict Typing and Modern Features (PEP 695)

1. **Modern Type Aliases (Python 3.12+):**
   ```python
   type JsonScalar = str | int | float | bool | None
   type PayloadMap = dict[str, JsonScalar]
   ```
2. **Immutable Dataclasses:** For configurations or internal DTOs without validation logic:
   ```python
   from dataclasses import dataclass

   @dataclass(frozen=True, slots=True)
   class CacheKey:
       namespace: str
       entity_id: str
   ```
3. **`typing.Self` and `typing.override`:** Use `Self` in fluent builder methods and `@override` when implementing abstract methods or protocols.
4. **Descriptive Names:** Never use single-letter identifiers (`k`, `v`, `i`, `e`). Prefer `key_name`, `item_value`, `loop_index`, `error_cause`.
