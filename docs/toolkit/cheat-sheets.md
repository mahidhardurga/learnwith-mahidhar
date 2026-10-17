---
title: Java, Spring Boot and Microservices Cheat Sheets for Interview Revision
sidebar_label: "Cheat sheets"
description: One-page quick-reference tables for last-minute revision - collections complexity, concurrency tools, JVM flags, Spring annotations, transactions, HTTP status codes, SQL, Kafka settings, resilience patterns, Docker and kubectl commands.
keywords: [java cheat sheet, spring boot cheat sheet, collections time complexity, http status codes, jvm flags, kafka configuration, kubectl commands, interview revision, quick reference]
sidebar_position: 7
---

# Cheat Sheets

Dense reference tables for the day before an interview. Each section links to the full explanation; if a line surprises you, read that page.

## Collections: complexity at a glance

| Structure | get / contains | add | remove | Order | Null | Thread-safe |
| --- | --- | --- | --- | --- | --- | --- |
| `ArrayList` | O(1) idx / O(n) | O(1) amortised end | O(n) | Insertion | Yes | No |
| `LinkedList` | O(n) | O(1) ends | O(1) at node | Insertion | Yes | No |
| `ArrayDeque` | O(1) ends | O(1) | O(1) ends | Insertion | No | No |
| `HashMap` / `HashSet` | O(1) avg | O(1) avg | O(1) avg | None | 1 null key | No |
| `LinkedHashMap` | O(1) | O(1) | O(1) | Insertion / access | Yes | No |
| `TreeMap` / `TreeSet` | O(log n) | O(log n) | O(log n) | Sorted | No null key | No |
| `PriorityQueue` | peek O(1) | O(log n) | O(log n) | Heap (poll sorted) | No | No |
| `ConcurrentHashMap` | O(1) avg | O(1) | O(1) | None | No | Yes |
| `CopyOnWriteArrayList` | O(1) idx | O(n) | O(n) | Insertion | Yes | Yes |

`HashMap`: capacity power of two, load 0.75, treeify at 8 (table ≥ 64), untreeify at 6 ([internals](../java/core-java/hashmap-internals.md)). `ArrayList` grows ×1.5. Immutable factories: `List.of`, `Set.of`, `Map.of` (no nulls, random iteration order for sets/maps).

## Java language quick facts

| Topic | Fact |
| --- | --- |
| `String` | Immutable; literals pooled; `intern()`; use `StringBuilder` in loops |
| `==` vs `equals` | Identity vs logical equality; override `equals` and `hashCode` together |
| Integer cache | `Integer` values -128..127 cached; use `equals` on boxed types |
| Pass by | Always by value (references copied) |
| `final` | Variable not reassigned / method not overridden / class not extended |
| Checked exceptions | Must be handled/declared; default Spring rollback ignores them |
| try-with-resources | Closes in reverse order; close exceptions become suppressed |
| Generics | Erased at runtime; PECS (`? extends` to read, `? super` to write) |
| Records (16) | Shallowly immutable data carriers; compact constructor for validation |
| Sealed (17) | Closed hierarchies enabling exhaustive `switch` |
| LTS releases | 8, 11, 17, 21, 25 |
| Virtual threads | Java 21; one per task, never pooled; avoid long `synchronized` I/O before JDK 24 |

## Streams quick reference

| Task | Code |
| --- | --- |
| Filter + map + collect | `list.stream().filter(p).map(f).toList()` |
| Group | `Collectors.groupingBy(f, Collectors.counting())` |
| Partition | `Collectors.partitioningBy(pred)` |
| To map (merge fn!) | `Collectors.toMap(k, v, (a, b) -> a)` |
| Join | `Collectors.joining(", ")` |
| Sum/avg | `mapToInt(..).sum()` / `Collectors.averagingDouble` |
| Flatten | `flatMap(x -> x.items().stream())` |
| Distinct sorted desc | `distinct().sorted(Comparator.reverseOrder())` |
| Short-circuit | `anyMatch`, `allMatch`, `findFirst`, `limit` |

Streams are lazy and single-use; parallel streams share the common pool: avoid with blocking I/O ([details](../java/core-java/streams-and-lambdas.md)).

## Concurrency tools

