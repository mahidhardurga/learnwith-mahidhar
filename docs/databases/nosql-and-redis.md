---
title: NoSQL Databases and Redis - Choosing, Modelling and Using Them
sidebar_label: "NoSQL and Redis"
description: Document, key-value, wide-column and graph stores compared, query-driven data modelling for MongoDB and DynamoDB, Redis data structures and use cases, eviction and persistence, and distributed locking caveats.
keywords: [nosql vs sql, mongodb data modeling, dynamodb, cassandra, redis data structures, redis eviction, redis persistence, distributed lock redlock, polyglot persistence, spring data redis]
sidebar_position: 5
---

# NoSQL and Redis

"NoSQL" means "not only relational": several different families of stores that trade some relational features (joins, ACID across rows, ad-hoc queries) for **scale, flexible schema, or specialised access patterns**. The senior skill is knowing **when relational is still the right answer**, which is most of the time for core transactional data.

<Outcomes items={[
  "Match NoSQL families to access patterns",
  "Model data query-first",
  "Use Redis safely as cache, counter and lock-free helper"
]} />

## The families

| Family | Examples | Model | Strengths | Weaknesses |
| --- | --- | --- | --- | --- |
| **Key-value** | Redis, DynamoDB, Memcached | key → value | Extreme speed/scale, simple | Lookups by key only (unless secondary indexes) |
| **Document** | MongoDB, Couchbase | JSON-like documents | Flexible schema, aggregate-oriented, rich queries on a document | Joins/relations are manual; consistency choices |
| **Wide-column** | Cassandra, ScyllaDB, HBase | Partition key + clustering columns | Massive write throughput, linear scale, multi-region | Query-first modelling, limited ad-hoc queries, eventual consistency |
| **Graph** | Neo4j | Nodes and edges | Relationship traversals | Not for bulk scans/aggregations |
| **Search** | Elasticsearch/OpenSearch | Inverted index | Full-text, faceting, log analytics | Not a system of record |
| **Time-series** | InfluxDB, TimescaleDB | Time-indexed points | Ingestion and rollups | Specialised |

### Choosing

| Choose relational (PostgreSQL/MySQL) when... | Consider NoSQL when... |
| --- | --- |
| Data is relational with integrity constraints; multi-row transactions; ad-hoc queries and reporting | Access patterns are known and simple at huge scale (sessions, carts, user profiles by id) |
| Moderate scale (most systems) | Write volume or dataset exceeds what one relational node plus replicas can handle |
| Schema is reasonably stable | Highly variable document shapes, or global multi-region writes with tunable consistency |

PostgreSQL with `jsonb`, full-text search and partitioning covers many "I need a document store" cases. **Polyglot persistence** (right store per job) is powerful but multiplies operations; add a store only for a clear need, and treat derived stores (search, cache, analytics) as **rebuildable** from the system of record.

## Modelling: query first, not entity first

Relational design starts from entities and normalises; NoSQL design starts from **queries** and **access patterns**, then shapes data to serve them, accepting duplication.

### Document stores (MongoDB)

Embed what you read together; reference what grows unboundedly or is shared.

```json
{
  "_id": "order-1001",
  "customerId": "c-42",
  "status": "PAID",
  "items": [ {"sku": "A1", "qty": 2, "price": 9.99}, {"sku": "B2", "qty": 1, "price": 19.5} ],
  "shipTo": { "city": "Pune", "zip": "411001" },
  "placedAt": "2025-01-05T10:15:00Z"
}
```

- Embed items inside the order (always read together, bounded size). Reference products by SKU rather than embedding the whole catalogue entry (shared, changes independently), snapshotting price as above.
- Documents have a **16 MB limit**; unbounded arrays (comments on a viral post) must be split into their own collection.
- Index fields you query and sort on; compound index order follows the same leftmost rules as SQL (see [SQL tuning](../spring/data/sql-tuning-indexing.md)).
- Single-document operations are atomic; multi-document transactions exist but cost performance, so model aggregates so most writes touch one document.
- Choose **write concern** (`majority` for durability) and **read concern/preference** deliberately: reading from secondaries is eventually consistent.

### DynamoDB / Cassandra style

