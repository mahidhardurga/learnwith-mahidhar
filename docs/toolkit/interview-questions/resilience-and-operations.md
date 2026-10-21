---
title: "Resilience and operations interview questions"
sidebar_label: "Resilience and operations"
description: "Failure handling, observability and running services in production."
---

# Resilience and operations

Failure handling, observability and running services in production. Answer each question in two parts: a clear definition first, then a tiny example or why it matters.

**77. A downstream service becomes slow. Walk through how your system should behave.**
Timeouts shorter than the caller's budget, bulkheads limiting concurrency, circuit breaker opening on slow calls, retries only for idempotent calls with jittered backoff and a retry budget, fallbacks where acceptable, load shedding, and alerts. Watch for retry storms and thread-pool exhaustion. ([Resilience4j](../../microservices/resilience/resilience4j.md))

**78. How do you design for zero-downtime deployments including database changes?**
Rolling/canary with accurate readiness and graceful shutdown; backward-compatible schema via expand/contract across releases; feature flags to decouple release from deploy; automated rollback on SLO regression. ([Deployment strategies](../../devops/deployment-strategies.md), [Migrations](../../databases/schema-migrations.md))

**79. Your service has intermittent latency spikes in production. How do you investigate?**
Define the symptom with percentiles, correlate with GC pauses, thread dumps (blocked/pool saturation), downstream traces, connection-pool waits and deployments; use flame graphs/JFR; form hypotheses, test one change at a time. ([JVM diagnostics](../../java/concurrency-jvm/jvm-tuning-diagnostics.md), [Observability](../../microservices/observability/observability.md))

**80. CPU is at 100% / the pod keeps getting OOM-killed. What do you do?**
CPU: hot threads and flame graph; check GC CPU share. OOMKilled: compare heap vs off-heap (direct buffers, metaspace, thread stacks), `MaxRAMPercentage` headroom, NMT, heap dump if Java OOM. Fix the cause, not just the limit. ([Docker](../../devops/docker-for-java.md))

**81. How do you choose and tune a garbage collector?**
Start with G1 defaults, define the latency/throughput target, enable GC logs, measure allocation/promotion rates, try ZGC for tight tails or Parallel for batch, tune one parameter at a time under realistic load. ([GC](../../java/concurrency-jvm/garbage-collection.md))

**82. Virtual threads vs reactive vs thread pools?**
Virtual threads give scalable blocking-style code for I/O-bound services (watch pinning and limit concurrency explicitly); reactive suits streaming and built-in back-pressure; classic pools for CPU-bound work. ([Virtual threads](../../java/concurrency-jvm/virtual-threads.md))

**83. How do you structure observability for a fleet of services?**
Standard metrics (RED/USE), structured logs with trace ids, OpenTelemetry tracing with sampling, SLOs with burn-rate alerts, dashboards per service and per user journey, runbooks. ([Observability](../../microservices/observability/observability.md))

**84. How do you handle an incident and what makes a good post-mortem?**
Stabilise first (mitigate, roll back, communicate), then diagnose; blameless review with timeline, root and contributing causes, what detection/response gaps existed, and tracked action items with owners.