| Need | Use |
| --- | --- |
| Visibility of a flag | `volatile` |
| Atomic counter | `AtomicInteger`; hot counter: `LongAdder` |
| Mutual exclusion | `synchronized` or `ReentrantLock` (tryLock, conditions) |
| Many readers, rare writers | `ReentrantReadWriteLock` / `StampedLock` (optimistic read) |
| Thread-safe map | `ConcurrentHashMap` + `merge`/`compute` |
| Producer-consumer | Bounded `BlockingQueue` |
| Wait for N tasks | `CountDownLatch` (one-shot), `CyclicBarrier` (reusable) |
| Limit concurrency | `Semaphore` |
| Async composition | `CompletableFuture` (`thenCompose`, `allOf`, `orTimeout`) with your own executor |
| I/O-bound scale | Virtual threads (`newVirtualThreadPerTaskExecutor`) |

`ThreadPoolExecutor` order: core threads → queue → extra threads up to max → reject; unbounded queue ignores max ([Executors](../java/concurrency-jvm/executors.md)). Deadlock = mutual exclusion + hold-and-wait + no preemption + circular wait; fix with lock ordering or `tryLock`.

## JVM flags and diagnostics

| Goal | Flag / tool |
| --- | --- |
| Heap in containers | `-XX:MaxRAMPercentage=75` (leave off-heap headroom) |
| Collector | `-XX:+UseG1GC` (default) / `-XX:+UseZGC` / `-XX:+UseParallelGC` |
| GC logs | `-Xlog:gc*:file=gc.log:time,uptime,level,tags` |
| Heap dump on OOM | `-XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=...` |
| Exit on OOM | `-XX:+ExitOnOutOfMemoryError` |
| Thread dump | `jcmd <pid> Thread.print` |
| Heap dump | `jcmd <pid> GC.heap_dump file.hprof` |
| Profile in prod | JFR: `jcmd <pid> JFR.start duration=60s filename=rec.jfr`; async-profiler flame graph |
| Flags in effect | `jcmd <pid> VM.flags` |

Memory areas: heap, metaspace, thread stacks, code cache, direct buffers ([JVM](../java/concurrency-jvm/jvm-tuning-diagnostics.md)). Exit 137 = SIGKILL/OOM-killed; 143 = SIGTERM.

## Spring annotations

| Area | Annotations |
| --- | --- |
| Beans | `@Component`, `@Service`, `@Repository`, `@Controller`, `@Configuration`, `@Bean`, `@Primary`, `@Qualifier`, `@Scope`, `@Lazy`, `@Profile`, `@Conditional...` |
| Lifecycle | `@PostConstruct`, `@PreDestroy`, `ApplicationRunner`, `@EventListener`, `@TransactionalEventListener` |
| Web | `@RestController`, `@RequestMapping`, `@GetMapping`..., `@PathVariable`, `@RequestParam`, `@RequestBody`, `@Valid`, `@ControllerAdvice`, `@ExceptionHandler`, `@ResponseStatus` |
| Config | `@Value`, `@ConfigurationProperties`, `@PropertySource` |
| Data | `@Entity`, `@Id`, `@GeneratedValue`, `@OneToMany(mappedBy=)`, `@ManyToOne(fetch=LAZY)`, `@Version`, `@Query`, `@EntityGraph`, `@Transactional` |
| Cross-cutting | `@Aspect`, `@Around`, `@Cacheable`, `@CacheEvict`, `@Async`, `@Scheduled`, `@Retryable` |
| Security | `@EnableMethodSecurity`, `@PreAuthorize`, `@PostAuthorize` |
| Test | `@SpringBootTest`, `@WebMvcTest`, `@DataJpaTest`, `@MockitoBean`, `@ServiceConnection`, `@WithMockUser` |

Proxy-based features (`@Transactional`, `@Cacheable`, `@Async`, `@PreAuthorize`) skip **self-invocation**, **private** and **final** methods ([AOP](../spring/core/aop-and-proxies.md)).

## Bean lifecycle in one line

Instantiate → inject → Aware → BPP before → `@PostConstruct` → `afterPropertiesSet` → init-method → BPP after (proxy) → use → `@PreDestroy` → `destroy` ([lifecycle](../spring/core/bean-lifecycle-and-scopes.md)).

## Spring Boot essentials

