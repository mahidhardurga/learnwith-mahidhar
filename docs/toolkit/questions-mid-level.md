---
title: Java, Spring Boot and Microservices Interview Questions for 3-5 Years Experience (36-70)
sidebar_label: "Mid-level questions (36-70)"
description: Thirty-five intermediate interview questions on collections internals, concurrency, JVM, Spring transactions and AOP, JPA performance, Spring Security, microservices patterns, Kafka, caching and DevOps with concise model answers.
keywords: [java interview questions 3 years experience, spring boot interview questions 5 years, microservices interview questions, hashmap internals, transactional propagation, n+1 problem, kafka consumer group, circuit breaker interview]
sidebar_position: 3
---

# Interview Questions: 3-5 Years (36-70)

At this level interviewers want **depth plus experience**: how it works internally, what goes wrong in production, and how you decided. Structure answers as **concept → internals → pitfall or trade-off → example from your work**.

## Java internals and concurrency

**36. How does `HashMap` work internally?**
Array of buckets indexed by `(n-1) & (h ^ h>>>16)`; collisions chain into linked lists that treeify at 8 nodes (table ≥ 64); resize at 0.75 load doubles the table. Equal keys need consistent `equals`/`hashCode`. ([HashMap internals](../java/core-java/hashmap-internals.md))

**37. `ConcurrentHashMap` vs `synchronizedMap`?**
CHM uses CAS plus per-bucket locking and lock-free reads, so it scales; `synchronizedMap` has one lock for everything. CHM offers atomic `compute`/`merge`; compound check-then-act sequences still need those methods. ([ConcurrentHashMap](../java/core-java/concurrenthashmap.md))

**38. What is the Java Memory Model and happens-before?**
It defines when one thread's writes are visible to another. Visibility needs a happens-before edge: lock release/acquire, volatile write/read, thread start/join, concurrent collections. Without one you have a data race. ([Memory model](../java/concurrency-jvm/memory-model.md))

**39. `volatile` vs `synchronized` vs atomics?**
`volatile`: visibility and ordering for a single variable, no atomic compound actions. `synchronized`/locks: mutual exclusion plus visibility. Atomics (`AtomicInteger`, `LongAdder`): lock-free atomic single-variable updates via CAS. ([Locks](../java/concurrency-jvm/synchronization-and-locks.md))

**40. What is a deadlock and how do you prevent it?**
Threads each hold a lock the other needs. Break one of the four conditions: impose a global lock order, use `tryLock` with timeouts, hold fewer locks, or redesign with message passing. Diagnose with thread dumps. ([Threads](../java/concurrency-jvm/threads-basics.md))

**41. How does `ThreadPoolExecutor` decide between core threads, queue and max threads?**
Core threads first, then enqueue, then extra threads up to max only when the queue is full, then reject. An unbounded queue means max is never used. Use bounded queues and name threads. ([Executors](../java/concurrency-jvm/executors.md))

**42. `thenApply` vs `thenCompose` in `CompletableFuture`; what's the default executor risk?**
`thenApply` maps a value; `thenCompose` flattens a function returning a future. `supplyAsync` without an executor uses the shared common pool, which blocking calls can starve. ([CompletableFuture](../java/concurrency-jvm/completablefuture.md))

**43. How does garbage collection work and which collector would you choose?**
Generational collection exploits short-lived objects; G1 is the balanced default, ZGC gives sub-millisecond pauses, Parallel maximises throughput. Choose by measuring latency and throughput. ([GC](../java/concurrency-jvm/garbage-collection.md))

**44. Common causes of memory leaks in Java and how to find them?**
Unbounded caches/static collections, unregistered listeners, `ThreadLocal`s in pools, classloader leaks. Heap dump plus Eclipse MAT dominator tree and GC-root paths. ([JVM diagnostics](../java/concurrency-jvm/jvm-tuning-diagnostics.md))

**45. Streams: `map` vs `flatMap`, and when are parallel streams a bad idea?**
`flatMap` flattens nested streams. Parallel streams use the shared common pool: bad for small data, blocking I/O, or shared mutable state. ([Streams](../java/core-java/streams-and-lambdas.md))

**46. Explain generics type erasure and PECS.**
Type arguments are removed after compile-time checking, so no `new T()` or `instanceof List<String>`. PECS: use `? extends T` for producers you read from and `? super T` for consumers you write to. ([Generics](../java/core-java/generics.md))

**47. How do you design an immutable class?**
Final class and fields, no setters, defensive copies in and out, no `this` escape; records are shallowly immutable. ([Immutability](../java/core-java/immutability.md))

## Spring and persistence

**48. Describe the Spring bean lifecycle.**
Instantiate → inject → Aware callbacks → BPP before-init (`@PostConstruct`) → `afterPropertiesSet` → init method → BPP after-init (proxies) → use → `@PreDestroy` → `destroy`. ([Lifecycle](../spring/core/bean-lifecycle-and-scopes.md))

**49. How does Spring AOP work and why does self-invocation break `@Transactional`?**
Beans are wrapped in JDK/CGLIB proxies whose interceptors run advice; an internal `this.method()` call bypasses the proxy, so no advice runs. ([AOP](../spring/core/aop-and-proxies.md))

**50. Explain `@Transactional` propagation, isolation and rollback rules.**
`REQUIRED` joins or creates, `REQUIRES_NEW` suspends and starts a new one, `NESTED` uses savepoints. Default rollback is for runtime exceptions only; use `rollbackFor` for checked ones. Isolation controls anomalies like dirty/non-repeatable/phantom reads. ([Transactions](../spring/data/transactions.md))

