---
title: "Architecture and consistency interview questions"
sidebar_label: "Architecture and consistency"
description: "Distributed consistency, sagas, outbox, CQRS and event-driven design."
---

# Architecture and consistency

Distributed consistency, sagas, outbox, CQRS and event-driven design. Answer each question in two parts: a clear definition first, then a tiny example or why it matters.

**71. How do you keep data consistent across microservices without distributed transactions?**
Accept eventual consistency in places and design for it: sagas of local transactions with idempotent compensations, a transactional outbox for atomic state-plus-event, idempotent consumers, explicit intermediate states, reconciliation jobs. Reserve strong consistency for single-service invariants inside one database. ([Saga](../../microservices/data-consistency/saga.md), [Outbox](../../microservices/data-consistency/outbox-idempotency.md))

**72. Design an order or payment flow so that money is never charged twice and stock is never oversold.**
Idempotency key at the API and towards the provider, a validated order state machine, atomic conditional stock updates with expiring reservations, treat payment timeouts as unknown and confirm via query/webhook, reconcile daily. ([Order processing](../../system-design/order-processing.md))

**73. When would you choose microservices, and when not?**
When team scaling, independent release cadence or divergent scaling/isolation create real friction and a platform exists (CI/CD, observability, discovery). Otherwise a modular monolith; beware the distributed monolith (shared DB, lock-step deploys, synchronous chains). ([Overview](../../microservices/overview.md), [Trade-offs](../../system-design/tradeoffs.md))

**74. How would you migrate a monolith to microservices?**
Strangler pattern: gateway in front, extract capabilities one at a time starting with a low-coupling high-change seam, own the data per service, use anti-corruption layers, measure after each step, and keep the monolith releasable. Avoid a big-bang rewrite.

**75. When do you use CQRS and event sourcing, and when do you avoid them?**
CQRS for divergent read/write shapes or scale and cross-service queries; event sourcing for audit-critical, state-transition-heavy domains. Avoid for plain CRUD: they add eventual consistency, schema-evolution and operational cost. ([CQRS/ES](../../microservices/data-consistency/cqrs-event-sourcing.md))

**76. How do you evolve APIs and events without breaking consumers?**
Backward-compatible additive changes, tolerant readers, versioning only when needed, schema registry compatibility rules, consumer-driven contract tests, deprecation windows, and expand/contract for data. ([Kafka design](../../messaging/kafka-ordering-design.md), [Migrations](../../databases/schema-migrations.md))