Design tables **per query**. Choose a **partition key** that spreads load evenly and a **sort/clustering key** for range queries within the partition; avoid hot partitions (a single key receiving most traffic). "Single-table design" in DynamoDB overloads one table with several entity types distinguished by key patterns (`PK=CUSTOMER#42, SK=ORDER#2025-01-05#1001`) to fetch related data in one request.

```text
PK = CUSTOMER#42   SK = PROFILE
PK = CUSTOMER#42   SK = ORDER#2025-01-05#1001
PK = CUSTOMER#42   SK = ORDER#2025-02-01#1002
Query: PK = CUSTOMER#42 AND begins_with(SK, 'ORDER#')   → all orders of the customer, sorted by date
```

Trade-offs: no joins, aggregates computed in the application or via streams, secondary indexes are eventually consistent, and access pattern changes can require data migration. Cassandra offers **tunable consistency** (`ONE`, `QUORUM`, `ALL`): with replication factor `RF`, reads of `R` and writes of `W` replicas are strongly consistent when `R + W > RF` (for example `QUORUM` + `QUORUM`).

## Redis

An **in-memory data structure server**, single-threaded for command execution (I/O threads help in newer versions), with sub-millisecond latency. It is far more than a cache.

| Structure | Typical uses |
| --- | --- |
| **String** | Cache values, counters (`INCR`), flags, distributed lock token |
| **Hash** | Objects/sessions with fields |
| **List** | Simple queues, recent-items lists |
| **Set** | Unique tags, membership, set algebra |
| **Sorted set (ZSET)** | Leaderboards, rate limiting windows, delayed queues by timestamp |
| **Stream** | Durable log with consumer groups (lightweight Kafka-like) |
| **HyperLogLog / Bitmap / Geo** | Approximate counts, flags per user id, geo queries |
| **Pub/Sub** | Fire-and-forget fan-out (no persistence: missed if offline) |

### Common patterns

**Cache-aside** (see [Caching](../spring/data/caching.md)): read the cache, on miss read the database and populate with a **TTL**.

**Rate limiting** (fixed window):

```java
Long count = redis.opsForValue().increment("rate:" + userId + ":" + (System.currentTimeMillis() / 60_000));
if (count == 1) redis.expire("rate:" + userId + ":" + minute, Duration.ofSeconds(70));
if (count > 100) throw new TooManyRequestsException();
```

For accuracy under concurrency use a Lua script or a sliding window with a sorted set so increment-and-expire is atomic. Token-bucket libraries (Bucket4j with Redis) handle this.

**Sessions**: Spring Session stores HTTP sessions in Redis so any instance can serve any user.

**Idempotency keys / deduplication**: `SET key value NX EX 3600` succeeds only for the first caller.

### Persistence, durability and eviction

- **RDB** snapshots (periodic, compact, may lose the last minutes) and **AOF** append-only log (`appendfsync everysec` loses ≤ ~1 s; `always` is durable but slower). Many cache-only uses disable persistence entirely.
- **Replication** is asynchronous; **Redis Sentinel** handles failover for a primary/replicas set; **Redis Cluster** shards the keyspace across 16,384 hash slots with automatic failover. After a failover, recently acknowledged writes can be lost.
- **Memory limits and eviction**: set `maxmemory` and a policy (`allkeys-lru`/`allkeys-lfu` for caches, `volatile-*` to evict only keys with TTL, `noeviction` returns errors when full). Without `maxmemory`, Redis grows until the OS kills it.
- **Big keys and hot keys** hurt a single-threaded server: avoid giant collections, avoid `KEYS *` (use `SCAN`), avoid long Lua scripts.

### Distributed locks: be careful

`SET lock:order:42 <random-token> NX PX 30000` then release **only if the value matches** (check-and-delete in a Lua script) gives a simple mutual exclusion, but:

- If the holder pauses (GC, network) longer than the TTL, **two clients can hold the lock**; use **fencing tokens** (a monotonically increasing number the protected resource checks) for correctness-critical work.
- Redis failover may lose the lock (async replication). The Redlock algorithm (multiple independent nodes) is controversial; for correctness rely on **database constraints, optimistic locking or a consensus system** (ZooKeeper, etcd), and use Redis locks only as an efficiency optimisation (avoiding duplicate work), not as the sole safety mechanism.

