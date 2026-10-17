---
title: Caching in Spring Boot - Spring Cache, Redis and Hibernate
sidebar_label: "Caching"
description: How Spring's cache abstraction works with @Cacheable, @CachePut and @CacheEvict, using Caffeine and Redis, Hibernate first and second level caches, and cache invalidation pitfalls.
keywords: [spring cache, "@Cacheable", "@CacheEvict", caffeine, redis cache, hibernate second level cache, cache invalidation, cache stampede, TTL]
sidebar_position: 6
---

# Caching

A cache stores the result of expensive work so repeat requests are fast. It is also a source of stale data and subtle bugs; "there are only two hard things: cache invalidation and naming things" is a joke for a reason.

<Outcomes items={[
  "Use @Cacheable, @CachePut and @CacheEvict",
  "Compare Caffeine and Redis",
  "Handle invalidation and cache stampedes"
]} />

## Layers of caching in a Spring application

| Layer | Example | Scope |
| --- | --- | --- |
| Browser / CDN / HTTP | `Cache-Control`, ETag | Per client / edge |
| Application (Spring Cache) | `@Cacheable` with Caffeine or Redis | Per JVM or shared across instances |
| Hibernate first-level cache | Persistence context | One transaction (always on) |
| Hibernate second-level cache | Ehcache/Infinispan/Redis via JCache | Whole `SessionFactory` |
| Database | Buffer pool, query cache | Database server |

## Spring Cache abstraction

Enable it once and annotate methods; the implementation (Caffeine, Redis, Ehcache...) is pluggable. It uses the same **proxy** mechanism as `@Transactional`, so self-invocation and private methods are not intercepted.

```java
@Configuration
@EnableCaching
class CacheConfig { }

@Service
class PriceService {

    @Cacheable(cacheNames = "prices", key = "#sku")
    public BigDecimal price(String sku) {
        return expensiveLookup(sku);                 // runs only on a cache miss
    }

    @CachePut(cacheNames = "prices", key = "#sku")
    public BigDecimal updatePrice(String sku, BigDecimal value) {
        save(sku, value);
        return value;                                // always runs; result replaces the cached value
    }

    @CacheEvict(cacheNames = "prices", key = "#sku")
    public void evict(String sku) { }                // remove one entry (allEntries = true removes all)
}
```

A test shows the behaviour: two calls to `price("A")` run the method once; after `evict("A")` the next call runs it again.

| Annotation | Behaviour |
| --- | --- |
| `@Cacheable` | Return cached value if present; otherwise call and store |
| `@CachePut` | Always call and store the result |
| `@CacheEvict` | Remove entries |
| `@Caching` | Combine several operations |
| `condition` / `unless` | Decide whether to cache (`unless = "#result == null"`) |

Cache keys default to the method arguments; define keys explicitly when arguments are complex objects, and make sure they implement `equals`/`hashCode` properly.

## Caffeine (local) vs Redis (distributed)

**Caffeine**: in-process, extremely fast, no network, configurable size and expiry.

```yaml
spring:
  cache:
    type: caffeine
    caffeine:
      spec: maximumSize=10000,expireAfterWrite=10m
    cache-names: prices
```

Downside: each instance has its own copy, so after an update one instance may serve stale data until expiry or an eviction event.

**Redis**: shared by all instances, survives restarts, supports TTL per cache, but adds network latency and a dependency, and requires serialisable values.

```yaml
spring:
  cache:
    type: redis
    redis:
      time-to-live: 10m
      cache-null-values: false
```

A common pattern is a **two-level cache**: Caffeine in front of Redis for hot keys, with Redis pub/sub to invalidate local copies.

## Hibernate caching

- **First-level cache** is the persistence context: automatic, per transaction, not shared. It is why a second `findById` in the same transaction runs no SQL.
- **Second-level cache** is shared across sessions and stores entity state (and optionally collections and query results) in a region cache. It suits read-mostly reference data (countries, product categories). Enable per entity:

```java
@Entity
@Cacheable
@org.hibernate.annotations.Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
class Country { ... }
```

Rules of thumb: do not cache frequently changing entities; remember that bulk updates and writes from other applications bypass the cache; query cache is rarely worth it. In a cluster, use a provider that supports distributed invalidation or accept staleness bounded by TTL.

## Invalidation strategies

| Strategy | How | Trade-off |
| --- | --- | --- |
| **TTL (expiry)** | Entry expires after N minutes | Simple; bounded staleness |
| **Write-through / evict on write** | Update or evict when data changes | Fresher; must cover every write path |
| **Event-based** | Publish an event on change, consumers evict | Works across services, adds infrastructure |
| **Versioned keys** | Include a version/etag in the key | Old entries just age out |

