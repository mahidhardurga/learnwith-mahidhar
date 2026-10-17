---
title: System Design Trade-offs - How to Reason About and Defend Decisions
sidebar_label: "Trade-off discussions"
description: A framework for discussing architectural trade-offs plus decision guides for consistency vs availability, sync vs async, SQL vs NoSQL, monolith vs microservices, caching strategies, push vs pull, REST vs gRPC vs GraphQL, and build vs buy.
keywords: [system design trade-offs, architecture decision, consistency vs availability, monolith vs microservices, caching strategies write-through, sync vs async, sql vs nosql, architecture decision record, REST vs gRPC, cost vs complexity]
sidebar_position: 6
---

# Trade-off Discussions

<Outcomes items={[
  "Frame any decision as options, criteria and consequences",
  "Argue consistency versus availability and sync versus async",
  "Say when you would revisit a decision"
]} />

## A framework for any trade-off

1. **State the decision** and the **driving requirement** ("p99 under 100 ms at 10k RPS", "never lose a payment", "team of five").
2. List **realistic options** (2-3, not 8).
3. Compare on the **dimensions that matter** here (latency, consistency, cost, operability, team skills, time to market, failure behaviour).
4. **Decide** and say why, including what you are knowingly giving up.
5. State the **conditions under which you would revisit** (10× traffic, new compliance rule, team growth).
6. Name the **risk and mitigation** (monitoring, feature flag, load test) and how you would **measure** the choice.

Document significant decisions in an **Architecture Decision Record (ADR)**: context, decision, alternatives considered, consequences. It prevents re-litigating and helps newcomers.

Say "it depends" only when followed by *on what*.

## Consistency vs availability (and latency)

| Choice | Behaviour | Fits |
| --- | --- | --- |
| **Strong consistency** (single leader, synchronous replication, consensus) | Reads see the latest write; some requests fail or slow during partitions/failures | Money, inventory counts, uniqueness, leader election |
| **Eventual consistency** (async replication, caches, events) | Fast, available, tolerates partitions; temporary staleness and conflicts | Feeds, counters, search indexes, recommendations, notifications |

During a partition you pick C or A (CAP); in normal operation you trade **latency vs consistency** (PACELC) ([details](../databases/replication-sharding.md)). In practice choose **per operation**, not per system: strong for the payment ledger, eventual for the activity feed. Techniques to soften eventual consistency: read-your-writes routing, version checks, idempotent compensating actions ([Saga](../microservices/data-consistency/saga.md)).

## Synchronous vs asynchronous communication

| | Synchronous (REST/gRPC) | Asynchronous (queues/events) |
| --- | --- | --- |
| Pros | Simple, immediate result, easy to debug | Decoupled in time, absorbs spikes, resilient to downstream outages, fan-out |
| Cons | Temporal coupling, cascading failures, latency adds up | Eventual consistency, harder to trace/debug, duplicate/ordering concerns |
| Choose when | The caller needs the answer now (price lookup, auth check) | Work can complete later (emails, fulfilment), several consumers react, load is spiky |

Rule: keep **user-facing request paths short and synchronous** and push everything else behind a queue; never chain more than a few synchronous hops ([communication](../microservices/communication/service-communication.md)).

## Monolith vs modular monolith vs microservices

| | Monolith | Modular monolith | Microservices |
| --- | --- | --- | --- |
| Deploy | One unit | One unit, enforced module boundaries | Independent units |
| Complexity | Low (until it grows) | Low-medium | High (distributed systems) |
| Team scaling | Poor beyond ~10-20 engineers | Good | Best (autonomous teams) |
| Data consistency | ACID transactions | ACID within one DB | Eventual, sagas |
| Operational cost | Minimal | Minimal | High: discovery, tracing, CI/CD per service |
| When | Prototype, small team, domain unclear | **Default starting point**: clear modules, can split later | Many teams, independent scaling and release cadence, mature platform |

A strong answer: start with a **modular monolith**, extract services along proven seams when a concrete pressure appears (team contention, divergent scaling, fault isolation). Microservices trade code complexity for **organisational scalability**, and you pay with distributed-systems problems ([overview](../microservices/overview.md)).

## SQL vs NoSQL

