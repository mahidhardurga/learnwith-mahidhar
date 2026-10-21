---
title: "Microservices and messaging interview questions"
sidebar_label: "Microservices and messaging"
description: "Service communication, resilience, Kafka and RabbitMQ."
---

# Microservices and messaging

Service communication, resilience, Kafka and RabbitMQ. Answer each question in two parts: a clear definition first, then a tiny example or why it matters.

**59. Synchronous vs asynchronous communication between services?**
Sync (REST/gRPC) when the caller needs the answer now but couples availability; async (events/queues) decouples time and absorbs spikes at the cost of eventual consistency. ([Communication](../../microservices/communication/service-communication.md))

**60. What do an API gateway, service discovery and a config server each do?**
Gateway: single entry, routing, auth, rate limits. Discovery: finds live instances by name. Config server: centralised, versioned configuration. On Kubernetes, Services and ConfigMaps often replace the latter two. ([Gateway](../../microservices/infrastructure/api-gateway.md), [Discovery](../../microservices/infrastructure/service-discovery.md), [Config](../../microservices/infrastructure/config-server.md))

**61. Explain the circuit breaker pattern.**
After failures or slowness cross a threshold the breaker opens and fails fast, then half-opens to probe recovery; prevents cascading failure. Combine with timeouts, bounded retries and bulkheads. ([Resilience4j](../../microservices/resilience/resilience4j.md))

**62. What is the saga pattern?**
A sequence of local transactions with compensating actions replacing a distributed transaction; orchestrated or choreographed. ([Saga](../../microservices/data-consistency/saga.md))

**63. How do you make operations idempotent and publish events reliably?**
Idempotency keys and unique constraints for duplicates; transactional outbox for atomic "state change + event". ([Outbox and idempotency](../../microservices/data-consistency/outbox-idempotency.md))

**64. Kafka partitions, consumer groups and ordering?**
Ordering holds within a partition; a group assigns each partition to one consumer, so parallelism is bounded by partition count; use a key for per-entity order. ([Kafka fundamentals](../../messaging/kafka-fundamentals.md), [Consumers](../../messaging/kafka-consumers-offsets.md))

**65. Kafka delivery semantics and how do you handle duplicates?**
Commit after processing for at-least-once and make handlers idempotent; exactly-once applies within Kafka transactions, not to external side effects.

**66. How do you handle failures in a Kafka consumer?**
Bounded retries with backoff, non-retryable classification, dead-letter topic, `ErrorHandlingDeserializer`, monitoring lag. ([Ordering and design](../../messaging/kafka-ordering-design.md))

**67. How do you monitor microservices?**
Metrics (RED), structured logs with trace ids, distributed tracing with OpenTelemetry, SLO-based alerts. ([Observability](../../microservices/observability/observability.md))
