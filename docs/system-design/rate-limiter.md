---
title: Design a Distributed Rate Limiter
sidebar_label: "Design a rate limiter"
description: Rate limiting algorithms compared - fixed window, sliding window, token bucket, leaky bucket - with tested Java implementations, a Redis Lua script for distributed token buckets, placement, response headers, failure modes and Spring integration.
keywords: [rate limiter design, token bucket algorithm, sliding window rate limiting, distributed rate limiting redis lua, leaky bucket, 429 too many requests, api throttling, bucket4j, system design rate limiter]
sidebar_position: 3
---

# Design a Rate Limiter

<Outcomes items={[
  "Compare fixed window, sliding window and token bucket",
  "Implement a distributed limiter with atomic Redis operations",
  "Decide fail-open versus fail-closed"
]} />

## 1. Requirements

**Functional**

- Limit requests per **key**: user id, API key, IP address, tenant, or endpoint (`POST /payments` stricter than `GET /products`).
- Configurable rules (for example 100 requests/minute per user, burst of 20).
- Reject excess with **HTTP 429 Too Many Requests** and tell the client when to retry.

**Non-functional**

- **Low overhead**: adds under ~1-2 ms to each request (it is on every request's path).
- **Accurate enough** across many app instances (distributed).
- **Highly available**: the limiter must not become the outage (decide fail-open vs fail-closed).
- Dynamic configuration without redeploys.

## 2. Where to put it

| Placement | Pros | Cons |
| --- | --- | --- |
| **API gateway / edge** (Spring Cloud Gateway, NGINX, cloud WAF) | One place, protects everything behind, cheap rejection | Coarse (per route/key); limited business context |
| **Service middleware / filter** | Knows business context (plan tier, operation cost) | Each service implements it (use a shared library) |
| **Client-side** (SDK back-off) | Polite clients | Never trusted alone |
| **Service mesh / sidecar** | Language-agnostic | Operational complexity |

Typical: **edge limiting** for abuse/DDoS (per IP, per API key) plus **service-level limits** for expensive operations and per-tenant quotas. Layered defences: the CDN/WAF filters first, the gateway enforces per-client limits, services protect themselves with [bulkheads and circuit breakers](../microservices/resilience/resilience4j.md).

## 3. Algorithms

### Fixed window counter

Count requests in each fixed interval (for example per calendar minute); reject above the limit.

- **Pros**: trivial, tiny memory (one counter per key per window).
- **Cons**: **boundary burst**: a client can send the full limit at the end of one window and the full limit at the start of the next: **2× the limit in a short span**.

### Sliding window log

Store the **timestamp of each request**; count entries within the last N seconds.

- **Pros**: exact.
- **Cons**: memory `O(limit)` per key; expensive at high limits.

### Sliding window counter (approximation)

Keep counts for the **current and previous** window and weight the previous one by how much of it still overlaps the sliding window:

`estimated = previousCount × (1 − elapsedInCurrentWindow / windowSize) + currentCount`

- **Pros**: small memory (two counters), smooths the boundary burst; accurate within a few percent in practice.
- **Cons**: approximate (assumes even distribution in the previous window).

```java
public final class SlidingWindowCounter {
    private final int limit;
    private final long windowMillis;
    private final LongSupplier clockMillis;
    private long currentWindowStart;
    private int currentCount;
    private int previousCount;

    public SlidingWindowCounter(int limit, long windowMillis, LongSupplier clockMillis) {
        this.limit = limit;
        this.windowMillis = windowMillis;
        this.clockMillis = clockMillis;
        this.currentWindowStart = clockMillis.getAsLong() / windowMillis * windowMillis;
    }

    public synchronized boolean tryAcquire() {
        long now = clockMillis.getAsLong();
        long windowStart = now / windowMillis * windowMillis;
        if (windowStart != currentWindowStart) {
            previousCount = (windowStart - currentWindowStart == windowMillis) ? currentCount : 0;
            currentCount = 0;
            currentWindowStart = windowStart;
        }
        double overlap = 1.0 - (double) (now - windowStart) / windowMillis;     // share of the previous window still inside
        double estimated = previousCount * overlap + currentCount;
        if (estimated >= limit) return false;
        currentCount++;
        return true;
    }
}
```

Tested with a fake clock and a limit of 10 per second: 10 of 15 immediate requests pass; halfway into the next window the previous window still counts 50%, so only **5 more** are allowed (a fixed window would have allowed 10 more, 20 within a short span).

### Token bucket (most popular)

A bucket holds up to **capacity** tokens and is refilled at a steady **rate**; each request consumes a token; no token means reject. Capacity allows **bursts**; the refill rate sets the long-run average.

- **Pros**: allows controlled bursts, tiny state (tokens + last refill time), simple to reason about; used by AWS, Stripe, Bucket4j, Guava `RateLimiter`.
- **Cons**: two parameters to tune.

```java
public final class TokenBucket {
    private final long capacity;
    private final double refillPerNano;
    private final LongSupplier nanoClock;
    private double tokens;
    private long lastRefill;

    public TokenBucket(long capacity, double refillPerSecond, LongSupplier nanoClock) {
        this.capacity = capacity;
        this.refillPerNano = refillPerSecond / 1_000_000_000.0;
        this.nanoClock = nanoClock;
        this.tokens = capacity;
        this.lastRefill = nanoClock.getAsLong();
    }

    public synchronized boolean tryAcquire() {
        long now = nanoClock.getAsLong();
        tokens = Math.min(capacity, tokens + (now - lastRefill) * refillPerNano);   // lazy refill, no timer thread
        lastRefill = now;
        if (tokens >= 1) {
            tokens -= 1;
            return true;
        }
        return false;
    }
}
```

Tested (capacity 5, refill 2/s, fake clock): 10 immediate requests → 5 allowed (the burst); after 1 s → exactly 2 allowed; after a long idle period the bucket caps at 5 again. The **lazy refill** (compute tokens from elapsed time on each call) avoids a background thread per bucket.

### Leaky bucket

Requests enter a queue that drains at a constant rate; overflow is dropped. It **smooths** output to a fixed rate (good for protecting a downstream with a hard rate), with no bursts passed through. Think "queue + constant-rate consumer", similar to a metered queue.

### Comparison

| Algorithm | Memory per key | Bursts | Accuracy | Notes |
| --- | --- | --- | --- | --- |
| Fixed window | O(1) | 2× at boundaries | Low | Simplest |
| Sliding log | O(limit) | None | Exact | Memory heavy |
| Sliding window counter | O(1) | Small error | Good | Great default for quotas |
| **Token bucket** | O(1) | Allowed up to capacity | Good | Best for APIs with bursts |
| Leaky bucket | O(queue) | Smoothed | Good | Shaping rather than limiting |

## Try it: a token bucket

Fire a burst, then move the clock. The bucket logic is the same lazy-refill formula as the Java class above.

<TokenBucketLab />

## 4. Making it distributed

An in-process limiter only limits one instance. With N instances behind a load balancer, the effective limit is N× unless state is shared.

Options:

1. **Central store (Redis)**: all instances atomically update the same counters. Most common.
2. **Sticky routing** by key to the same instance (consistent hashing at the gateway): local state, but uneven and fragile on failover.
3. **Local + periodic sync** (each node takes a share of the quota and reconciles): fast but approximate; fine for coarse limits.
4. **Rate-limit service** (sidecar/gRPC like Envoy's ratelimit service) shared by many apps.

### Atomic token bucket in Redis

A read-modify-write from several app instances races unless it is **atomic**. A **Lua script** executes atomically inside Redis. Using Redis' own clock (`TIME`) avoids clock skew between app servers:

```lua
-- KEYS[1] = bucket key
-- ARGV[1] = capacity, ARGV[2] = refill tokens per second, ARGV[3] = tokens requested
local capacity  = tonumber(ARGV[1])
local rate      = tonumber(ARGV[2])
local requested = tonumber(ARGV[3])

local t   = redis.call('TIME')                              -- one clock for all app instances
local now = t[1] * 1000 + math.floor(t[2] / 1000)           -- milliseconds

local state  = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(state[1])
local ts     = tonumber(state[2])
if tokens == nil then
  tokens = capacity
  ts = now
end

tokens = math.min(capacity, tokens + (math.max(0, now - ts) / 1000.0) * rate)

local allowed = 0
if tokens >= requested then
  tokens = tokens - requested
  allowed = 1
end

redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(capacity / rate * 1000) * 2)   -- idle buckets disappear
return { allowed, math.floor(tokens) }
```

I ran this script on a real Redis 7 instance (capacity 5, refill 1 token/s): of 7 immediate requests, **5 were allowed and 2 rejected**; after 2.2 seconds **2 more were allowed**, then rejected; a different key was unaffected; the key's TTL was set (~10 s) so idle buckets clean themselves up.

Calling it from Spring:

```java
@Component
class RedisRateLimiter {
    private final StringRedisTemplate redis;
    private final RedisScript<List> script = RedisScript.of(new ClassPathResource("token_bucket.lua"), List.class);

    RedisRateLimiter(StringRedisTemplate redis) { this.redis = redis; }

    @SuppressWarnings("unchecked")
    Decision check(String key, int capacity, double refillPerSecond) {
        List<Long> r = (List<Long>) redis.execute(script, List.of("rl:" + key),
                String.valueOf(capacity), String.valueOf(refillPerSecond), "1");
        return new Decision(r.get(0) == 1L, r.get(1));
    }
    record Decision(boolean allowed, long remaining) { }
}
```

Spring Cloud Gateway ships `RequestRateLimiter` backed by Redis (token bucket, `replenishRate` and `burstCapacity`), and **Bucket4j** offers a JVM and Redis/Hazelcast/JCache-backed token bucket library: reuse them before writing your own.

### Race conditions and clocks

- Use atomic operations (`INCR`, Lua, or Bucket4j's CAS); never `GET` then `SET` from the app.
- Fixed-window counters with Redis: `INCR key` then `EXPIRE` on the first increment (atomically via script or `SET NX EX` pattern) to avoid keys that never expire.
- Rely on **one authoritative clock** (Redis `TIME`) rather than app-server clocks.
- Redis single-threaded execution makes scripts atomic, but a single Redis can become the hot spot: **shard keys** across a Redis Cluster (hash by limiter key); keep scripts cheap.

## 5. API behaviour

Return **HTTP 429** with helpful headers:

```text
HTTP/1.1 429 Too Many Requests
Retry-After: 12
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 12
Content-Type: application/problem+json

{"title":"Rate limit exceeded","status":429,"detail":"Limit of 100 requests per minute exceeded"}
```

(`X-RateLimit-*` headers are the older de facto names; the IETF draft standardises `RateLimit-*`.) Return the headers on **successful** responses too, so well-behaved clients can pace themselves. Clients should implement **exponential backoff with jitter**, honouring `Retry-After`.

### Choosing the limiting key

| Key | Notes |
| --- | --- |
| **API key / user id** | Fairest, authenticated; use for authenticated APIs |
| **IP address** | For anonymous traffic; shared NATs and carrier-grade NAT punish many users; attackers rotate IPs |
| **Tenant** | Enforce plan quotas in B2B |
| **Endpoint + key** | Different limits for expensive operations (login attempts, password reset, search) |
| **Cost-based** | Charge more tokens for heavy requests (`requested = cost`) |

Combine: a generous per-IP limit as a safety net plus per-user limits. For login brute force, limit by **account and IP**, with growing delays.

## 6. Failure handling

| Failure | Decision |
| --- | --- |
| Redis unreachable | **Fail open** (allow, maybe with a local fallback limiter) for general APIs so the limiter is not an availability risk; **fail closed** for security-critical limits (login brute force) |
| Redis slow | Tight timeout (a few ms) and a [circuit breaker](../microservices/resilience/resilience4j.md) around the limiter |
| Config store down | Use cached rules |
| Hot key (one abusive client) | The limiter itself must be cheap per rejected request; reject at the edge before reaching app logic |

Always **monitor**: allowed vs rejected per rule, limiter latency, Redis health, and top limited keys; alert on spikes (attack or misconfiguration).

## 7. Related concepts

- **Quotas** (monthly caps) vs **rate limits** (per second): quotas need durable counters and billing integration; rate limits can be ephemeral.
- **Load shedding**: when the service is overloaded, reject lowest-priority work regardless of client (adaptive concurrency limits).
- **Bulkheads and concurrency limits**: cap *in-flight* requests (semaphore) rather than rate; complements rate limits ([virtual threads](../java/concurrency-jvm/virtual-threads.md)).
- **Client-side throttling** and retry budgets to avoid retry storms.

## Check yourself

<Checkpoint questions={[
  {
    "q": "Which algorithm allows controlled bursts?",
    "options": [
      "Token bucket",
      "Fixed window with no buffer",
      "Leaky bucket only",
      "Random sampling"
    ],
    "answer": 0,
    "why": "Bucket capacity is the burst size; the refill rate is the long-run average."
  },
  {
    "q": "Why must the Redis check-and-decrement be atomic?",
    "options": [
      "Redis is slow",
      "Concurrent requests could otherwise both read the same count and exceed the limit",
      "Lua is faster than Java",
      "It saves memory"
    ],
    "answer": 1,
    "why": "Use a Lua script or an atomic command so the read and write cannot interleave."
  },
  {
    "q": "Which status code does a throttled request normally get?",
    "options": [
      "500",
      "404",
      "429 Too Many Requests, ideally with Retry-After",
      "200"
    ],
    "answer": 2,
    "why": "It tells clients to back off and when to retry."
  }
]} />

## Common interview questions

**1. Compare token bucket and fixed window.**
Fixed window is simplest but lets 2× the limit through at window boundaries; token bucket permits controlled bursts up to capacity and enforces the long-run refill rate with small state.

**2. How do you implement a distributed rate limiter?**
Keep state in a shared store (Redis) and update it atomically with a Lua script (token bucket) or `INCR` with expiry; use Redis time, shard keys, and handle store failure with a fail-open/closed decision.

**3. Where would you place the limiter?**
At the gateway for coarse per-client limits, plus in services for expensive operations or business-specific quotas, layered with a WAF/CDN.

**4. How do you avoid race conditions?**
Atomic server-side operations (Lua, Redis `INCR`, CAS), never read-modify-write in the app.

**5. What do you return when limited?**
HTTP 429 with `Retry-After` and rate-limit headers; encourage exponential backoff with jitter.

**6. What if Redis goes down?**
Typically fail open (with an optional local in-memory fallback) to preserve availability; fail closed for security-sensitive endpoints; protect with timeouts and circuit breakers.

**7. How do you rate-limit by IP when users share NATs?**
Prefer authenticated identity; use IP limits only as generous safety nets; combine signals (device id, token) and avoid blocking shared addresses aggressively.

**8. How do you handle bursts versus sustained load?**
Token bucket capacity controls burst size, refill rate controls sustained throughput; tune per endpoint.

## Pitfalls

- In-memory limiters behind multiple instances (limits multiply).
- Non-atomic check-then-update in Redis.
- App-server clocks used for distributed windows.
- No `Retry-After`, causing client retry storms.
- Limiting by IP alone.
- Fail-closed limiter that takes the whole API down with Redis.
- Counters without TTLs growing forever.

## Key takeaways

- Token bucket for bursty APIs, sliding window counter for quotas; know fixed-window's boundary flaw.
- Distributed correctness = shared store + atomic scripts + a single clock.
- Return 429 with guidance; decide fail-open vs fail-closed per use case.
- Layer edge limits, service limits and concurrency limits.
