---
title: "Java and Microservices Interview Questions: Advanced (Questions 71-100)"
sidebar_label: "Advanced (71-100)"
description: Thirty advanced interview questions covering distributed consistency, resilience design, performance troubleshooting, zero-downtime change, security architecture, data scaling, technical leadership and trade-off reasoning, with structured model answers.
keywords: [senior java interview questions, senior backend engineer interview, microservices architecture interview, distributed transactions, performance troubleshooting, zero downtime deployment, technical leadership interview, system design senior, tech lead questions]
sidebar_position: 4
---

# Interview Questions: Advanced (71-100)

Senior interviews test **judgement, breadth under constraints and leadership**: can you reason about failure, scale, trade-offs and people? Strong answers are structured: **clarify context → options → recommendation with reasons → risks and how you would validate → what you would revisit**. Avoid listing tools; show how you decide.

## Architecture and consistency

**71. How do you keep data consistent across microservices without distributed transactions?**
Accept eventual consistency in places and design for it: sagas of local transactions with idempotent compensations, a transactional outbox for atomic state-plus-event, idempotent consumers, explicit intermediate states, reconciliation jobs. Reserve strong consistency for single-service invariants inside one database. ([Saga](../microservices/data-consistency/saga.md), [Outbox](../microservices/data-consistency/outbox-idempotency.md))

**72. Design an order or payment flow so that money is never charged twice and stock is never oversold.**
Idempotency key at the API and towards the provider, a validated order state machine, atomic conditional stock updates with expiring reservations, treat payment timeouts as unknown and confirm via query/webhook, reconcile daily. ([Order processing](../system-design/order-processing.md))

**73. When would you choose microservices, and when not?**
When team scaling, independent release cadence or divergent scaling/isolation create real friction and a platform exists (CI/CD, observability, discovery). Otherwise a modular monolith; beware the distributed monolith (shared DB, lock-step deploys, synchronous chains). ([Overview](../microservices/overview.md), [Trade-offs](../system-design/tradeoffs.md))

**74. How would you migrate a monolith to microservices?**
Strangler pattern: gateway in front, extract capabilities one at a time starting with a low-coupling high-change seam, own the data per service, use anti-corruption layers, measure after each step, and keep the monolith releasable. Avoid a big-bang rewrite.

**75. When do you use CQRS and event sourcing, and when do you avoid them?**
CQRS for divergent read/write shapes or scale and cross-service queries; event sourcing for audit-critical, state-transition-heavy domains. Avoid for plain CRUD: they add eventual consistency, schema-evolution and operational cost. ([CQRS/ES](../microservices/data-consistency/cqrs-event-sourcing.md))

**76. How do you evolve APIs and events without breaking consumers?**
Backward-compatible additive changes, tolerant readers, versioning only when needed, schema registry compatibility rules, consumer-driven contract tests, deprecation windows, and expand/contract for data. ([Kafka design](../messaging/kafka-ordering-design.md), [Migrations](../databases/schema-migrations.md))

## Resilience and operations

**77. A downstream service becomes slow. Walk through how your system should behave.**
Timeouts shorter than the caller's budget, bulkheads limiting concurrency, circuit breaker opening on slow calls, retries only for idempotent calls with jittered backoff and a retry budget, fallbacks where acceptable, load shedding, and alerts. Watch for retry storms and thread-pool exhaustion. ([Resilience4j](../microservices/resilience/resilience4j.md))

**78. How do you design for zero-downtime deployments including database changes?**
Rolling/canary with accurate readiness and graceful shutdown; backward-compatible schema via expand/contract across releases; feature flags to decouple release from deploy; automated rollback on SLO regression. ([Deployment strategies](../devops/deployment-strategies.md), [Migrations](../databases/schema-migrations.md))

**79. Your service has intermittent latency spikes in production. How do you investigate?**
Define the symptom with percentiles, correlate with GC pauses, thread dumps (blocked/pool saturation), downstream traces, connection-pool waits and deployments; use flame graphs/JFR; form hypotheses, test one change at a time. ([JVM diagnostics](../java/concurrency-jvm/jvm-tuning-diagnostics.md), [Observability](../microservices/observability/observability.md))

**80. CPU is at 100% / the pod keeps getting OOM-killed. What do you do?**
CPU: hot threads and flame graph; check GC CPU share. OOMKilled: compare heap vs off-heap (direct buffers, metaspace, thread stacks), `MaxRAMPercentage` headroom, NMT, heap dump if Java OOM. Fix the cause, not just the limit. ([Docker](../devops/docker-for-java.md))

**81. How do you choose and tune a garbage collector?**
Start with G1 defaults, define the latency/throughput target, enable GC logs, measure allocation/promotion rates, try ZGC for tight tails or Parallel for batch, tune one parameter at a time under realistic load. ([GC](../java/concurrency-jvm/garbage-collection.md))

**82. Virtual threads vs reactive vs thread pools?**
Virtual threads give scalable blocking-style code for I/O-bound services (watch pinning and limit concurrency explicitly); reactive suits streaming and built-in back-pressure; classic pools for CPU-bound work. ([Virtual threads](../java/concurrency-jvm/virtual-threads.md))

**83. How do you structure observability for a fleet of services?**
Standard metrics (RED/USE), structured logs with trace ids, OpenTelemetry tracing with sampling, SLOs with burn-rate alerts, dashboards per service and per user journey, runbooks. ([Observability](../microservices/observability/observability.md))