| Topic | Key facts |
| --- | --- |
| Auto-configuration | `AutoConfiguration.imports` + conditions; `--debug` shows the report |
| Property precedence | CLI args > system props > env vars > profile files > `application` files > defaults |
| Actuator probes | `/actuator/health/liveness`, `/actuator/health/readiness`; keep dependencies out of liveness |
| Graceful shutdown | `server.shutdown=graceful`, `spring.lifecycle.timeout-per-shutdown-phase` |
| Virtual threads | `spring.threads.virtual.enabled=true` (Boot 3.2+) |
| Circular references | Prohibited by default (Boot 2.6+) |
| Bean overriding | Disabled by default (Boot 2.1+) |
| Open-in-view | `spring.jpa.open-in-view` defaults to true; often set false |

## Transactions

| Propagation | Behaviour |
| --- | --- |
| `REQUIRED` | Join or create (default) |
| `REQUIRES_NEW` | Suspend, run independent transaction |
| `NESTED` | Savepoint |
| `SUPPORTS` / `NOT_SUPPORTED` | Join if exists / suspend and run without |
| `MANDATORY` / `NEVER` | Must have / must not have a transaction |

Rollback: runtime exceptions and errors by default; checked need `rollbackFor`. Isolation: read committed (PostgreSQL default), repeatable read (MySQL default), serializable (retry on failure). Anomalies: dirty read, non-repeatable read, phantom, lost update, write skew ([Transactions](../spring/data/transactions.md), [ACID/MVCC](../databases/acid-isolation-mvcc.md)).

## JPA / Hibernate

| Problem | Fix |
| --- | --- |
| N+1 | `join fetch`, `@EntityGraph`, `default_batch_fetch_size`, projections |
| `LazyInitializationException` | Fetch within the transaction; use DTOs; not EAGER |
| `join fetch` + `Pageable` | Page ids first, then fetch children |
| Lost update | `@Version` (optimistic), `FOR UPDATE` (pessimistic), atomic update |
| Slow bulk insert | `SEQUENCE` ids, `jdbc.batch_size`, flush/clear in batches |
| Enums | `EnumType.STRING` |
| Entity `equals` | Business key, or id-based with proxy handling; avoid Lombok `@Data` |

## HTTP status codes

| Code | Meaning | Use |
| --- | --- | --- |
| 200 / 201 / 202 / 204 | OK / Created / Accepted (async) / No content | Success variants |
| 301 / 302 / 304 | Permanent / temporary redirect / not modified | Redirects, caching |
| 400 | Bad request | Malformed or invalid input |
| 401 | Unauthenticated | Missing/invalid credentials |
| 403 | Forbidden | Authenticated but not allowed |
| 404 / 405 / 409 | Not found / method not allowed / conflict | Resource state |
| 412 / 422 / 429 | Precondition failed / unprocessable / too many requests | Concurrency control, validation, rate limits |
| 500 / 502 / 503 / 504 | Server error / bad gateway / unavailable / gateway timeout | Failures |

Idempotent methods: GET, PUT, DELETE, HEAD, OPTIONS; POST and PATCH are not (use idempotency keys).

## SQL quick reference

| Task | Pattern |
| --- | --- |
| Left join keep all left rows | Put right-side filters in `ON`, not `WHERE` |
| No matching rows | `NOT EXISTS` (not `NOT IN` with NULLs) |
| Top-1 per group | `ROW_NUMBER() OVER (PARTITION BY g ORDER BY x DESC)` |
| Ranking | `RANK` (gaps) vs `DENSE_RANK` (no gaps) |
| Upsert | `INSERT ... ON CONFLICT DO UPDATE` / `ON DUPLICATE KEY UPDATE` / `MERGE` |
| Deep paging | Keyset: `WHERE id > :last ORDER BY id LIMIT n` |
| Slow query | `EXPLAIN (ANALYZE, BUFFERS)`; composite index equality → range → sort |
| Row locking | `FOR UPDATE`, `NOWAIT`, `SKIP LOCKED` |

Normal forms: 1NF atomic values, 2NF no partial dependency, 3NF no transitive dependency ([design](../databases/relational-design.md), [patterns](../databases/sql-patterns.md)).

## Microservice patterns