Default to **relational** for core transactional data (integrity, joins, ad-hoc queries). Choose **NoSQL** for a specific need: massive write throughput/scale-out, flexible documents, key-value access at huge scale, graph or time-series workloads ([NoSQL](../databases/nosql-and-redis.md)). The question is rarely "which is better" but "which access patterns and consistency do we need?". Polyglot persistence is powerful and expensive; derived stores must be rebuildable.

## Caching strategies

| Strategy | How | Pros | Cons |
| --- | --- | --- | --- |
| **Cache-aside** | App reads cache, on miss loads DB and fills cache | Simple, resilient to cache loss | Stale data until TTL/evict; stampedes |
| **Read-through** | Cache loads from the DB itself | Simpler app code | Cache layer must know the DB |
| **Write-through** | Write to cache and DB together | Cache fresh | Slower writes; cache pollution by unread data |
| **Write-behind (write-back)** | Write to cache, flush to DB asynchronously | Very fast writes | Risk of data loss; complexity |
| **Refresh-ahead** | Reload before expiry | Avoids misses for hot keys | Wasted refreshes |

Cross-cutting: **TTL as a safety net**, invalidate on write, protect against stampedes (single-flight), avoid caching what must be strongly consistent ([Caching](../spring/data/caching.md)). Layers: client/CDN → app cache → DB.

## Push vs pull (fan-out on write vs on read)