**84. How do you handle an incident and what makes a good post-mortem?**
Stabilise first (mitigate, roll back, communicate), then diagnose; blameless review with timeline, root and contributing causes, what detection/response gaps existed, and tracked action items with owners.

## Data, scaling and performance

**85. How would you scale a service from 100 to 10,000 requests per second?**
Measure first. Stateless horizontal scaling, caching, query/index fixes and N+1 removal, connection-pool sizing, async work via queues, read replicas, then partitioning/sharding; load test each step and watch downstream limits. ([Scaling](../databases/replication-sharding.md), [Caching](../spring/data/caching.md))

**86. Optimistic vs pessimistic locking, and isolation anomalies such as write skew?**
Optimistic for rare conflicts with retry; pessimistic (`FOR UPDATE`, `SKIP LOCKED`) for hot rows; snapshot isolation allows write skew, so protect cross-row invariants with serializable plus retry, locks or constraints. ([Locking](../spring/data/locking.md), [Isolation](../databases/acid-isolation-mvcc.md))

**87. How do you choose a shard key and handle hot keys?**
High cardinality, even load and alignment with the main access pattern so transactions stay within a shard; mitigate hot keys with salting, caching, splitting hot entities, and logical shards that can be moved. ([Sharding](../databases/replication-sharding.md))

**88. Cache problems you have seen: stampedes, stale data, dual writes?**
Single-flight and jittered TTLs for stampedes; TTL plus evict-after-commit for staleness; avoid dual writes by deriving caches from events or the outbox. ([Caching](../spring/data/caching.md))

**89. Design a rate limiter for an API gateway.**
Token bucket per key in Redis with an atomic Lua script and Redis time, 429 with `Retry-After`, layered edge and service limits, fail-open versus fail-closed decided per endpoint. ([Rate limiter](../system-design/rate-limiter.md))

**90. How do you guarantee ordering and exactly-once effects with Kafka?**
Key by aggregate id for per-partition order, idempotent producer, at-least-once consumption with idempotent handlers or transactional consume-process-produce within Kafka; external side effects need dedupe keys or outbox. ([Consumers](../messaging/kafka-consumers-offsets.md))

## Security

**91. How do you design authentication and authorisation across microservices?**
Central IdP with OIDC/OAuth2, Authorization Code + PKCE for users, client credentials or token exchange for services, JWT validation (issuer, audience, expiry) at every service, scopes for clients plus roles/permissions, object-level checks in services, mTLS or mesh for transport identity. ([OAuth2/OIDC](../spring/security/oauth2-oidc.md))

**92. How do you prevent IDOR/broken access control?**
Enforce ownership on every data access (scoped queries, `@PostAuthorize`), deny by default, test with another user's identifiers, and return 404 for foreign resources. ([Method security](../spring/security/method-security.md))

**93. How do you manage secrets and supply-chain risk?**
Secret manager with short-lived credentials and rotation, no secrets in images or repos, SBOMs, dependency and image scanning, pinned and signed artifacts, least-privilege pipelines. ([Vulnerabilities](../spring/security/common-vulnerabilities.md), [CI/CD](../devops/ci-cd.md))

**94. How would you design multi-tenancy?**
Choose isolation by compliance and scale: database per tenant, schema per tenant, or shared tables with `tenant_id` enforced centrally (and row-level security as a backstop); tenant-aware caching, rate limits and observability. ([Relational design](../databases/relational-design.md))

## Delivery, leadership and judgement

**95. How do you decide between build, buy and open source?**
Buy or adopt commodity capabilities, build differentiators; compare total cost of ownership including operations, security and hiring; check exit costs and lock-in. ([Trade-offs](../system-design/tradeoffs.md))

**96. How do you run technical design reviews and record decisions?**
Written design doc with context, options and trade-offs, early review with the affected teams, focused questions on risks (failure, scale, security, migration), and ADRs capturing the decision and revisit conditions.

**97. How do you set and enforce engineering standards (code review, testing, CI)?**
Automate what can be automated (linting, tests, scans, quality gates), keep reviews small and focused on design and risk, document a lightweight definition of done, measure with DORA metrics, and lead by example. ([CI/CD](../devops/ci-cd.md))

**98. How do you mentor engineers and grow a team's capability?**
Pair on hard problems, give specific timely feedback, delegate with context and safety nets, encourage design ownership, and create learning paths and blameless norms. (Prepare 2-3 stories using [STAR](behavioral-star.md).)

**99. How do you prioritise technical debt against feature work?**
Tie debt to business impact (incident rate, lead time, cost), make it visible and sized, allocate a steady capacity share, fix it opportunistically alongside features in the same area, and stop new debt at the boundary with guardrails.

**100. Tell me about a major trade-off or failure and what you learned.**
Pick a real example: context, options considered, what you chose and why, the outcome and measurable impact, what you would do differently, and what process change resulted. Own the mistakes; show learning and follow-through. ([Behavioural answers](behavioral-star.md))

## How to prepare for this level

1. Choose **5-6 projects/incidents** from your career and be able to tell each as a story with numbers (scale, latency, cost, team size).
2. Practise the [system design framework](../system-design/approach-and-estimation.md) on the four worked designs.
3. For each technology on your resume, prepare **internals, failure modes and trade-offs**, not definitions.
4. Rehearse trade-off sentences: "I chose X over Y because Z; I accept W; I'd revisit if V".
5. Prepare questions to ask: team topology, on-call, deployment frequency, architecture decision process.
6. Use the [cheat sheets](cheat-sheets.md) for last-minute revision.
