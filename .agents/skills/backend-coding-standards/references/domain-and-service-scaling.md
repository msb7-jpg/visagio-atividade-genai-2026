# Referência: Escalonamento de Domínios, Serviços e Diretriz Anti-God Files

Este guia detalha estratégias práticas para evitar arquivos inchados (*God Files*) e conduzir a evolução saudável de fatias verticais para domínios irmãos em um monólito modular.

---

## 1. As Regras de Ouro de Tamanho e Complexidade

- **Regra dos 30 (Métodos e Funções):** Se um método ultrapassar **30 linhas**, ele está acumulando mais de uma responsabilidade. Divida-o em subfunções puras e descritivas.
- **Regra dos 300 (Arquivos de Serviço):** Se um `service.py` atingir **300 linhas**, há um subdomínio ou colaborador especialista oculto pronto para ser extraído.
- **Complexidade Ciclomática (McCabe $\le 10$):** Funções com ramificações excessivas de `if/elif/for/try` devem ser refatoradas imediatamente.
- **Pureza de `__init__.py`:** Apenas para exportações (`__all__`) e documentação. Proibido fábricas ou lógica de negócios nesses arquivos.

---

## 2. A Progressão e Crescimento de um Domínio

Um domínio típico evolui em 3 estágios:

```text
# Estágio 1: Domínio Único e Enxuto
orders/
├── router.py
├── service.py
├── repository.py
└── schemas.py

# Estágio 2: Sub-responsabilidades Emergentes
orders/
├── router.py
├── service.py          # apenas orquestração de alto nível (~100 linhas)
├── repository.py
├── schemas.py
├── billing.py          # extraído: precificação, cupons, impostos
└── fulfillment.py      # extraído: rastreio, expedição de pacotes

# Estágio 3: Promoção a Domínio Irmão (Bounded Context)
orders/
├── router.py
├── service.py
├── repository.py
└── schemas.py
billing/                # promovido a pacote de mesmo nível
├── router.py
├── service.py
├── repository.py
└── schemas.py
```

### 2.1 Critérios para Promoção a Domínio Irmão
Promova uma sub-responsabilidade a um pacote de mesmo nível se ela atender a pelo menos um destes critérios:
1. Possui **entidades e modelos conceituais próprios** (não apenas métodos utilitários da entidade pai).
2. Tem **ciclo de vida e alterações independentes** (PRs e cadências separadas).
3. Outros domínios **precisam consumi-la diretamente** (ex: `payments` precisa de `billing`, mas não de `orders`).
4. A lógica interna acumulou **mais de 300–400 linhas**.

---

## 3. Estratégias para Decomposição de Serviços Extensos (> 300 linhas)

### Estratégia 1: Extração de Colaboradores Especialistas (Padrão mais comum)
Mantenha o `OrderService` como um orquestrador leve e delegue subprocessos a classes especializadas injetadas no construtor:

```python
# features/orders/service.py — Orquestração pura (~80-100 linhas)
class OrderService:
    def __init__(
        self,
        pricing: PricingService,
        inventory: InventoryClient,
        notifier: NotificationService,
        repository: OrderRepository,
    ) -> None:
        self.pricing = pricing
        self.inventory = inventory
        self.notifier = notifier
        self.repository = repository

    async def create_order(self, data: OrderCreateRequest) -> Order:
        total = await self.pricing.calculate(data)
        await self.inventory.reserve(data.items)
        order = await self.repository.save(data, total)
        await self.notifier.send_confirmation(order)
        return order
```

### Estratégia 2: Extração de Subdomínio
Quando a funcionalidade possui ciclo próprio (ex: `refunds`), crie uma pasta separada com seu próprio ciclo (`router`, `service`, `repository`).

### Estratégia 3: Padrão Strategy / Registry
Quando existirem blocos condicionais imensos (`if/elif/else`) para variações de uma mesma operação, utilize `typing.Protocol`:

```python
from typing import Protocol

class PaymentStrategy(Protocol):
    async def charge(self, amount: float, method: str) -> dict: ...

class PaymentStrategyRegistry:
    def __init__(self) -> None:
        self._strategies: dict[str, PaymentStrategy] = {}

    def register(self, method: str, strategy: PaymentStrategy) -> None:
        self._strategies[method] = strategy

    def get(self, method: str) -> PaymentStrategy:
        return self._strategies[method]
```