A feed or timeline can be assembled **at write time** (push: when a user posts, copy to followers' feeds) or **at read time** (pull: when a user opens their feed, query who they follow).

- **Push (fan-out on write)**: fast reads, expensive writes; terrible for celebrities with millions of followers.
- **Pull (fan-out on read)**: cheap writes, slow reads, heavy per-read work.
- **Hybrid**: push for normal users, pull for celebrities merged at read time. The standard answer, and a good example of choosing by **data distribution**, not dogma.

## REST vs gRPC vs GraphQL

| | REST/JSON | gRPC | GraphQL |
| --- | --- | --- | --- |
| Strengths | Ubiquitous, cacheable, simple tooling | Fast binary, strong contracts, streaming | Client-driven queries, one round trip, avoids over/under-fetching |
| Weaknesses | Over/under-fetching, chatty | Browser support, human readability | Caching and rate limiting are harder, N+1 on the server, complexity |
| Best for | Public APIs, CRUD | Internal service-to-service | Aggregation for varied UIs (a BFF) |

## Orchestration vs choreography; optimistic vs pessimistic

- **Orchestration**: central coordinator, explicit flow, easier to see and test, risk of a smart-coordinator bottleneck. **Choreography**: services react to events, loose coupling, flow is implicit and harder to debug.
- **Optimistic locking**: assumes conflicts are rare; fail and retry; scales reads/writes well. **Pessimistic locking**: blocks to prevent conflicts; correct under heavy contention; deadlock and throughput risk ([locking](../spring/data/locking.md)).

## Scaling: vertical vs horizontal; stateless vs stateful

- **Vertical** (bigger machine): simplest, has a ceiling and a single point of failure. **Horizontal** (more machines): needs stateless services, partitioned data and load balancing.
- Make the service tier **stateless** first; scaling the data tier is the hard part ([replication and sharding](../databases/replication-sharding.md)).

## Batch vs stream processing

Batch (nightly jobs): simple, efficient, high latency. Stream (Kafka + consumers/Flink): low latency, continuous, more operational complexity. Choose by the **freshness the business needs**, not by fashion.

## Delivery guarantees

At-most-once (may lose), at-least-once (may duplicate), exactly-once (effectively, via idempotency/transactions within one system). Default: **at-least-once + idempotent consumers** ([Kafka semantics](../messaging/kafka-consumers-offsets.md)).

## Build vs buy vs adopt open source

| Build | Buy/SaaS | Open source (self-hosted) |
| --- | --- | --- |
| Core differentiator, unique requirements | Commodity capability (email delivery, identity, payments, search) | Control and no per-use fee, but you operate it |

Buy what is not your competitive advantage; build where your domain knowledge creates value. Count **total cost of ownership**: on-call, upgrades, security, hiring.

## Cost, complexity and team

Architecture lives inside constraints: **headcount** (a 4-person team cannot run 40 microservices well), **skills**, **time to market**, **budget** and **risk tolerance**. "Boring technology" you already operate beats a better tool nobody understands. Cloud costs (cross-AZ traffic, egress, managed service premiums) can dominate: include them in comparisons.

## Evolving a design: what changes at 10× / 100×

| Scale | Typical moves |
| --- | --- |
| Start | Modular monolith, one PostgreSQL, managed services |
| 10× | Caching, read replicas, async work via queues, CDN, autoscaling |
| 100× | Partition/shard data, event streaming, service extraction along bottlenecks, multi-region, dedicated platform/SRE capability |
| Always | Observability, load testing, capacity planning, failure drills |

Premature scaling wastes effort; **measure first, scale the bottleneck**.

## Example: arguing one decision

> *Decision*: use Kafka or RabbitMQ for order events?
> *Drivers*: several downstream consumers (billing, analytics, notifications), need replay after bugs, ordering per order, 10k events/s peak, team knows Spring.
> *Options*: Kafka (log, replay, many groups, per-key ordering), RabbitMQ (routing, simpler ops, per-message TTL), SQS/SNS (managed, less control).
> *Decision*: Kafka, keyed by `orderId`, because replay and multiple independent consumers are explicit requirements and volume is high; accept higher operational complexity (use a managed service) and the need for idempotent consumers.
> *Revisit if*: volume stays under 100 msg/s and we only need task queues; operations burden outweighs benefits.
> *Mitigation/measure*: consumer lag alerts, load test at 3× peak, schema registry for compatibility.

Compare with how the trade-offs appear in specific designs: [URL shortener](url-shortener.md), [rate limiter](rate-limiter.md), [order processing](order-processing.md), [notification service](notification-service.md).

## Check yourself

<Checkpoint questions={[
  {
    "q": "A good trade-off answer includes...",
    "options": [
      "The options considered, the choice, what you give up and when you would revisit",
      "Only the winning option",
      "A list of buzzwords",
      "A refusal to choose"
    ],
    "answer": 0,
    "why": "It shows judgement under constraints."
  },
  {
    "q": "When is eventual consistency acceptable?",
    "options": [
      "For account balances shown after a transfer",
      "When brief staleness does not harm the user or business",
      "For seat booking without conflict checks",
      "Never"
    ],
    "answer": 1,
    "why": "Likes counts and feeds tolerate staleness; money movements usually do not."
  },
  {
    "q": "Why start as a modular monolith?",
    "options": [
      "Monoliths are always faster",
      "Microservices cannot be tested",
      "You get clear boundaries without the operational cost of distribution",
      "It avoids databases"
    ],
    "answer": 2,
    "why": "You can split later along the boundaries you proved."
  }
]} />

## Common interview questions

**1. How do you decide between consistency and availability?**
Per operation: require strong consistency where incorrectness is costly (money, inventory), choose availability and eventual consistency where staleness is tolerable; mitigate with idempotency, compensation and read-your-writes techniques.

**2. When would you introduce microservices?**
When team scaling, independent release cadence or divergent scaling/isolation needs create real pain in a modular monolith and a platform to run them exists.

**3. Cache-aside vs write-through?**
Cache-aside is simple and resilient to cache failure but can be stale; write-through keeps the cache fresh at the cost of write latency; write-behind speeds writes but risks loss.

**4. Fan-out on write or on read for a feed?**
Hybrid: precompute (push) for normal users for fast reads, and merge celebrity content at read time (pull) to avoid write amplification.

**5. How do you justify a technology choice?**
Tie it to explicit requirements and constraints, compare alternatives on relevant dimensions, state what you give up and when you would revisit, and note operational cost.

**6. Sync or async between services?**
Sync when the answer is needed immediately and failure can be handled; async for decoupling, spikes and multiple consumers; keep user-facing paths short.

**7. Build or buy?**
Buy commodity capabilities, build differentiating ones, and evaluate total cost of ownership including operations and security.

**8. How do you know a decision was wrong?**
Predefined metrics and SLOs, load tests, error budgets and review points; keep ADRs and revisit when assumptions change.

## Key takeaways

- Trade-offs are about requirements, constraints and what you knowingly give up.
- Decide per operation (consistency), per access pattern (data stores), per team (architecture style).
- Start simple, measure, scale the bottleneck.
- Record decisions and the conditions that would change them.
