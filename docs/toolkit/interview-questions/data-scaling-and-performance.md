---
title: "Data, scaling and performance interview questions"
sidebar_label: "Data, scaling and performance"
description: "Scaling databases, caching and finding performance problems."
---

# Data, scaling and performance

Scaling databases, caching and finding performance problems. Answer each question in two parts: a clear definition first, then a tiny example or why it matters.

**85. How would you scale a service from 100 to 10,000 requests per second?**
Measure first. Stateless horizontal scaling, caching, query/index fixes and N+1 removal, connection-pool sizing, async work via queues, read replicas, then partitioning/sharding; load test each step and watch downstream limits. ([Scaling](../../databases/replication-sharding.md), [Caching](../../spring/data/caching.md))

**86. Optimistic vs pessimistic locking, and isolation anomalies such as write skew?**
Optimistic for rare conflicts with retry; pessimistic (`FOR UPDATE`, `SKIP LOCKED`) for hot rows; snapshot isolation allows write skew, so protect cross-row invariants with serializable plus retry, locks or constraints. ([Locking](../../spring/data/locking.md), [Isolation](../../databases/acid-isolation-mvcc.md))

**87. How do you choose a shard key and handle hot keys?**
High cardinality, even load and alignment with the main access pattern so transactions stay within a shard; mitigate hot keys with salting, caching, splitting hot entities, and logical shards that can be moved. ([Sharding](../../databases/replication-sharding.md))

**88. Cache problems you have seen: stampedes, stale data, dual writes?**
Single-flight and jittered TTLs for stampedes; TTL plus evict-after-commit for staleness; avoid dual writes by deriving caches from events or the outbox. ([Caching](../../spring/data/caching.md))

**89. Design a rate limiter for an API gateway.**
Token bucket per key in Redis with an atomic Lua script and Redis time, 429 with `Retry-After`, layered edge and service limits, fail-open versus fail-closed decided per endpoint. ([Rate limiter](../../system-design/rate-limiter.md))

**90. How do you guarantee ordering and exactly-once effects with Kafka?**
Key by aggregate id for per-partition order, idempotent producer, at-least-once consumption with idempotent handlers or transactional consume-process-produce within Kafka; external side effects need dedupe keys or outbox. ([Consumers](../../messaging/kafka-consumers-offsets.md))