**51. What is the N+1 problem and how do you fix it?**
One query for parents plus one lazy query per parent. Fix with `join fetch`, entity graphs, batch fetching or projections; detect by counting statements. ([N+1](../spring/data/n-plus-one-lazy-loading.md))

**52. What causes `LazyInitializationException`?**
Accessing a lazy association after the session closed. Fetch within the transaction or map to DTOs; do not switch to EAGER as a fix.

**53. How does Spring Boot auto-configuration work?**
`@EnableAutoConfiguration` loads candidates from `AutoConfiguration.imports`; conditional annotations decide which apply; your beans win via `@ConditionalOnMissingBean`. Debug with `--debug`. ([Auto-configuration](../spring/boot/auto-configuration.md))

**54. How do you handle exceptions and validation in a REST API?**
`@RestControllerAdvice` with typed `@ExceptionHandler`s returning `ProblemDetail`, and Bean Validation (`@Valid`, constraints) on DTOs mapped to 400 responses. ([Exception handling](../spring/boot/exception-handling.md), [Validation](../spring/boot/validation.md))

**55. How do you test a Spring Boot application?**
Plain unit tests with Mockito; slice tests (`@WebMvcTest`, `@DataJpaTest`); integration tests with Testcontainers; few full `@SpringBootTest` end-to-end. ([Testing](../spring/boot/testing-basics.md))

**56. How does Spring Security work, and how do you secure an API with JWT?**
A filter chain builds an `Authentication` stored in the `SecurityContext`; authorisation rules and method security decide access. As a resource server it validates JWT signature, issuer, audience and expiry and maps scopes to authorities. ([Architecture](../spring/security/security-architecture.md), [JWT](../spring/security/jwt.md))

**57. SQL indexing: how do you speed up a slow query?**
Read `EXPLAIN ANALYZE`, check for scans/sorts, add a composite index matching equality-then-range-then-sort columns, avoid functions on indexed columns, reduce selected columns, and verify with realistic data. ([SQL tuning](../spring/data/sql-tuning-indexing.md))

**58. Caching strategies and pitfalls?**
Cache-aside with TTL, eviction on write, stampede protection, caching immutable values; beware staleness and unbounded size. ([Caching](../spring/data/caching.md))

## Microservices and messaging

**59. Synchronous vs asynchronous communication between services?**
Sync (REST/gRPC) when the caller needs the answer now but couples availability; async (events/queues) decouples time and absorbs spikes at the cost of eventual consistency. ([Communication](../microservices/communication/service-communication.md))

**60. What do an API gateway, service discovery and a config server each do?**
Gateway: single entry, routing, auth, rate limits. Discovery: finds live instances by name. Config server: centralised, versioned configuration. On Kubernetes, Services and ConfigMaps often replace the latter two. ([Gateway](../microservices/infrastructure/api-gateway.md), [Discovery](../microservices/infrastructure/service-discovery.md), [Config](../microservices/infrastructure/config-server.md))

**61. Explain the circuit breaker pattern.**
After failures or slowness cross a threshold the breaker opens and fails fast, then half-opens to probe recovery; prevents cascading failure. Combine with timeouts, bounded retries and bulkheads. ([Resilience4j](../microservices/resilience/resilience4j.md))

**62. What is the saga pattern?**
A sequence of local transactions with compensating actions replacing a distributed transaction; orchestrated or choreographed. ([Saga](../microservices/data-consistency/saga.md))

**63. How do you make operations idempotent and publish events reliably?**
Idempotency keys and unique constraints for duplicates; transactional outbox for atomic "state change + event". ([Outbox and idempotency](../microservices/data-consistency/outbox-idempotency.md))

**64. Kafka partitions, consumer groups and ordering?**
Ordering holds within a partition; a group assigns each partition to one consumer, so parallelism is bounded by partition count; use a key for per-entity order. ([Kafka fundamentals](../messaging/kafka-fundamentals.md), [Consumers](../messaging/kafka-consumers-offsets.md))

**65. Kafka delivery semantics and how do you handle duplicates?**
Commit after processing for at-least-once and make handlers idempotent; exactly-once applies within Kafka transactions, not to external side effects.

**66. How do you handle failures in a Kafka consumer?**
Bounded retries with backoff, non-retryable classification, dead-letter topic, `ErrorHandlingDeserializer`, monitoring lag. ([Ordering and design](../messaging/kafka-ordering-design.md))

**67. How do you monitor microservices?**
Metrics (RED), structured logs with trace ids, distributed tracing with OpenTelemetry, SLO-based alerts. ([Observability](../microservices/observability/observability.md))

## DevOps

**68. Liveness vs readiness probes in Kubernetes?**
Liveness restarts a broken container; readiness gates traffic. Keep dependencies out of liveness. ([Kubernetes](../devops/kubernetes-basics.md))

**69. How do you containerise a Spring Boot app well?**
Multi-stage build, layered jar, non-root user, `MaxRAMPercentage`, exec-form entrypoint for graceful shutdown. ([Docker](../devops/docker-for-java.md))

**70. What is CI/CD and what does your pipeline do?**
Automated build, tests, scanning, image build and deployment; build once, promote the same artifact, with rollback. ([CI/CD](../devops/ci-cd.md))

## Tips for this level

- Always include **a real production story** (an outage, a slow query, a rollback).
- Mention **trade-offs** unprompted; avoid absolutes.
- Be ready for "what would you change?" about your own project's design.
- Next: [senior questions](questions-senior.md) and [system design](../system-design/approach-and-estimation.md).
