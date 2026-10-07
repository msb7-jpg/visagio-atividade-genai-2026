# Reference: Domain Scaling, Services, and Anti-God Files Guidelines

This guide details practical strategies to avoid bloated files (*God Files*) and foster the healthy evolution of vertical slices into sibling domains within a modular monolith.

---

## 1. Golden Rules for Size and Complexity

- **Rule of 30 (Methods and Functions):** If a method exceeds **30 lines**, it is taking on more than one responsibility. Decompose it into pure, descriptive sub-functions.
- **Rule of 300 (Service Files):** If a `service.py` reaches **300 lines**, there is a hidden subdomain or specialist collaborator waiting to be extracted.
- **Cyclomatic Complexity (McCabe $\le 10$):** Functions with excessive branching (`if/elif/for/try`) must be refactored immediately.
- **Purity of `__init__.py`:** Strictly reserved for exports (`__all__`) and documentation. Factories or business logic are prohibited in these files.

---

## 2. Progression and Growth of a Domain

A typical domain evolves across 3 stages:

```text
# Stage 1: Single, Lean Domain
orders/
├── router.py
├── service.py
├── repository.py
└── schemas.py

# Stage 2: Emerging Sub-responsibilities
orders/
├── router.py
├── service.py          # High-level orchestration only (~100 lines)
├── repository.py
├── schemas.py
├── billing.py          # Extracted: pricing, coupons, taxes
└── fulfillment.py      # Extracted: tracking, package dispatch

# Stage 3: Promotion to Sibling Domain (Bounded Context)
orders/
├── router.py
├── service.py
├── repository.py
└── schemas.py
billing/                # Promoted to sibling top-level feature package
├── router.py
├── service.py
├── repository.py
└── schemas.py
```

### 2.1 Criteria for Promotion to Sibling Domain
Promote a sub-responsibility to a sibling package if it meets at least one of these criteria:
1. It has its **own conceptual models and entities** (not just utility methods on the parent entity).
2. It has an **independent lifecycle and changes** (separate PRs and delivery cadences).
3. Other domains **need to consume it directly** (e.g., `payments` needs `billing`, but not `orders`).
4. Internal logic has accumulated **more than 300–400 lines**.

---

## 3. Strategies for Decomposing Large Services (> 300 lines)

### Strategy 1: Extracting Specialist Collaborators (Most Common Pattern)
Keep `OrderService` as a lightweight orchestrator and delegate sub-processes to specialized classes injected via the constructor:

```python
# features/orders/service.py — Pure orchestration (~80-100 lines)
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

### Strategy 2: Subdomain Extraction
When the functionality has its own lifecycle (e.g., `refunds`), create a dedicated folder with its own slice (`router`, `service`, `repository`).

### Strategy 3: Strategy / Registry Pattern
When dealing with large conditional blocks (`if/elif/else`) for variants of the same operation, use `typing.Protocol`:

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