| Problem | Pattern |
| --- | --- |
| Single entry, auth, limits | API gateway |
| Find instances | Service discovery (or Kubernetes Service) |
| Cascading failure | Timeout + circuit breaker + bulkhead + bounded retry with jitter |
| Cross-service consistency | Saga (orchestrated or choreographed) |
| Atomic DB change + event | Transactional outbox |
| Duplicate delivery | Idempotency keys / idempotent consumers |
| Read scaling / cross-service queries | CQRS read models |
| Tracing | Trace id propagation (W3C `traceparent`), OpenTelemetry |
| Config | Env vars / ConfigMap / Config Server |
| Strangling a monolith | Strangler fig behind a gateway |

Resilience4j order of aspects (outermost first): Retry → CircuitBreaker → RateLimiter → TimeLimiter → Bulkhead ([Resilience4j](../microservices/resilience/resilience4j.md)).

## Kafka settings

| Goal | Settings |
| --- | --- |
| Durable writes | `acks=all`, RF=3, `min.insync.replicas=2`, `enable.idempotence=true`, `unclean.leader.election.enable=false` |
| Throughput | `linger.ms`, `batch.size`, `compression.type=lz4`, more partitions |
| At-least-once consumer | `enable.auto.commit=false`, commit after processing, idempotent handler |
| Avoid rebalance storms | Cooperative sticky assignor, static membership, `max.poll.interval.ms` > processing time, smaller `max.poll.records` |
| Ordering | Key by aggregate id (per-partition order only) |
| Poison messages | Bounded retries, `ErrorHandlingDeserializer`, DLT (`<topic>-dlt` default in Spring Kafka 3) |
| Exactly-once | Idempotent producer + transactions + `read_committed`; Kafka-scoped only |

Parallelism of a group ≤ partition count; lag = log end − committed offset ([Kafka](../messaging/kafka-fundamentals.md)).

## Security

| Topic | Remember |
| --- | --- |
| 401 vs 403 | Unauthenticated vs unauthorised |
| `hasRole('ADMIN')` | Checks `ROLE_ADMIN` |
| JWT | Signed not encrypted; validate signature, `exp`, `iss`, `aud`; short TTL + refresh rotation |
| Flows | Auth Code + PKCE (users), client credentials (services); avoid implicit/ROPC |
| CSRF | Keep for cookie sessions; not needed for header-bearer APIs |
| Passwords | bcrypt/argon2 via `DelegatingPasswordEncoder` |
| Top flaws | IDOR/broken access control, injection (use bind parameters), XSS, SSRF, mass assignment (use DTOs), vulnerable dependencies, leaked secrets |

## Docker and Kubernetes commands

```bash
docker build -t app:1.0 .                          # build image
docker run -d --name app -p 8080:8080 -m 512m app:1.0
docker logs -f app ; docker exec -it app sh
docker stop app                                    # SIGTERM then SIGKILL after 10 s
docker image history app:1.0                       # inspect layers

kubectl get pods -n shop -o wide
kubectl describe pod <pod>                         # events, probe failures, OOMKilled
kubectl logs <pod> --previous                      # crashed container's logs
kubectl rollout status deployment/orders
kubectl rollout undo deployment/orders
kubectl top pod -n shop
kubectl debug -it <pod> --image=busybox --target=<container>
kubectl apply -f k8s/ --dry-run=server             # validate against the cluster
```

Pod states: `CrashLoopBackOff` (app exits), `ImagePullBackOff` (registry/tag/auth), `Pending` (scheduling/resources), `OOMKilled` (memory limit).

## System design numbers and checklist

- 1 day ≈ 86,400 s ≈ 10^5 s; average QPS = daily requests ÷ 10^5; peak 2-5×.
- Memory ~100 ns, SSD ~100 µs, same-datacenter RTT ~0.5 ms, cross-continent ~150 ms.
- Availability: 99.9% ≈ 8.8 h/yr downtime; 99.99% ≈ 53 min/yr.
- Checklist: **requirements → numbers → API/data → architecture → deep dives (partitioning, consistency, caching, failures) → trade-offs and evolution** ([framework](../system-design/approach-and-estimation.md)).
- Token bucket for bursty rate limits; consistent hashing for resharding; Base62 + id ranges for short codes; idempotency + outbox for reliable events.

## Behavioural quick card

STAR: **S**ituation (10%), **T**ask (10%), **A**ction (60%, "I" + reasoning + trade-offs), **R**esult (20%, numbers + learning). Keep 6-8 stories ([details](behavioral-star.md)).