Always set a **TTL** as a safety net even when you also evict explicitly.

## Common problems

- **Cache stampede (thundering herd)**: a popular key expires and hundreds of requests recompute it at once. Mitigate with `@Cacheable(sync = true)` (one caller computes, others wait), jittered TTLs, or refresh-ahead (Caffeine `refreshAfterWrite`).
- **Cache penetration**: repeated requests for non-existent keys always miss. Cache a "not found" marker briefly or use a Bloom filter.
- **Stale data**: updated in the database but not evicted; leads to confusing bugs. Prefer short TTLs for important data.
- **Caching inside transactions**: an eviction may run before the transaction commits, and another request refills the cache with old data. Evict **after commit** when it matters (`@TransactionalEventListener(phase = AFTER_COMMIT)`).
- **Mutable cached objects**: returning the same cached instance lets callers mutate shared state. Cache immutable objects (records).
- **Serialisation changes** with Redis: a deployment that changes a class can break reading old entries. Version the cache names or use JSON with tolerant readers.

## What to cache, and what not to

Good candidates: expensive reads that are read far more often than written, reference data, results of slow remote calls (with a [circuit breaker](../../microservices/resilience/resilience4j.md) fallback to stale data). Poor candidates: highly dynamic data, per-user sensitive data without careful keys, anything where staleness is unacceptable (account balances at the moment of payment).

## Check yourself

<Checkpoint questions={[
  {
    "q": "Which annotation stores a method result and skips the method on later calls with the same key?",
    "options": [
      "@Cacheable",
      "@CacheEvict",
      "@Scheduled",
      "@Async"
    ],
    "answer": 0,
    "why": "@Cacheable checks the cache first and only runs the method on a miss."
  },
  {
    "q": "When is Redis a better cache than Caffeine?",
    "options": [
      "When you want the fastest in-process lookup",
      "When several instances must share one cache",
      "When data never changes",
      "When memory is unlimited"
    ],
    "answer": 1,
    "why": "Caffeine is local to each JVM. Redis is shared but adds network latency."
  },
  {
    "q": "What is a cache stampede?",
    "options": [
      "A cache that never expires",
      "A cache backup",
      "Many requests recompute the same expired entry at once",
      "A deadlock"
    ],
    "answer": 2,
    "why": "Mitigate with locking per key, request coalescing or jittered TTLs."
  }
]} />

## Common interview questions

**1. How does `@Cacheable` work?**
A proxy intercepts the call, builds a key from the arguments, checks the cache and returns the hit; on a miss it invokes the method and stores the result. Like `@Transactional`, it does not apply to self-invocation.

**2. `@Cacheable` vs `@CachePut`?**
`@Cacheable` skips the method on a hit. `@CachePut` always runs the method and refreshes the cache entry.

**3. Local vs distributed cache?**
Local (Caffeine) is fastest but per instance and can be inconsistent across instances; distributed (Redis) is consistent for all instances but slower and a dependency.

**4. What are the first-level and second-level caches in Hibernate?**
First-level: per-session persistence context, always on. Second-level: optional, shared across sessions, for read-mostly entities, needs a provider.

**5. How do you keep a cache consistent with the database?**
Evict or update on every write path, set TTLs as a safety net, evict after commit, and for multi-instance setups publish invalidation events or use a shared cache.

**6. What is a cache stampede and how do you prevent it?**
Many concurrent recomputations of an expired hot key. Use `sync = true`, request coalescing, jittered expiry or background refresh.

**7. How do you decide the TTL?**
From how stale the business can tolerate, and how expensive recomputation is. Start short, measure the hit ratio and adjust.

**8. What metrics do you watch?**
Hit ratio, miss rate, eviction count, load time, and cache size. Spring Boot exposes cache metrics through Micrometer (`cache.gets`, `cache.puts`, `cache.evictions`).

## Pitfalls

- Caching with no expiry and no eviction.
- Self-invocation, so annotations silently do nothing.
- Mutable cached objects.
- Unbounded cache size causing OutOfMemoryError.
- Caching null or error results unintentionally.
- Treating the cache as a source of truth.
- Reading a field on a proxied bean in tests (use a getter; the CGLIB proxy's own fields are not initialised).

## Key takeaways

- Spring Cache is a proxy-based abstraction; pick Caffeine for local, Redis for shared.
- Always define TTL and a size limit, and plan invalidation for every write path.
- Beware stampedes, stale data and mutable cached values.
- Use Hibernate's second-level cache only for read-mostly reference data.