## Spring integration

```java
@Service
class ProfileCache {
    private final StringRedisTemplate redis;
    private final ObjectMapper mapper;
    ProfileCache(StringRedisTemplate redis, ObjectMapper mapper) { this.redis = redis; this.mapper = mapper; }

    Optional<Profile> get(String id) throws JsonProcessingException {
        String json = redis.opsForValue().get("profile:" + id);
        return json == null ? Optional.empty() : Optional.of(mapper.readValue(json, Profile.class));
    }

    void put(String id, Profile p) throws JsonProcessingException {
        redis.opsForValue().set("profile:" + id, mapper.writeValueAsString(p), Duration.ofMinutes(10));   // always a TTL
    }
}
```

Use `spring-boot-starter-data-redis` (Lettuce client, non-blocking, shared connection) and `spring-boot-starter-data-mongodb` for repositories. Serialise values as JSON (not JDK serialization) and namespace keys.

## Check yourself

<Checkpoint questions={[
  {
    "q": "Which NoSQL family fits caching and sessions best?",
    "options": [
      "Key-value (Redis)",
      "Graph",
      "Document with joins",
      "Wide-column for ad hoc analytics"
    ],
    "answer": 0,
    "why": "Redis is an in-memory key-value store with TTL support."
  },
  {
    "q": "How do you model data in a document or wide-column store?",
    "options": [
      "Normalise to third normal form first",
      "Start from the queries you need and shape the data for them",
      "Copy the relational schema",
      "Avoid any duplication"
    ],
    "answer": 1,
    "why": "Query-first modelling denormalises to serve reads efficiently."
  },
  {
    "q": "Why set a TTL on cache entries?",
    "options": [
      "To speed up the network",
      "To encrypt keys",
      "To bound staleness and memory use",
      "To avoid serialisation"
    ],
    "answer": 2,
    "why": "Without expiry, caches grow and serve stale data indefinitely."
  }
]} />

## Common interview questions

**1. SQL vs NoSQL: how do you choose?**
Relational for integrity, transactions and ad-hoc queries at moderate scale; NoSQL for known access patterns at very high scale, flexible schemas or specialised models (graph, time-series). Many systems use both.

**2. How do you model data in a document or wide-column store?**
From access patterns: embed data read together, reference unbounded or shared data, accept duplication, pick partition keys to avoid hot spots.

**3. What is eventual consistency and how does Cassandra tune it?**
Replicas converge over time. Per-operation consistency levels let you choose; `R + W > RF` yields strong consistency for reads after writes.

**4. What data structures does Redis offer and where would you use sorted sets?**
Strings, hashes, lists, sets, sorted sets, streams and probabilistic types. Sorted sets power leaderboards, sliding-window rate limits and delayed jobs.

**5. How does Redis persist data and what can you lose?**
RDB snapshots (lose since the last snapshot) and AOF (lose about a second with `everysec`); replicas are asynchronous, so failover can lose acknowledged writes.

**6. How would you implement a distributed lock with Redis and what are the risks?**
`SET key token NX PX ttl` plus a Lua check-and-delete release; risks: TTL expiry while the client is paused and failover losing the lock, so use fencing tokens or database-level guarantees for correctness.

**7. Why is Redis fast and what are its limits?**
In-memory, simple data structures, efficient event loop; limits are dataset size (RAM), single-threaded command execution (slow commands block everyone) and weaker durability.

**8. When is MongoDB a poor choice?**
Heavily relational data with many joins and multi-document transactional invariants; reporting across entities.

## Pitfalls

- Choosing NoSQL for fashion, then re-implementing joins and transactions in code.
- Unbounded document growth and hot partitions.
- Redis without TTLs or `maxmemory` (memory leaks by design).
- Treating Redis as the system of record without understanding durability.
- Using `KEYS` in production; huge values and hot keys.
- Locks without fencing for correctness-critical operations.

## Key takeaways

- Model NoSQL from queries, not entities; duplication is normal.
- Relational stays the default for core transactional data.
- Redis is a versatile data structure server: set TTLs, memory limits and know its durability limits.
- Redis locks are efficiency tools; correctness belongs in the database or a consensus system.
